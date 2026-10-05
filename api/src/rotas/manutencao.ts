import { Router } from 'express'
import { prisma } from '../prisma.js'
import { exigirSessao } from '../autenticacao.js'

export const manutencao = Router()

/**
 * Descarta um ciclo inteiro, com suas leituras e eventos.
 *
 * Existe para os ensaios: um ciclo aberto por engano, ou usado para testar a
 * interface no desktop, precisa sair do banco antes da apuracao, senao entra
 * nas metricas como se fosse ensaio. Nao e uma operacao de negocio, e so vale
 * para ciclo ainda nao encerrado, porque o encerramento torna o resultado
 * imutavel.
 */
manutencao.delete('/inventarios/:id', exigirSessao, async (req, res) => {
  const inventario = await prisma.inventario.findUnique({ where: { id: req.params.id } })
  if (!inventario) return res.status(404).json({ erro: 'inventário não encontrado' })
  if (inventario.encerradoEm) {
    return res.status(409).json({ erro: 'ciclo encerrado é imutável e não pode ser descartado' })
  }
  await prisma.$transaction([
    prisma.leitura.deleteMany({ where: { inventarioId: req.params.id } }),
    prisma.evento.deleteMany({ where: { inventarioId: req.params.id } }),
    prisma.inventario.delete({ where: { id: req.params.id } }),
  ])
  res.status(204).end()
})
