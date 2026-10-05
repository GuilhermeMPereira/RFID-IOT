import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { exigirSessao } from '../autenticacao.js'

export const ativos = Router()

/** RF02 — cadastro patrimonial e lotação. */
ativos.get('/ativos', exigirSessao, async (req, res) => {
  const ambienteId = typeof req.query.ambiente === 'string' ? req.query.ambiente : undefined
  res.json(await prisma.ativo.findMany({
    where: ambienteId ? { ambienteId } : undefined,
    include: { etiquetas: { where: { revogadaEm: null } }, ambiente: true },
    orderBy: { tombamento: 'asc' },
  }))
})

const novoAtivo = z.object({
  tombamento: z.string().min(1),
  descricao: z.string().min(1),
  ambienteId: z.string().uuid(),
})

ativos.post('/ativos', exigirSessao, async (req, res) => {
  const dados = novoAtivo.safeParse(req.body)
  if (!dados.success) return res.status(400).json({ erro: dados.error.issues[0].message })
  res.status(201).json(await prisma.ativo.create({ data: dados.data }))
})

ativos.put('/ativos/:id', exigirSessao, async (req, res) => {
  const dados = novoAtivo.partial().safeParse(req.body)
  if (!dados.success) return res.status(400).json({ erro: dados.error.issues[0].message })
  res.json(await prisma.ativo.update({ where: { id: req.params.id }, data: dados.data }))
})

/** RF03 — vincula o UID lido a um ativo. O vínculo anterior é revogado, nunca editado. */
ativos.post('/ativos/:id/etiquetas', exigirSessao, async (req, res) => {
  const corpo = z.object({ uid: z.string().min(4) }).safeParse(req.body)
  if (!corpo.success) return res.status(400).json({ erro: 'UID ausente ou muito curto' })

  const jaVinculada = await prisma.etiqueta.findUnique({ where: { uid: corpo.data.uid } })
  if (jaVinculada && jaVinculada.revogadaEm === null) {
    return res.status(409).json({
      erro: 'esta etiqueta já está vinculada a outro ativo',
      ativoId: jaVinculada.ativoId,
    })
  }
  res.status(201).json(await prisma.etiqueta.create({
    data: { uid: corpo.data.uid, ativoId: req.params.id },
  }))
})
