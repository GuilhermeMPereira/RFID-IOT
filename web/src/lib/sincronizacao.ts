import { marcarEnviadas, pendentes } from './fila'

import { API } from './api'

export type ResultadoSincronizacao = {
  recebidas: number
  persistidas: number
  duplicadasIgnoradas: number
}

/**
 * Envia a fila acumulada. Só marca como enviadas as leituras que o servidor
 * confirmou, de modo que uma queda no meio da sincronização reenvia o lote
 * inteiro sem risco de duplicação — a deduplicação é feita por chave de
 * idempotência no servidor.
 */
export async function sincronizar(token: string): Promise<ResultadoSincronizacao | null> {
  const fila = await pendentes()
  if (fila.length === 0) return null

  const porInventario = new Map<string, typeof fila>()
  for (const item of fila) {
    porInventario.set(item.inventarioId, [...(porInventario.get(item.inventarioId) ?? []), item])
  }

  let total: ResultadoSincronizacao = { recebidas: 0, persistidas: 0, duplicadasIgnoradas: 0 }

  for (const [inventarioId, itens] of porInventario) {
    const resposta = await fetch(`${API}/inventarios/${inventarioId}/leituras:lote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(itens.map(({ inventarioId: _i, enviado: _e, ...resto }) => resto)),
    })
    if (!resposta.ok) throw new Error(`sincronização recusada pelo servidor (${resposta.status})`)

    const parcial: ResultadoSincronizacao = await resposta.json()
    await marcarEnviadas(itens.map((i) => i.chaveIdempotencia))
    total = {
      recebidas: total.recebidas + parcial.recebidas,
      persistidas: total.persistidas + parcial.persistidas,
      duplicadasIgnoradas: total.duplicadasIgnoradas + parcial.duplicadasIgnoradas,
    }
  }
  return total
}
