import { openDB, type IDBPDatabase } from 'idb'
import type { Tentativa } from './nfc'

/**
 * Fila local de leituras.
 *
 * Depósitos e subsolos costumam não ter cobertura de rede, então a conferência
 * precisa prosseguir sem servidor. Cada item já carrega a chave de
 * idempotência gerada no instante da leitura, de modo que um reenvio não
 * duplica registros no servidor.
 */

type ItemFila = Tentativa & { inventarioId: string; ambienteId: string; enviado: boolean }

let banco: Promise<IDBPDatabase> | null = null

function abrir() {
  banco ??= openDB('auditoria-nfc', 1, {
    upgrade(bd) {
      const loja = bd.createObjectStore('leituras', { keyPath: 'chaveIdempotencia' })
      loja.createIndex('porEnvio', 'enviado')
    },
  })
  return banco
}

export async function enfileirar(item: Omit<ItemFila, 'enviado'>): Promise<void> {
  const bd = await abrir()
  await bd.put('leituras', { ...item, enviado: false })
}

export async function pendentes(): Promise<ItemFila[]> {
  const bd = await abrir()
  const todas: ItemFila[] = await bd.getAll('leituras')
  return todas.filter((i) => !i.enviado)
}

export async function marcarEnviadas(chaves: string[]): Promise<void> {
  const bd = await abrir()
  const tx = bd.transaction('leituras', 'readwrite')
  for (const chave of chaves) {
    const item = await tx.store.get(chave)
    if (item) await tx.store.put({ ...item, enviado: true })
  }
  await tx.done
}

export async function totalPendentes(): Promise<number> {
  return (await pendentes()).length
}
