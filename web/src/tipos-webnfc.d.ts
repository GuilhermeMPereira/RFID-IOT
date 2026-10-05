/**
 * A Web NFC ainda nao esta nos tipos padrao do TypeScript, porque e um draft
 * do WICG exposto apenas pelo Chrome para Android. Declaramos aqui o minimo
 * que a aplicacao usa.
 */
interface NDEFReadingEvent extends Event {
  serialNumber: string
  message: { records: ReadonlyArray<{ recordType: string; data?: DataView }> }
}

declare class NDEFReader {
  scan(opcoes?: { signal?: AbortSignal }): Promise<void>
  write(mensagem: unknown, opcoes?: { signal?: AbortSignal }): Promise<void>
  onreading: ((evento: NDEFReadingEvent) => void) | null
  onreadingerror: ((evento: Event) => void) | null
}
