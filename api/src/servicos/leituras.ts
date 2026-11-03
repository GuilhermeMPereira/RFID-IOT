import { prisma } from '../prisma.js'
import { ErroDeRegra } from '../erros.js'

type LeituraEntrada = {
  uidLido: string
  ambienteId: string
  desfecho: 'SUCESSO' | 'TEMPO_ESGOTADO' | 'ERRO_INTERFACE'
  mensagemErro?: string
  carimboCliente: Date
  dispositivo: string
  condicaoEnsaio?: string
  chaveIdempotencia: string
}

/**
 * Persiste leituras de forma idempotente.
 *
 * A chave de idempotência é gerada no cliente no instante da leitura e
 * acompanha o registro até o banco. Reenvios da mesma fila offline — por
 * reconexão instável, por exemplo — não duplicam registros, porque a
 * restrição de unicidade da coluna rejeita a segunda inserção.
 *
 * Ciclo encerrado não aceita leitura. Sem essa recusa, o encerramento
 * registraria um resumo que poderia ser contrariado depois por uma leitura
 * tardia, e o resultado deixaria de ser imutável (RF09).
 */
export async function registrarLeituras(
  inventarioId: string,
  auditorId: string,
  entradas: LeituraEntrada[],
) {
  const inventario = await prisma.inventario.findUnique({
    where: { id: inventarioId },
    select: { encerradoEm: true },
  })
  if (!inventario) throw new ErroDeRegra(404, 'inventário não encontrado')
  if (inventario.encerradoEm) {
    throw new ErroDeRegra(409, 'este ciclo já foi encerrado e não aceita novas leituras')
  }

  const chaves = entradas.map((e) => e.chaveIdempotencia)
  const existentes = await prisma.leitura.findMany({
    where: { chaveIdempotencia: { in: chaves } },
    select: { chaveIdempotencia: true },
  })
  const jaGravadas = new Set(existentes.map((e) => e.chaveIdempotencia))
  const novas = entradas.filter((e) => !jaGravadas.has(e.chaveIdempotencia))

  const uids = [...new Set(novas.map((e) => e.uidLido))]
  const etiquetas = await prisma.etiqueta.findMany({
    where: { uid: { in: uids }, revogadaEm: null },
  })
  const porUid = new Map(etiquetas.map((e) => [e.uid, e.id]))

  const persistidas = await prisma.$transaction(
    novas.map((e) =>
      prisma.leitura.create({
        data: {
          inventarioId,
          auditorId,
          uidLido: e.uidLido,
          etiquetaId: porUid.get(e.uidLido) ?? null,
          ambienteId: e.ambienteId,
          desfecho: e.desfecho,
          mensagemErro: e.mensagemErro,
          carimboCliente: e.carimboCliente,
          dispositivo: e.dispositivo,
          condicaoEnsaio: e.condicaoEnsaio,
          chaveIdempotencia: e.chaveIdempotencia,
        },
      }),
    ),
  )
  return { persistidas, duplicadas: entradas.filter((e) => jaGravadas.has(e.chaveIdempotencia)) }
}
