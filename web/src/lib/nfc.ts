/**
 * Camada de acesso ao rádio NFC pela interface Web NFC.
 *
 * A interface só existe em contexto seguro (HTTPS), exige gesto explícito do
 * usuário para conceder permissão e é bloqueada com a tela apagada. Está
 * limitada ao formato NDEF e não expõe operações de nível inferior.
 *
 * Toda tentativa — inclusive as que falham — produz um registro, porque o
 * protocolo de ensaios precisa distinguir falha de leitura de leitura
 * incorreta, e falha física de falha de software.
 */

export type Desfecho = 'SUCESSO' | 'TEMPO_ESGOTADO' | 'ERRO_INTERFACE'

export type Tentativa = {
  uidLido: string
  desfecho: Desfecho
  mensagemErro?: string
  carimboCliente: string
  dispositivo: string
  condicaoEnsaio?: string
  chaveIdempotencia: string
}

export function suportaWebNfc(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window
}

function identificarDispositivo(): string {
  if (typeof navigator === 'undefined') return 'desconhecido'
  const ua = navigator.userAgent
  const modelo = ua.match(/Android[^;]*;\s*([^)]+?)\s*(?:Build|\))/)?.[1]
  const chrome = ua.match(/Chrome\/(\d+)/)?.[1]
  return `${modelo ?? 'Android'} | Chrome ${chrome ?? '?'}`
}

/**
 * Classifica o erro devolvido pela interface. A distinção importa para a
 * análise qualitativa dos modos de falha: NotAllowedError e NotSupportedError
 * são falha de software ou de permissão; AbortError por tempo esgotado
 * costuma indicar que a etiqueta não acoplou.
 */
function classificar(erro: unknown): { desfecho: Desfecho; mensagem: string } {
  const nome = erro instanceof DOMException ? erro.name : 'Error'
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  if (nome === 'AbortError' || nome === 'TimeoutError') {
    return { desfecho: 'TEMPO_ESGOTADO', mensagem: `${nome}: ${mensagem}` }
  }
  return { desfecho: 'ERRO_INTERFACE', mensagem: `${nome}: ${mensagem}` }
}

export type OpcoesLeitura = {
  tempoLimiteMs?: number
  condicaoEnsaio?: string
  sinal?: AbortSignal
}

/**
 * Executa uma tentativa de leitura e devolve sempre um registro, com o
 * carimbo de tempo do cliente tomado no instante em que a etiqueta responde.
 */
export async function lerEtiqueta(opcoes: OpcoesLeitura = {}): Promise<Tentativa> {
  const { tempoLimiteMs = 15000, condicaoEnsaio } = opcoes
  const base = {
    dispositivo: identificarDispositivo(),
    condicaoEnsaio,
    chaveIdempotencia: crypto.randomUUID(),
  }

  if (!suportaWebNfc()) {
    return {
      ...base,
      uidLido: '',
      desfecho: 'ERRO_INTERFACE',
      mensagemErro: 'Web NFC indisponível neste navegador',
      carimboCliente: new Date().toISOString(),
    }
  }

  const leitor = new NDEFReader()
  const abortador = new AbortController()
  const expirou = setTimeout(() => abortador.abort(new DOMException('tempo esgotado', 'AbortError')), tempoLimiteMs)
  opcoes.sinal?.addEventListener('abort', () => abortador.abort(), { once: true })

  try {
    await leitor.scan({ signal: abortador.signal })
    const uid = await new Promise<string>((resolver, rejeitar) => {
      leitor.onreading = (evento) => resolver(evento.serialNumber)
      leitor.onreadingerror = () => rejeitar(new DOMException('falha ao decodificar a etiqueta', 'NotReadableError'))
      abortador.signal.addEventListener('abort', () => rejeitar(abortador.signal.reason), { once: true })
    })
    return { ...base, uidLido: uid, desfecho: 'SUCESSO', carimboCliente: new Date().toISOString() }
  } catch (erro) {
    const { desfecho, mensagem } = classificar(erro)
    return {
      ...base,
      uidLido: '',
      desfecho,
      mensagemErro: mensagem,
      carimboCliente: new Date().toISOString(),
    }
  } finally {
    clearTimeout(expirou)
    // Encerra a varredura. Sem isso o radio continua escaneando depois da
    // leitura, e cada toque em "conferir" empilha mais um NDEFReader ativo:
    // o Android passa a recusar novas varreduras e a bateria sofre.
    if (!abortador.signal.aborted) abortador.abort()
  }
}
