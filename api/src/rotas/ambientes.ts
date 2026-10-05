import { Router } from 'express'
import { prisma } from '../prisma.js'
import { exigirSessao } from '../autenticacao.js'

export const ambientes = Router()

ambientes.get('/ambientes', exigirSessao, async (_req, res) => {
  res.json(await prisma.ambiente.findMany({ orderBy: { codigo: 'asc' } }))
})
