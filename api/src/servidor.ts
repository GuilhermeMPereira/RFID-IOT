import express from 'express'
import { sessoes } from './rotas/sessoes.js'
import { ativos } from './rotas/ativos.js'
import { inventarios } from './rotas/inventarios.js'
import { ambientes } from './rotas/ambientes.js'
import { manutencao } from './rotas/manutencao.js'

const app = express()
app.use(express.json({ limit: '2mb' }))

/**
 * O cliente roda em outra origem (porta do Next, ou o endereco do tunel
 * HTTPS usado no celular), entao o navegador exige CORS. Em producao esta
 * lista viraria um allowlist; no prototipo, qualquer origem.
 */
app.use((req, res, proximo) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin ?? '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  proximo()
})

app.use(sessoes, ativos, ambientes, inventarios, manutencao)

app.get('/saude', (_req, res) => res.json({ estado: 'ok' }))

const porta = Number(process.env.PORT ?? 3333)
app.listen(porta, '0.0.0.0', () => console.log(`API ouvindo em :${porta}`))
