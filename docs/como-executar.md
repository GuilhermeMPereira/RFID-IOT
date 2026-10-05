# Como executar

## Pré-requisitos

Node.js 22 e um banco PostgreSQL. O banco pode ser local em contêiner
(`docker compose up -d banco`) ou hospedado de graça no Neon ou Supabase. Para
a conferência de verdade, um celular Android com NFC e Chrome 89 ou superior.

## Primeira vez

```bash
# 1. API
cd api
cp .env.example .env                    # cole aqui o DATABASE_URL
npm install
npx prisma migrate dev --name inicial   # cria as tabelas
npm run seed                            # auditor, 2 ambientes, 7 ativos

# 2. Cliente
cd ../web
cp .env.local.example .env.local        # normalmente não precisa editar
npm install
```

Login criado pelo seed: `auditor@impacta.edu.br` / `auditoria2026`.

## Toda vez

São dois processos. **Dois terminais, os dois abertos ao mesmo tempo.**

```bash
# terminal 1
cd api && npm run dev        # API ouvindo em :3333

# terminal 2
cd web && npm run dev        # cliente em :3000
```

Confira que a API respondeu abrindo `http://localhost:3333/saude`. Tem que
devolver `{"estado":"ok"}`. Se o login disser que não conseguiu falar com a
API, é esse terminal que caiu.

O cliente chama a API pelo caminho `/api`, servido pelo próprio Next, que
repassa para a porta 3333. Não há CORS e não é preciso configurar endereço.

## No celular

A Web NFC só existe em **contexto seguro**. `localhost` conta, mas o celular
não alcança o `localhost` da sua máquina — ali `localhost` é o próprio
aparelho. Então é preciso HTTPS.

Em um **terceiro terminal**:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Ele imprime uma URL `https://algo-aleatorio.trycloudflare.com`. Abra essa URL
no Chrome do celular. Um túnel só basta: as chamadas à API saem pelo mesmo
endereço da página.

A URL muda a cada execução do túnel, mas como nada no projeto depende dela,
não há o que reconfigurar.

## Ordem de uso

1. **`/etiquetas`** — para cada ativo, toque em "Ler e vincular" e encoste o
   aparelho na etiqueta que vai ficar nele. Sem esse vínculo, toda leitura
   posterior cai na categoria "não cadastrado".
2. **`/`** — escolha a modalidade e o ambiente, e abra o ciclo.
3. **`/conferencia`** — uma aproximação por bem. Ao final, "Apurar
   divergências".

## Executando uma bateria de ensaios

A condição experimental acompanha cada leitura até o banco, e é por ela que as
métricas são agrupadas. Antes de cada bateria, defina a condição em
`web/.env.local` e **reinicie** o `npm run dev`, porque variáveis
`NEXT_PUBLIC_*` são embutidas na compilação:

```
NEXT_PUBLIC_CONDICAO="aco-10mm-0g-online"
```

A nomenclatura e os fatores a variar estão em
[`protocolo-ensaios.md`](protocolo-ensaios.md).

Ao final de todas as baterias:

```bash
cd api && npm run metricas
```

Sai um CSV em `api/ensaios/dados/`, com uma linha por condição e as colunas das
métricas do Quadro 4 do artigo. É esse arquivo que alimenta a seção 4.3.

## Problemas conhecidos

| Sintoma | Causa |
|---------|-------|
| `ERR_CONNECTION_REFUSED` em :3333 | O terminal da API não está rodando |
| `Can't reach database server` | Banco fora do ar, ou `DATABASE_URL` errado |
| `@prisma/client did not initialize` | Falta rodar `npx prisma generate` |
| Aviso "navegador não expõe a Web NFC" no desktop | Esperado. Só Chrome para Android |
| Mesmo aviso no celular | A página não está em HTTPS. Use o túnel |
| Leitura some ao bloquear a tela | O Android corta o rádio. Mantenha a tela acesa |
| Toda leitura vira "não cadastrado" | As etiquetas não foram vinculadas em `/etiquetas` |
| Prisma Migrate falha no Neon | O endereço tem `-pooler`. Desligue o Connection pooling |
