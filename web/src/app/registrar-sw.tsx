'use client'

import { useEffect } from 'react'

/**
 * Registra o service worker.
 *
 * So em producao: em desenvolvimento o Next troca os modulos a quente e um
 * casco cacheado serviria arquivos velhos, o que gera erro dificil de
 * diagnosticar. Para testar o comportamento offline, use npm run build e
 * depois npm start.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* registro recusado: a aplicacao segue funcionando, so sem casco offline */
    })
  }, [])
  return null
}
