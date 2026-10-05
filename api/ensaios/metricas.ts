/**
 * Apuração das métricas do Quadro 4 a partir das leituras persistidas.
 *
 * Roda contra o banco do protótipo e exporta um CSV por condição experimental,
 * que é a entrada da análise quantitativa da seção de resultados. Mantido no
 * repositório para que o cálculo seja reprodutível e auditável, e não refeito
 * à mão em planilha.
 *
 * Uso:
 *   npm run metricas                 — usa o inventário aberto mais recente
 *   npm run metricas -- <inventarioId>
 */
import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

let cliente: PrismaClient | null = null

/** Cria o cliente sob demanda, para que a falha vire mensagem e nao stack. */
function prismaClient(): PrismaClient {
  cliente ??= new PrismaClient()
  return cliente
}

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
  const leituras = await prismaClient().leitura.findMany({
    where: { inventarioId },
    include: { etiqueta: true },
    orderBy: { carimboCliente: 'asc' },
  })

  if (leituras.length === 0) return []

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
      taxaSucesso: Number((grupo.length ? sucessos.length / grupo.length : 0).toFixed(4)),
      leiturasIncorretas: incorretas.length,
      taxaIncorreta: Number((sucessos.length ? incorretas.length / sucessos.length : 0).toFixed(4)),
      latenciaMediaMs: Math.round(latenciaMedia),
      latenciaDesvioMs: Math.round(desvio(latencias, latenciaMedia)),
      tempoPorAtivoMs: Math.round(tempoPorAtivo),
      dispositivos: new Set(grupo.map((l) => l.dispositivo)).size,
    }
  })
}

async function resolverInventario(informado?: string): Promise<string | null> {
  if (informado) {
    const existe = await prismaClient().inventario.findUnique({ where: { id: informado } })
    if (!existe) {
      console.error(`Nenhum inventário com o id ${informado}.`)
      return null
    }
    return informado
  }
  const recente = await prismaClient().inventario.findFirst({ orderBy: { abertoEm: 'desc' } })
  if (!recente) {
    console.error('Nenhum inventário no banco. Abra um ciclo antes de apurar as métricas.')
    return null
  }
  console.log(`Nenhum id informado; usando o inventário mais recente (${recente.id}).\n`)
  return recente.id
}

async function principal(): Promise<number> {
  const inventarioId = await resolverInventario(process.argv[2])
  if (!inventarioId) return 1

  const linhas = await apurar(inventarioId)
  if (linhas.length === 0) {
    console.error('Este inventário ainda não tem leituras registradas.')
    return 1
  }

  console.table(linhas)

  const destino = `ensaios/dados/metricas-${inventarioId}.csv`
  mkdirSync(dirname(destino), { recursive: true })
  const cabecalho = Object.keys(linhas[0]).join(',')
  const corpo = linhas.map((l) => Object.values(l).join(',')).join('\n')
  writeFileSync(destino, `${cabecalho}\n${corpo}\n`)
  console.log(`\nExportado para ${destino}`)
  return 0
}

principal()
  .then(async (codigo) => {
    await cliente?.$disconnect()
    process.exitCode = codigo
  })
  .catch(async (erro) => {
    await cliente?.$disconnect()
    if (erro?.code === 'P1001' || /Can't reach database/i.test(String(erro?.message))) {
      console.error('Não foi possível conectar ao banco em ' + (process.env.DATABASE_URL ?? '?').replace(/:\/\/[^@]*@/, '://***@') + '\n' +
        'Suba o PostgreSQL antes: docker compose up -d banco\n' +
        'Sem Docker, aponte DATABASE_URL para um Postgres hospedado (neon.com, supabase.com).')
    } else if (/did not initialize yet|@prisma\/client/i.test(String(erro?.message))) {
      console.error('O cliente do Prisma não foi gerado. Rode: npx prisma generate')
    } else {
      console.error(erro)
    }
    process.exitCode = 1
  })
