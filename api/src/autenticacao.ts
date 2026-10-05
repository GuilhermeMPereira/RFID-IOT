import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const SEGREDO = process.env.JWT_SEGREDO ?? 'desenvolvimento'

export type Sessao = { auditorId: string; perfil: string }

export function emitirToken(sessao: Sessao): string {
  return jwt.sign(sessao, SEGREDO, { expiresIn: '12h' })
}

export function exigirSessao(req: Request, res: Response, proximo: NextFunction) {
  const cabecalho = req.headers.authorization
  if (!cabecalho?.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'credencial de sessão ausente' })
  }
  try {
    req.sessao = jwt.verify(cabecalho.slice(7), SEGREDO) as Sessao
    proximo()
  } catch {
    res.status(401).json({ erro: 'credencial de sessão inválida ou expirada' })
  }
}

declare global {
  namespace Express {
    interface Request { sessao?: Sessao }
  }
}
