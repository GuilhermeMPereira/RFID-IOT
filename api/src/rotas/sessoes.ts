import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { emitirToken } from '../autenticacao.js'

export const sessoes = Router()

const entrada = z.object({ email: z.string().email(), senha: z.string().min(8) })

/** RF01 — autentica o auditor e emite credencial de sessão. */
sessoes.post('/sessoes', async (req, res) => {
  const dados = entrada.safeParse(req.body)
  if (!dados.success) return res.status(400).json({ erro: 'e-mail ou senha em formato inválido' })

  const auditor = await prisma.auditor.findUnique({ where: { email: dados.data.email } })
  if (!auditor || !(await bcrypt.compare(dados.data.senha, auditor.senhaHash))) {
    return res.status(401).json({ erro: 'e-mail ou senha incorretos' })
  }
  res.json({
    token: emitirToken({ auditorId: auditor.id, perfil: auditor.perfil }),
    auditor: { id: auditor.id, nome: auditor.nome },
  })
})
