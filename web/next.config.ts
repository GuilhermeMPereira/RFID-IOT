import type { NextConfig } from 'next'

/**
 * Em desenvolvimento o Next recusa requisições a /_next/* vindas de uma origem
 * diferente de localhost. Como a conferência é feita no celular, a aplicação é
 * aberta pelo IP da máquina na rede ou por um túnel HTTPS, e essas origens
 * precisam ser declaradas.
 *
 * Acrescente o IP da sua máquina em ORIGENS_DEV no .env.local, separando por
 * vírgula, se ele não estiver na lista.
 */
const extras = (process.env.ORIGENS_DEV ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const config: NextConfig = {
  allowedDevOrigins: [
    '*.trycloudflare.com',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.loca.lt',
    ...extras,
  ],
}

export default config
