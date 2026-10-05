import { prisma } from '../prisma.js'

export type Divergencia = {
  categoria: 'NAO_LOCALIZADO' | 'AMBIENTE_DIVERSO' | 'NAO_CADASTRADO'
  tombamento?: string
  descricao?: string
  uid?: string
  ambienteEsperado?: string
  ambienteLido?: string
}

/**
 * Confronta a lista de ativos esperados nos ambientes do ciclo com as
 * leituras bem-sucedidas, classificando em três categorias.
 */
export async function apurarDivergencias(inventarioId: string) {
  const inventario = await prisma.inventario.findUniqueOrThrow({ where: { id: inventarioId } })

  const esperados = await prisma.ativo.findMany({
    where: { ambienteId: { in: inventario.ambienteIds } },
    include: { etiquetas: { where: { revogadaEm: null } }, ambiente: true },
  })
  const leituras = await prisma.leitura.findMany({
    where: { inventarioId, desfecho: 'SUCESSO' },
    include: { etiqueta: { include: { ativo: { include: { ambiente: true } } } }, ambiente: true },
  })

  const lidoPorUid = new Map(leituras.map((l) => [l.uidLido, l]))
  const divergencias: Divergencia[] = []
  let conformes = 0

  for (const ativo of esperados) {
    const leitura = ativo.etiquetas.map((e) => lidoPorUid.get(e.uid)).find(Boolean)
    if (!leitura) {
      divergencias.push({
        categoria: 'NAO_LOCALIZADO',
        tombamento: ativo.tombamento,
        descricao: ativo.descricao,
        ambienteEsperado: ativo.ambiente.codigo,
      })
    } else if (leitura.ambienteId !== ativo.ambienteId) {
      divergencias.push({
        categoria: 'AMBIENTE_DIVERSO',
        tombamento: ativo.tombamento,
        descricao: ativo.descricao,
        ambienteEsperado: ativo.ambiente.codigo,
        ambienteLido: leitura.ambiente.codigo,
      })
    } else {
      conformes += 1
    }
  }

  for (const leitura of leituras) {
    if (!leitura.etiqueta) {
      divergencias.push({
        categoria: 'NAO_CADASTRADO',
        uid: leitura.uidLido,
        ambienteLido: leitura.ambiente.codigo,
      })
    }
  }

  return {
    resumo: {
      esperados: esperados.length,
      conformes,
      naoLocalizados: divergencias.filter((d) => d.categoria === 'NAO_LOCALIZADO').length,
      ambienteDiverso: divergencias.filter((d) => d.categoria === 'AMBIENTE_DIVERSO').length,
      naoCadastrados: divergencias.filter((d) => d.categoria === 'NAO_CADASTRADO').length,
    },
    divergencias,
  }
}
