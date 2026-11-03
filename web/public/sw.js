/**
 * Service worker da aplicacao.
 *
 * Sem ele a fila offline resolve metade do problema: as leituras ficam
 * guardadas, mas se o auditor recarregar a pagina dentro de um deposito sem
 * cobertura, a aplicacao nao abre. O trabalho de campo e justamente onde nao
 * ha rede, entao o casco da aplicacao precisa vir do cache.
 *
 * Duas regras apenas:
 *  - /api/* nunca e cacheado. Leitura e divergencia sao dado vivo, e devolver
 *    uma apuracao velha seria pior do que falhar.
 *  - o restante e servido do cache primeiro e atualizado em segundo plano.
 */
const CACHE = 'auditoria-nfc-v1'
const CASCO = ['/', '/ativos', '/etiquetas', '/conferencia', '/trilha', '/manifest.json']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CASCO))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request
  if (requisicao.method !== 'GET') return

  const url = new URL(requisicao.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  evento.respondWith(
    caches.match(requisicao).then((guardada) => {
      const daRede = fetch(requisicao)
        .then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone()
            caches.open(CACHE).then((c) => c.put(requisicao, copia))
          }
          return resposta
        })
        .catch(() => guardada ?? caches.match('/'))
      return guardada ?? daRede
    }),
  )
})
