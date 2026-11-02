import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { exigirSessao } from '../autenticacao.js'
import { ErroDeRegra } from '../erros.js'

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

  const repetido = await prisma.ativo.findUnique({ where: { tombamento: dados.data.tombamento } })
  if (repetido) throw new ErroDeRegra(409, 'já existe um ativo com este número de tombamento')

  res.status(201).json(await prisma.ativo.create({ data: dados.data }))
})

ativos.put<{ id: string }>('/ativos/:id', exigirSessao, async (req, res) => {
  const dados = novoAtivo.partial().safeParse(req.body)
  if (!dados.success) return res.status(400).json({ erro: dados.error.issues[0].message })
  res.json(await prisma.ativo.update({ where: { id: req.params.id }, data: dados.data }))
})

/**
 * RF03 — vincula o UID lido a um ativo.
 *
 * O vinculo anterior do ativo e revogado, nunca editado, e a revogacao
 * acontece na mesma transacao do novo vinculo: um ativo nunca fica com duas
 * etiquetas ativas, e a troca de etiqueta preserva o historico de qual UID
 * respondia por ele em cada periodo.
 *
 * O mesmo UID pode voltar a ser vinculado depois de revogado — uma etiqueta
 * descolada e recolocada em outro bem e caso comum em campo. Quem garante
 * que nao existam dois vinculos ativos para o mesmo UID e o indice unico
 * parcial criado na migracao, e nao a checagem abaixo, que serve para
 * devolver uma mensagem legivel em vez de erro de banco.
 */
ativos.post<{ id: string }>('/ativos/:id/etiquetas', exigirSessao, async (req, res) => {
  const corpo = z.object({ uid: z.string().min(4) }).safeParse(req.body)
  if (!corpo.success) throw new ErroDeRegra(400, 'UID ausente ou muito curto')

  const ativo = await prisma.ativo.findUnique({ where: { id: req.params.id } })
  if (!ativo) throw new ErroDeRegra(404, 'ativo não encontrado')

  const vinculoAtivo = await prisma.etiqueta.findFirst({
    where: { uid: corpo.data.uid, revogadaEm: null },
  })
  if (vinculoAtivo && vinculoAtivo.ativoId !== ativo.id) {
    throw new ErroDeRegra(409, 'esta etiqueta já está vinculada a outro ativo')
  }
  if (vinculoAtivo) return res.json(vinculoAtivo)

  const criada = await prisma.$transaction(async (tx) => {
    await tx.etiqueta.updateMany({
      where: { ativoId: ativo.id, revogadaEm: null },
      data: { revogadaEm: new Date() },
    })
    return tx.etiqueta.create({ data: { uid: corpo.data.uid, ativoId: ativo.id } })
  })
  res.status(201).json(criada)
})
