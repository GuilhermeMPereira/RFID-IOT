'use client'

import { useEffect, useState } from 'react'
import { api, lerSessao, type EventoTrilha, type LeituraTrilha, type Sessao } from '@/lib/api'

/**
 * Trilha de auditoria do ciclo (RF10).
 *
 * A auditoria avalia o processo, nao apenas a contagem: interessa quem leu,
 * quando, de que aparelho e o que aconteceu nas tentativas que falharam. Por
 * isso a tela mostra todas as leituras, e nao so as bem-sucedidas, com os
 * dois carimbos de tempo lado a lado — a diferenca entre eles e a latencia
 * medida pelo protocolo de ensaios.
 */
function momento(iso: string) {
  return new Date(iso).toLocaleString('pt-BR')
}

export default function Trilha() {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [eventos, setEventos] = useState<EventoTrilha[]>([])
  const [leituras, setLeituras] = useState<LeituraTrilha[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => { setSessao(lerSessao()) }, [])

  useEffect(() => {
    if (!sessao?.inventarioId) { setCarregando(false); return }
    api.trilha(sessao.inventarioId)
      .then((r) => { setEventos(r.eventos); setLeituras(r.leituras) })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false))
  }, [sessao])

  if (!sessao) return <main><p>Faça login primeiro. <a href="/">Voltar</a></p></main>

  if (!sessao.inventarioId) {
    return (
      <main>
        <nav className="topo"><a href="/">Início</a></nav>
        <h1>Trilha de auditoria</h1>
        <p>Nenhum ciclo aberto. <a href="/">Abra um na tela inicial.</a></p>
      </main>
    )
  }

  return (
    <main>
      <nav className="topo">
        <a href="/">Início</a>
        <a href="/ativos">Ativos</a>
        <a href="/etiquetas">Etiquetas</a>
        <a href="/conferencia">Conferência</a>
      </nav>
      <h1>Trilha de auditoria</h1>
      <p className="sub">{eventos.length} eventos e {leituras.length} tentativas de leitura neste ciclo.</p>

      {erro && <div className="aviso erro">{erro}</div>}
      {carregando && <p className="sub">Carregando…</p>}

      <h2>Eventos do ciclo</h2>
      {eventos.map((e) => (
        <div key={e.id} className="cartao">
          <b>{e.tipo.replace(/_/g, ' ').toLowerCase()}</b>
          <div className="sub">{momento(e.ocorridoEm)} · {e.autor?.nome}</div>
          <div className="sub"><code>{JSON.stringify(e.detalhe)}</code></div>
        </div>
      ))}

      <h2>Tentativas de leitura</h2>
      {leituras.length === 0 && <p className="sub">Nenhuma leitura registrada até agora.</p>}
      {leituras.map((l) => (
        <div key={l.id} className="cartao">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <code>{l.uidLido || '—'}</code>
            <span className={`etiqueta ${l.desfecho === 'SUCESSO' ? 'ok' : 'falha'}`}>
              {l.desfecho === 'SUCESSO' ? 'ok'
                : l.desfecho === 'TEMPO_ESGOTADO' ? 'sem resposta' : 'erro'}
            </span>
          </div>
          <div className="sub">{l.auditor?.nome} · {l.ambiente?.codigo} · {l.dispositivo}</div>
          <div className="sub">
            cliente {momento(l.carimboCliente)} · servidor {momento(l.carimboServidor)}
            {' · '}latência {Math.max(0, new Date(l.carimboServidor).getTime() - new Date(l.carimboCliente).getTime())} ms
          </div>
          {l.condicaoEnsaio && <div className="sub">condição: {l.condicaoEnsaio}</div>}
          {l.mensagemErro && <div className="sub">{l.mensagemErro}</div>}
        </div>
      ))}
    </main>
  )
}
