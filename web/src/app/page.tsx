'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, gravarSessao, lerSessao, type Ambiente, type Sessao } from '@/lib/api'
import { suportaWebNfc } from '@/lib/nfc'

const MODALIDADES = [
  ['ANUAL', 'Anual'],
  ['INICIAL', 'Inicial'],
  ['TRANSFERENCIA', 'Transferência de responsabilidade'],
  ['EXTINCAO', 'Extinção ou transformação'],
  ['EVENTUAL', 'Eventual'],
] as const

export default function Inicio() {
  const router = useRouter()
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [email, setEmail] = useState('auditor@impacta.edu.br')
  const [senha, setSenha] = useState('')
  const [ambientes, setAmbientes] = useState<Ambiente[]>([])
  const [ambienteId, setAmbienteId] = useState('')
  const [modalidade, setModalidade] = useState<string>('ANUAL')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [semNfc, setSemNfc] = useState(false)

  useEffect(() => {
    setSessao(lerSessao())
    setSemNfc(!suportaWebNfc())
  }, [])

  useEffect(() => {
    if (!sessao) return
    api.ambientes()
      .then((lista) => {
        setAmbientes(lista)
        setAmbienteId((atual) => atual || lista[0]?.id || '')
      })
      .catch((e) => setErro(e.message))
  }, [sessao])

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro(null)
    try {
      const nova = await api.entrar(email, senha)
      gravarSessao(nova)
      setSessao(nova)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  async function abrirCiclo() {
    setOcupado(true)
    setErro(null)
    try {
      const inventario = await api.abrirInventario(modalidade, [ambienteId])
      gravarSessao({ ...sessao!, inventarioId: inventario.id, ambienteId })
      router.push('/conferencia')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  function sair() {
    gravarSessao(null)
    setSessao(null)
    setSenha('')
  }

  if (!sessao) {
    return (
      <main>
        <h1>Auditoria NFC</h1>
        <p className="sub">Entre para abrir um ciclo de inventário.</p>
        {semNfc && (
          <div className="aviso neutro">
            Este navegador não expõe a Web NFC. Você consegue navegar e cadastrar,
            mas a leitura de etiquetas exige o Chrome para Android 89 ou superior,
            em HTTPS.
          </div>
        )}
        <form onSubmit={entrar}>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={email} autoComplete="username"
                 onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" value={senha} autoComplete="current-password"
                 onChange={(e) => setSenha(e.target.value)} required />
          {erro && <div className="aviso erro">{erro}</div>}
          <button type="submit" disabled={ocupado}>
            {ocupado ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main>
      <nav className="topo">
        <a href="/etiquetas">Vincular etiquetas</a>
        <a href="/conferencia">Conferência</a>
      </nav>
      <h1>Abrir ciclo de inventário</h1>
      <p className="sub">Auditor: {sessao.auditor.nome}</p>

      <label htmlFor="modalidade">Modalidade</label>
      <select id="modalidade" value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
        {MODALIDADES.map(([valor, rotulo]) => (
          <option key={valor} value={valor}>{rotulo}</option>
        ))}
      </select>

      <label htmlFor="ambiente">Ambiente</label>
      <select id="ambiente" value={ambienteId} onChange={(e) => setAmbienteId(e.target.value)}>
        {ambientes.map((a) => (
          <option key={a.id} value={a.id}>{a.codigo} — {a.nome}</option>
        ))}
      </select>

      {erro && <div className="aviso erro">{erro}</div>}

      <button onClick={abrirCiclo} disabled={ocupado || !ambienteId}>
        {ocupado ? 'Abrindo…' : 'Abrir ciclo e conferir'}
      </button>
      <button className="secundario" onClick={sair}>Sair</button>
    </main>
  )
}
