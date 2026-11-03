'use client'

import { useEffect, useState } from 'react'
import { api, lerSessao, type Ambiente, type Ativo, type Sessao } from '@/lib/api'

/**
 * Cadastro patrimonial e lotacao (RF02).
 *
 * Primeiro passo do procedimento: so existe conferencia do que esta
 * cadastrado. A lotacao e obrigatoria porque e ela que define a lista
 * esperada de cada ciclo e, portanto, o que conta como divergencia.
 */
export default function Ativos() {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [ambientes, setAmbientes] = useState<Ambiente[]>([])
  const [tombamento, setTombamento] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ambienteId, setAmbienteId] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: string; texto: string } | null>(null)

  useEffect(() => { setSessao(lerSessao()) }, [])

  async function recarregar() {
    try {
      const [lista, locais] = await Promise.all([api.ativos(), api.ambientes()])
      setAtivos(lista)
      setAmbientes(locais)
      setAmbienteId((atual) => atual || locais[0]?.id || '')
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message })
    }
  }
  useEffect(() => { if (sessao) void recarregar() }, [sessao])

  async function cadastrar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setAviso(null)
    try {
      await api.cadastrarAtivo(tombamento.trim(), descricao.trim(), ambienteId)
      setAviso({ tipo: 'ok', texto: `Ativo ${tombamento} cadastrado.` })
      setTombamento('')
      setDescricao('')
      await recarregar()
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message })
    } finally {
      setOcupado(false)
    }
  }

  if (!sessao) {
    return <main><p>Faça login primeiro. <a href="/">Voltar</a></p></main>
  }

  return (
    <main>
      <nav className="topo">
        <a href="/">Início</a>
        <a href="/etiquetas">Etiquetas</a>
        <a href="/conferencia">Conferência</a>
        <a href="/trilha">Trilha</a>
      </nav>
      <h1>Cadastro de ativos</h1>
      <p className="sub">{ativos.length} bens cadastrados em {ambientes.length} ambientes.</p>

      <form onSubmit={cadastrar}>
        <label htmlFor="tombamento">Número de tombamento</label>
        <input id="tombamento" value={tombamento} required
               onChange={(e) => setTombamento(e.target.value)} />
        <label htmlFor="descricao">Descrição do bem</label>
        <input id="descricao" value={descricao} required
               onChange={(e) => setDescricao(e.target.value)} />
        <label htmlFor="lotacao">Ambiente de lotação</label>
        <select id="lotacao" value={ambienteId} onChange={(e) => setAmbienteId(e.target.value)}>
          {ambientes.map((a) => (
            <option key={a.id} value={a.id}>{a.codigo} — {a.nome}</option>
          ))}
        </select>
        <button type="submit" disabled={ocupado || !ambienteId}>
          {ocupado ? 'Cadastrando…' : 'Cadastrar bem'}
        </button>
      </form>

      {aviso && <div className={`aviso ${aviso.tipo}`}>{aviso.texto}</div>}

      <h2>Bens cadastrados</h2>
      {ativos.map((ativo) => (
        <div key={ativo.id} className="cartao">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <b>{ativo.tombamento}</b>
              <div className="sub">{ativo.descricao}</div>
            </div>
            <span className={`etiqueta ${ativo.etiquetas.length > 0 ? 'ok' : 'pendente'}`}>
              {ativo.ambiente?.codigo}
            </span>
          </div>
        </div>
      ))}
    </main>
  )
}
