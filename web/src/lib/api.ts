/**
 * Cliente da API e sessao do auditor.
 *
 * A sessao fica em localStorage porque a conferencia e feita no aparelho do
 * proprio auditor e precisa sobreviver ao bloqueio de tela, que no Android
 * descarrega a aba com frequencia.
 */
export const API = process.env.NEXT_PUBLIC_API ?? 'http://localhost:3333'

const CHAVE = 'auditoria-nfc:sessao'

export type Sessao = {
  token: string
  auditor: { id: string; nome: string }
  inventarioId?: string
  ambienteId?: string
}

export function lerSessao(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as Sessao) : null
  } catch {
    return null
  }
}

export function gravarSessao(sessao: Sessao | null): void {
  try {
    if (sessao) localStorage.setItem(CHAVE, JSON.stringify(sessao))
    else localStorage.removeItem(CHAVE)
  } catch {
    /* navegacao privada ou armazenamento bloqueado */
  }
}

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const sessao = lerSessao()
  const resposta = await fetch(`${API}${caminho}`, {
    ...opcoes,
    headers: {
      'content-type': 'application/json',
      ...(sessao ? { authorization: `Bearer ${sessao.token}` } : {}),
      ...opcoes.headers,
    },
  })
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}))
    throw new Error(corpo.erro ?? `A API respondeu ${resposta.status}`)
  }
  return resposta.json() as Promise<T>
}

export type Ambiente = { id: string; codigo: string; nome: string }
export type Etiqueta = { id: string; uid: string; revogadaEm: string | null }
export type Ativo = {
  id: string
  tombamento: string
  descricao: string
  ambienteId: string
  etiquetas: Etiqueta[]
  ambiente: Ambiente
}
export type Inventario = { id: string; modalidade: string; ambienteIds: string[] }
export type Divergencia = {
  categoria: 'NAO_LOCALIZADO' | 'AMBIENTE_DIVERSO' | 'NAO_CADASTRADO'
  tombamento?: string
  descricao?: string
  uid?: string
  ambienteEsperado?: string
  ambienteLido?: string
}

export const api = {
  entrar: (email: string, senha: string) =>
    requisitar<{ token: string; auditor: { id: string; nome: string } }>('/sessoes', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    }),

  ambientes: () => requisitar<Ambiente[]>('/ambientes'),

  ativos: (ambienteId?: string) =>
    requisitar<Ativo[]>(`/ativos${ambienteId ? `?ambiente=${ambienteId}` : ''}`),

  vincularEtiqueta: (ativoId: string, uid: string) =>
    requisitar<Etiqueta>(`/ativos/${ativoId}/etiquetas`, {
      method: 'POST',
      body: JSON.stringify({ uid }),
    }),

  abrirInventario: (modalidade: string, ambienteIds: string[]) =>
    requisitar<Inventario>('/inventarios', {
      method: 'POST',
      body: JSON.stringify({ modalidade, ambienteIds }),
    }),

  divergencias: (inventarioId: string) =>
    requisitar<{ resumo: Record<string, number>; divergencias: Divergencia[] }>(
      `/inventarios/${inventarioId}/divergencias`,
    ),

  encerrar: (inventarioId: string) =>
    requisitar<{ resumo: Record<string, number> }>(
      `/inventarios/${inventarioId}/encerramento`,
      { method: 'POST' },
    ),
}
