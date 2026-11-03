import type { NextConfig } from 'next'

/**
 * Em desenvolvimento o Next recusa requisições a /_next/* vindas de origem
 * diferente de localhost. Como a conferência é feita no celular, a aplicação
 * é aberta por túnel HTTPS ou pelo IP da máquina na rede, e essas origens
 * precisam ser declaradas. Acrescente o seu IP em ORIGENS_DEV no .env.local.
 */
const extras = (process.env.ORIGENS_DEV ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

/**
 * A API é servida sob /api pelo próprio Next, em vez de ser chamada direto.
 *
 * Isso resolve dois problemas de uma vez: o navegador passa a ver cliente e
 * API na mesma origem, então não há CORS; e um único túnel HTTPS basta para
 * o celular, já que as chamadas saem pelo mesmo endereço da página. Sem isso
 * seriam dois túneis, com URLs novas a cada execução.
 */
const API_INTERNA = process.env.API_INTERNA ?? 'http://localhost:3333'

const config: NextConfig = {
  allowedDevOrigins: [
    '*.trycloudflare.com',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.loca.lt',
    ...extras,
  ],
  async rewrites() {
    return [{ source: '/api/:caminho*', destination: `${API_INTERNA}/:caminho*` }]
  },
}

export default config
