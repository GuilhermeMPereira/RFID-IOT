'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, gravarSessao, lerSessao, type Divergencia, type Sessao } from '@/lib/api'
import { lerEtiqueta, suportaWebNfc, type Tentativa } from '@/lib/nfc'
import { enfileirar, totalPendentes } from '@/lib/fila'
import { sincronizar } from '@/lib/sincronizacao'

/**
 * Painel de conferencia.
 *
 * A leitura parte de um toque, porque a Web NFC exige gesto explicito do
 * usuario para conceder a permissao e bloqueia o radio com a tela apagada.
 * Toda tentativa entra na fila local antes de qualquer tentativa de envio,
 * de modo que uma queda de rede no meio do ciclo nao perca leitura.
 */

/**
 * Condicoes experimentais do protocolo (subsecao 3.6 do artigo).
 *
 * Ficam aqui, e nao em variavel de ambiente, porque o operador troca de
 * condicao varias vezes dentro da mesma sessao de bancada; exigir rebuild a
 * cada troca tornaria o ensaio impraticavel. A escolha acompanha cada leitura
 * ate o banco e e o que permite apurar as metricas por condicao.
 */
const CONDICOES = [
  ['', 'Sem condicao (uso normal)'],
  ['madeira-0mm-0g', 'Madeira, 0 mm, 0 graus'],
  ['madeira-10mm-0g', 'Madeira, 10 mm, 0 graus'],
  ['plastico-0mm-0g', 'Plastico, 0 mm, 0 graus'],
  ['plastico-10mm-0g', 'Plastico, 10 mm, 0 graus'],
  ['aco-0mm-0g', 'Aco pintado, 0 mm, 0 graus'],
  ['aco-10mm-0g', 'Aco pintado, 10 mm, 0 graus'],
  ['eletronico-0mm', 'Proximo a eletronico energizado, 0 mm'],
  ['angulo-45g', 'Aproximacao a 45 graus'],
  ['angulo-90g', 'Aproximacao a 90 graus'],
  ['sem-rede', 'Sem conectividade de rede'],
] as const

const CHAVE_CONDICAO = 'auditoria-nfc:condicao'

