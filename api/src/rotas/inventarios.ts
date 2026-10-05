import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { exigirSessao } from '../autenticacao.js'
import { apurarDivergencias } from '../servicos/divergencias.js'
import { registrarLeituras } from '../servicos/leituras.js'

export const inventarios = Router()
inventarios.use(exigirSessao)

const abertura = z.object({
  modalidade: z.enum(['INICIAL', 'ANUAL', 'TRANSFERENCIA', 'EXTINCAO', 'EVENTUAL']),
  ambienteIds: z.array(z.string().uuid()).min(1),
})

/** RF04 — instaura o ciclo de contagem. */
inventarios.post('/inventarios', async (req, res) => {
  const dados = abertura.safeParse(req.body)
  if (!dados.success) return res.status(400).json({ erro: dados.error.issues[0].message })

  const inventario = await prisma.$transaction(async (tx) => {
    const criado = await tx.inventario.create({
      data: { ...dados.data, responsavelId: req.sessao!.auditorId },
    })
    await tx.evento.create({
      data: {
        inventarioId: criado.id,
        autorId: req.sessao!.auditorId,
        tipo: 'INVENTARIO_ABERTO',
        detalhe: { modalidade: criado.modalidade, ambientes: criado.ambienteIds },
      },
    })
    return criado
  })
  res.status(201).json(inventario)
})

const leitura = z.object({
  uidLido: z.string().min(4),
  ambienteId: z.string().uuid(),
  desfecho: z.enum(['SUCESSO', 'TEMPO_ESGOTADO', 'ERRO_INTERFACE']),
  mensagemErro: z.string().optional(),
  carimboCliente: z.coerce.date(),
  dispositivo: z.string().min(1),
  condicaoEnsaio: z.string().optional(),
  chaveIdempotencia: z.string().uuid(),
})

/** RF05 — persiste uma leitura. */
inventarios.post('/inventarios/:id/leituras', async (req, res) => {
  const dados = leitura.safeParse(req.body)
  if (!dados.success) return res.status(400).json({ erro: dados.error.issues[0].message })

  const resultado = await registrarLeituras(req.params.id, req.sessao!.auditorId, [dados.data])
  res.status(201).json(resultado.persistidas[0] ?? resultado.duplicadas[0])
})

/**
 * RF06 e RF07 — recebe a fila acumulada offline.
 * POST não é idempotente, então a deduplicação é feita no servidor pela
 * chave de idempotência gerada no cliente no instante da leitura.
 */
inventarios.post('/inventarios/:id/leituras:lote', async (req, res) => {
  const dados = z.array(leitura).min(1).max(500).safeParse(req.body)
  if (!dados.success) return res.status(400).json({ erro: dados.error.issues[0].message })

  const resultado = await registrarLeituras(req.params.id, req.sessao!.auditorId, dados.data)
  res.json({
    recebidas: dados.data.length,
    persistidas: resultado.persistidas.length,
    duplicadasIgnoradas: resultado.duplicadas.length,
  })
})

/** RF08 — confronta esperado e lido. */
inventarios.get('/inventarios/:id/divergencias', async (req, res) => {
  res.json(await apurarDivergencias(req.params.id))
})

/** RF09 — consolida o ciclo e torna o resultado imutável. */
inventarios.post('/inventarios/:id/encerramento', async (req, res) => {
  const inventario = await prisma.inventario.findUnique({ where: { id: req.params.id } })
  if (!inventario) return res.status(404).json({ erro: 'inventário não encontrado' })
  if (inventario.encerradoEm) return res.status(409).json({ erro: 'este inventário já foi encerrado' })

  const apuracao = await apurarDivergencias(req.params.id)
  const encerrado = await prisma.$transaction(async (tx) => {
    const atualizado = await tx.inventario.update({
      where: { id: req.params.id },
      data: { encerradoEm: new Date() },
    })
    await tx.evento.create({
      data: {
        inventarioId: req.params.id,
        autorId: req.sessao!.auditorId,
        tipo: 'INVENTARIO_ENCERRADO',
        detalhe: apuracao.resumo,
      },
    })
    return atualizado
  })
  res.json({ inventario: encerrado, resumo: apuracao.resumo })
})

/** RF10 — devolve a trilha de auditoria completa. */
inventarios.get('/inventarios/:id/trilha', async (req, res) => {
  const [eventos, leituras] = await Promise.all([
    prisma.evento.findMany({
      where: { inventarioId: req.params.id },
      include: { autor: { select: { nome: true } } },
      orderBy: { ocorridoEm: 'asc' },
    }),
    prisma.leitura.findMany({
      where: { inventarioId: req.params.id },
      include: { auditor: { select: { nome: true } }, ambiente: true },
      orderBy: { carimboServidor: 'asc' },
    }),
  ])
  res.json({ eventos, leituras })
})
