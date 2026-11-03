/**
 * Declaracao minima de jsonwebtoken.
 *
 * O pacote nao embarca tipos e o ambiente de desenvolvimento usado aqui nao
 * tem rede para baixar @types/jsonwebtoken. Declarar apenas o que o projeto
 * usa e preferivel a `declare module` vazio, que apagaria a verificacao
 * estatica justamente na emissao e na conferencia da credencial de sessao.
 */
declare module 'jsonwebtoken' {
  export type Payload = Record<string, unknown>
  export interface OpcoesAssinatura {
    expiresIn?: string | number
  }
  export function sign(payload: Payload, segredo: string, opcoes?: OpcoesAssinatura): string
  export function verify(token: string, segredo: string): Payload
  const jwt: { sign: typeof sign; verify: typeof verify }
  export default jwt
}