export default function Conferencia() {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [lendo, setLendo] = useState(false)
  const [tentativas, setTentativas] = useState<Tentativa[]>([])
  const [naFila, setNaFila] = useState(0)
  const [aviso, setAviso] = useState<{ tipo: string; texto: string } | null>(null)
  const [divergencias, setDivergencias] = useState<Divergencia[] | null>(null)
  const [condicao, setCondicao] = useState('')
  const [encerrado, setEncerrado] = useState(false)

  useEffect(() => {
    setSessao(lerSessao())
    void totalPendentes().then(setNaFila)
    try {
      setCondicao(localStorage.getItem(CHAVE_CONDICAO) ?? '')
    } catch {
      /* armazenamento bloqueado */
    }
    if (!suportaWebNfc()) {
      setAviso({
        tipo: 'neutro',
        texto: 'Este navegador não expõe a Web NFC. Use o Chrome para Android 89 ou superior, em HTTPS.',
      })
    }
  }, [])

  function trocarCondicao(valor: string) {
    setCondicao(valor)
    try {
      localStorage.setItem(CHAVE_CONDICAO, valor)
    } catch {
      /* armazenamento bloqueado */
    }
  }

  const enviarFila = useCallback(async () => {
    const token = lerSessao()?.token
    if (!token) return
    try {
      const r = await sincronizar(token)
      if (r) setAviso({ tipo: 'ok', texto: `${r.persistidas} enviadas, ${r.duplicadasIgnoradas} já constavam.` })
      setNaFila(await totalPendentes())
    } catch (e) {
      setAviso({ tipo: 'neutro', texto: `Guardado no aparelho. ${(e as Error).message}` })
    }
  }, [])

  useEffect(() => {
    window.addEventListener('online', enviarFila)
    return () => window.removeEventListener('online', enviarFila)
  }, [enviarFila])

  async function conferir() {
    const { inventarioId, ambienteId } = sessao ?? {}
    if (!inventarioId || !ambienteId) return

    // Navegador sem Web NFC nao e modo de falha do sistema, e aparelho errado.
    // Registrar isso como tentativa contaminaria a taxa de sucesso dos ensaios.
    if (!suportaWebNfc()) {
      setAviso({
        tipo: 'neutro',
        texto: 'Este navegador não expõe a Web NFC, então não há o que ler. '
          + 'Abra pelo Chrome do Android, em HTTPS. Nada foi registrado.',
      })
      return
    }

    setLendo(true)
    setAviso({ tipo: 'neutro', texto: 'Aproxime o aparelho da etiqueta…' })

    const tentativa = await lerEtiqueta({ condicaoEnsaio: condicao || undefined })
    setTentativas((anteriores) => [tentativa, ...anteriores])
    await enfileirar({ ...tentativa, inventarioId, ambienteId })
    setNaFila(await totalPendentes())

    if (tentativa.desfecho === 'TEMPO_ESGOTADO') {
      setAviso({ tipo: 'erro', texto: 'A etiqueta não respondeu. Aproxime mais, ou reposicione sobre a etiqueta.' })
    } else if (tentativa.desfecho === 'ERRO_INTERFACE') {
      setAviso({ tipo: 'erro', texto: `Falha na interface: ${tentativa.mensagemErro}` })
    } else {
      setAviso({ tipo: 'ok', texto: `Lido ${tentativa.uidLido}.` })
      if (navigator.onLine) await enviarFila()
    }
    setLendo(false)
  }

  async function apurar() {
    if (!sessao?.inventarioId) return
    await enviarFila()
    try {
      const r = await api.divergencias(sessao.inventarioId)
      setDivergencias(r.divergencias)
      setAviso({
        tipo: 'neutro',
        texto: `${r.resumo.conformes} conformes de ${r.resumo.esperados} esperados.`,
      })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message })
    }
  }

  /**
   * RF09 — encerra o ciclo. A fila local vai antes: depois do encerramento o
   * servidor recusa leitura, e uma tentativa esquecida no aparelho ficaria
   * presa para sempre.
   */
  async function encerrar() {
    if (!sessao?.inventarioId) return
    if (naFila > 0) {
      await enviarFila()
      if ((await totalPendentes()) > 0) {
        setAviso({
          tipo: 'erro',
          texto: 'Ainda há leituras na fila deste aparelho. Reconecte e sincronize antes de encerrar.',
        })
        return
      }
    }
    try {
      const r = await api.encerrar(sessao.inventarioId)
      setEncerrado(true)
      setAviso({
        tipo: 'ok',
        texto: `Ciclo encerrado. ${r.resumo.conformes} conformes, `
          + `${r.resumo.naoLocalizados} não localizados, ${r.resumo.ambienteDiverso} em ambiente diverso, `
          + `${r.resumo.naoCadastrados} não cadastrados. O resultado agora é imutável.`,
      })
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message })
    }
  }

  function novoCiclo() {
    const atual = lerSessao()
    if (!atual) return
    gravarSessao({ token: atual.token, auditor: atual.auditor })
    window.location.href = '/'
  }

  if (!sessao?.inventarioId) {
    return (
      <main>
        <nav className="topo"><a href="/">Início</a></nav>
        <h1>Conferência</h1>
        <p>Nenhum ciclo de inventário aberto. <a href="/">Abra um na tela inicial.</a></p>
      </main>
    )
  }

  const sucessos = tentativas.filter((t) => t.desfecho === 'SUCESSO').length

  return (
    <main>
      <nav className="topo">
        <a href="/">Início</a>
        <a href="/ativos">Ativos</a>
        <a href="/etiquetas">Etiquetas</a>
        <a href="/trilha">Trilha</a>
      </nav>
      <h1>Conferência</h1>

      <div className="contadores">
        <div className="contador"><b>{sucessos}</b><span>lidos</span></div>
        <div className="contador"><b>{tentativas.length - sucessos}</b><span>falhas</span></div>
        <div className="contador"><b>{naFila}</b><span>na fila</span></div>
      </div>

      <label htmlFor="condicao">Condição experimental</label>
      <select id="condicao" value={condicao} onChange={(e) => trocarCondicao(e.target.value)}>
        {CONDICOES.map(([valor, rotulo]) => (
          <option key={valor || 'nenhuma'} value={valor}>{rotulo}</option>
        ))}
      </select>

      <button onClick={conferir} disabled={lendo || encerrado}>
        {lendo ? 'Aproxime o aparelho da etiqueta…' : 'Conferir próximo bem'}
      </button>
      <button className="secundario" onClick={apurar}>Apurar divergências</button>
      {!encerrado
        ? <button className="secundario" onClick={encerrar}>Encerrar ciclo</button>
        : <button className="secundario" onClick={novoCiclo}>Abrir novo ciclo</button>}

      {aviso && <div className={`aviso ${aviso.tipo}`}>{aviso.texto}</div>}

      {divergencias && (
        <>
          <h2>Divergências ({divergencias.length})</h2>
          {divergencias.length === 0 && <p className="sub">Nenhuma. Tudo conferido.</p>}
          {divergencias.map((d, i) => (
            <div key={i} className="cartao">
              <span className="etiqueta falha">{d.categoria.replace('_', ' ').toLowerCase()}</span>
              <div style={{ marginTop: 6 }}>
                {d.tombamento ? <b>{d.tombamento}</b> : <code>{d.uid}</code>}
                {d.descricao && <div className="sub">{d.descricao}</div>}
                {d.ambienteEsperado && (
                  <div className="sub">
                    esperado em {d.ambienteEsperado}
                    {d.ambienteLido && ` · lido em ${d.ambienteLido}`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {tentativas.length > 0 && (
        <>
          <h2>Leituras desta sessão</h2>
          <ol className="leituras">
            {tentativas.map((t) => (
              <li key={t.chaveIdempotencia}>
                <code>{t.uidLido || '—'}</code>
                <span className={`etiqueta ${t.desfecho === 'SUCESSO' ? 'ok' : 'falha'}`}>
                  {t.desfecho === 'SUCESSO' ? 'ok'
                    : t.desfecho === 'TEMPO_ESGOTADO' ? 'sem resposta' : 'erro'}
                </span>
                <span className="sub">{new Date(t.carimboCliente).toLocaleTimeString('pt-BR')}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  )
}
