/**
 * Apuração das métricas do Quadro 4 a partir das leituras persistidas.
 *
 * Roda contra o banco do protótipo e exporta um CSV por condição experimental,
 * que é a entrada da análise quantitativa da seção de resultados. Mantido no
 * repositório para que o cálculo seja reprodutível e auditável, e não refeito
 * à mão em planilha.
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'

const prisma = new PrismaClient()

type Linha = {
  condicao: string
  tentativas: number
  sucessos: number
  taxaSucesso: number
  leiturasIncorretas: number
  taxaIncorreta: number
  latenciaMediaMs: number
  latenciaDesvioMs: number
  tempoPorAtivoMs: number
  dispositivos: number
}

function desvio(valores: number[], media: number): number {
  if (valores.length < 2) return 0
  const soma = valores.reduce((a, v) => a + (v - media) ** 2, 0)
  return Math.sqrt(soma / (valores.length - 1))
}

async function apurar(inventarioId: string): Promise<Linha[]> {
  const leituras = await prisma.leitura.findMany({
    where: { inventarioId },
    include: { etiqueta: true },
    orderBy: { carimboCliente: 'asc' },
  })

  const porCondicao = new Map<string, typeof leituras>()
  for (const l of leituras) {
    const chave = l.condicaoEnsaio ?? 'nao-informada'
    porCondicao.set(chave, [...(porCondicao.get(chave) ?? []), l])
  }

  return [...porCondicao].map(([condicao, grupo]) => {
    const sucessos = grupo.filter((l) => l.desfecho === 'SUCESSO')

    // leitura incorreta: leu, mas o UID nao corresponde a nenhuma etiqueta vinculada
    const incorretas = sucessos.filter((l) => l.etiquetaId === null)

    const latencias = sucessos.map((l) => l.carimboServidor.getTime() - l.carimboCliente.getTime())
    const latenciaMedia = latencias.length ? latencias.reduce((a, b) => a + b, 0) / latencias.length : 0

    // tempo por ativo: intervalo entre leituras consecutivas bem-sucedidas
    const intervalos: number[] = []
    for (let i = 1; i < sucessos.length; i++) {
      intervalos.push(sucessos[i].carimboCliente.getTime() - sucessos[i - 1].carimboCliente.getTime())
    }
    const tempoPorAtivo = intervalos.length ? intervalos.reduce((a, b) => a + b, 0) / intervalos.length : 0

    return {
      condicao,
      tentativas: grupo.length,
      sucessos: sucessos.length,
      taxaSucesso: grupo.length ? sucessos.length / grupo.length : 0,
      leiturasIncorretas: incorretas.length,
      taxaIncorreta: sucessos.length ? incorretas.length / sucessos.length : 0,
      latenciaMediaMs: Math.round(latenciaMedia),
      latenciaDesvioMs: Math.round(desvio(latencias, latenciaMedia)),
      tempoPorAtivoMs: Math.round(tempoPorAtivo),
      dispositivos: new Set(grupo.map((l) => l.dispositivo)).size,
    }
  })
}

const inventarioId = process.argv[2]
if (!inventarioId) {
  console.error('uso: tsx ensaios/metricas.ts <inventarioId>')
  process.exit(1)
}

const linhas = await apurar(inventarioId)
const cabecalho = Object.keys(linhas[0] ?? {}).join(',')
const corpo = linhas.map((l) => Object.values(l).join(',')).join('\n')
const destino = `ensaios/dados/metricas-${inventarioId}.csv`
writeFileSync(destino, `${cabecalho}\n${corpo}\n`)
console.table(linhas)
console.log(`\nexportado para ${destino}`)
await prisma.$disconnect()
