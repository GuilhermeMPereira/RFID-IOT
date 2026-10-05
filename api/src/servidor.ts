import express from 'express'
import { sessoes } from './rotas/sessoes.js'
import { ativos } from './rotas/ativos.js'
import { inventarios } from './rotas/inventarios.js'

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(sessoes, ativos, inventarios)

app.get('/saude', (_req, res) => res.json({ estado: 'ok' }))

const porta = Number(process.env.PORT ?? 3333)
app.listen(porta, () => console.log(`API ouvindo em :${porta}`))
