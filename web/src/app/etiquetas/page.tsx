'use client'

import { useEffect, useState } from 'react'
import { api, lerSessao, type Ativo, type Sessao } from '@/lib/api'
import { lerEtiqueta, suportaWebNfc } from '@/lib/nfc'

/**
 * Vinculo entre o UID de fabrica da etiqueta e o ativo cadastrado (RF03).
 *
 * Passo obrigatorio antes da primeira conferencia: sem vinculo, toda leitura
 * cai na categoria "nao cadastrado".
 */
export default function Etiquetas() {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [lendoPara, setLendoPara] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ tipo: string; texto: string } | null>(null)

  useEffect(() => { setSessao(lerSessao()) }, [])

  async function recarregar() {
    try {
      setAtivos(await api.ativos())
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message })
    }
  }
  useEffect(() => { if (sessao) void recarregar() }, [sessao])

  async function vincular(ativo: Ativo) {
    if (!suportaWebNfc()) {
      setAviso({ tipo: 'erro', texto: 'Web NFC indisponível. Use o Chrome para Android em HTTPS.' })
      return
    }
    setLendoPara(ativo.id)
    setAviso({ tipo: 'neutro', texto: `Aproxime a etiqueta de ${ativo.tombamento}…` })

    const tentativa = await lerEtiqueta()
    if (tentativa.desfecho !== 'SUCESSO') {
      setAviso({ tipo: 'erro', texto: tentativa.mensagemErro ?? 'A etiqueta não respondeu.' })
      setLendoPara(null)
      return
    }
    try {
      await api.vincularEtiqueta(ativo.id, tentativa.uidLido)
      setAviso({ tipo: 'ok', texto: `UID ${tentativa.uidLido} vinculado a ${ativo.tombamento}.` })
      await recarregar()
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message })
    } finally {
      setLendoPara(null)
    }
  }

  if (!sessao) {
    return <main><p>Faça login primeiro. <a href="/">Voltar</a></p></main>
  }

  const vinculados = ativos.filter((a) => a.etiquetas.length > 0).length

  return (
    <main>
      <nav className="topo"><a href="/">Início</a><a href="/conferencia">Conferência</a></nav>
      <h1>Vincular etiquetas</h1>
      <p className="sub">
        {vinculados} de {ativos.length} ativos já têm etiqueta. Toque em um ativo
        e encoste o aparelho na etiqueta que vai ficar nele.
      </p>

      {aviso && <div className={`aviso ${aviso.tipo}`}>{aviso.texto}</div>}

      {ativos.map((ativo) => {
        const etiqueta = ativo.etiquetas[0]
        return (
          <div key={ativo.id} className="cartao">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <b>{ativo.tombamento}</b>
                <div className="sub">{ativo.descricao}</div>
                <div className="sub">{ativo.ambiente?.codigo}</div>
              </div>
              <span className={`etiqueta ${etiqueta ? 'ok' : 'pendente'}`}>
                {etiqueta ? 'vinculado' : 'sem etiqueta'}
              </span>
            </div>
            {etiqueta && <div className="sub" style={{ marginTop: 6 }}>UID <code>{etiqueta.uid}</code></div>}
            <button
              className="secundario"
              disabled={lendoPara !== null}
              onClick={() => vincular(ativo)}
            >
              {lendoPara === ativo.id ? 'Aproxime a etiqueta…'
                : etiqueta ? 'Trocar etiqueta' : 'Ler e vincular'}
            </button>
          </div>
        )
      })}
    </main>
  )
}
