'use client'

import { useEffect, useState } from 'react'
import { lerEtiqueta, suportaWebNfc, type Tentativa } from '@/lib/nfc'
import { enfileirar, totalPendentes } from '@/lib/fila'
import { sincronizar } from '@/lib/sincronizacao'

type Props = { inventarioId: string; ambienteId: string; token: string }

/**
 * Painel de conferencia.
 *
 * Confronta em tempo real a lista de ativos esperados no ambiente com os
 * efetivamente lidos. A leitura so comeca apos um toque, porque a Web NFC
 * exige gesto explicito do usuario para conceder a permissao.
 */
export default function Conferencia({ inventarioId, ambienteId, token }: Props) {
  const [lendo, setLendo] = useState(false)
  const [tentativas, setTentativas] = useState<Tentativa[]>([])
  const [naFila, setNaFila] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!suportaWebNfc()) {
      setAviso('Este navegador nao expoe a Web NFC. Use o Chrome para Android 89 ou superior.')
    }
    totalPendentes().then(setNaFila)
  }, [])

  useEffect(() => {
    const aoReconectar = () => {
      sincronizar(token)
        .then(async (r) => {
          if (r) setAviso(`${r.persistidas} leituras sincronizadas, ${r.duplicadasIgnoradas} ja constavam.`)
          setNaFila(await totalPendentes())
        })
        .catch((e) => setAviso(e.message))
    }
    window.addEventListener('online', aoReconectar)
    return () => window.removeEventListener('online', aoReconectar)
  }, [token])

  async function conferir() {
    setLendo(true)
    setAviso(null)
    const tentativa = await lerEtiqueta({ condicaoEnsaio: process.env.NEXT_PUBLIC_CONDICAO })
    setTentativas((anteriores) => [tentativa, ...anteriores])
    await enfileirar({ ...tentativa, inventarioId, ambienteId })
    setNaFila(await totalPendentes())

    if (tentativa.desfecho !== 'SUCESSO') {
      setAviso(
        tentativa.desfecho === 'TEMPO_ESGOTADO'
          ? 'A etiqueta nao respondeu. Aproxime mais o aparelho ou reposicione sobre a etiqueta.'
          : `Falha na interface: ${tentativa.mensagemErro}`,
      )
    } else if (navigator.onLine) {
      try {
        await sincronizar(token)
        setNaFila(await totalPendentes())
      } catch {
        setAviso('Leitura guardada. Sera enviada quando a rede voltar.')
      }
    }
    setLendo(false)
  }

  const sucessos = tentativas.filter((t) => t.desfecho === 'SUCESSO').length

  return (
    <main>
      <h1>Conferencia</h1>
      <p>
        {sucessos} de {tentativas.length} tentativas com sucesso
        {naFila > 0 && ` - ${naFila} aguardando envio`}
      </p>

      <button onClick={conferir} disabled={lendo}>
        {lendo ? 'Aproxime o aparelho da etiqueta' : 'Conferir proximo bem'}
      </button>

      {aviso && <p role="status">{aviso}</p>}

      <ol>
        {tentativas.map((t) => (
          <li key={t.chaveIdempotencia}>
            <code>{t.uidLido || '-'}</code> - {t.desfecho} -{' '}
            {new Date(t.carimboCliente).toLocaleTimeString('pt-BR')}
          </li>
        ))}
      </ol>
    </main>
  )
}
