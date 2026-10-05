import type { NextConfig } from 'next'

const config: NextConfig = {
  // A Web NFC só existe em contexto seguro. No celular isso significa HTTPS,
  // por túnel ou por `next dev --experimental-https`.
  allowedDevOrigins: ['*.trycloudflare.com', '*.ngrok-free.app', '*.loca.lt'],
}

export default config
