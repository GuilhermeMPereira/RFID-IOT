/**
 * Declaracao minima de bcryptjs, pelo mesmo motivo de
 * tipos-jsonwebtoken.d.ts: o pacote nao embarca tipos e o ambiente nao tem
 * rede para buscar @types/bcryptjs.
 */
declare module 'bcryptjs' {
  export function hash(dado: string, custo: number): Promise<string>
  export function compare(dado: string, hash: string): Promise<boolean>
  const bcrypt: { hash: typeof hash; compare: typeof compare }
  export default bcrypt
}
