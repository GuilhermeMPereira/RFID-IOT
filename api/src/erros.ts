/**
 * Erro de regra de negocio, com o codigo HTTP que lhe corresponde.
 *
 * Existe para que os servicos possam recusar uma operacao sem conhecer o
 * Express: o tratador registrado em servidor.ts traduz o erro em resposta.
 * No Express 5 a rejeicao de um handler assincrono chega sozinha ao tratador,
 * entao nao e preciso try/catch em cada rota.
 */
export class ErroDeRegra extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem)
    this.name = 'ErroDeRegra'
  }
}
