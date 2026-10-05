# Auditoria e inventário de patrimônio por NFC

Protótipo do artigo **Tecnologias RFID/NFC e IoT aplicadas à auditoria e ao
inventário de patrimônio** — Faculdade Impacta de Tecnologia, 2026.

Sistema de auditoria patrimonial cuja captura de dados depende **exclusivamente
de software**: nenhum leitor dedicado, nenhum circuito montado. A leitura
acontece no rádio NFC do próprio smartphone do auditor, exposto ao navegador
pela interface Web NFC.

## Por que NFC e não RFID UHF

O RFID em frequência ultraelevada lê dezenas de etiquetas de um corredor
inteiro à distância. Isso é excelente para conferir saldo e inútil como
evidência de auditoria: capturar etiquetas de longe não comprova que alguém
inspecionou cada bem.

O NFC exige aproximação abaixo de 10 cm. O alcance curto, que a literatura
trata como limitação, é aqui a **garantia de que o auditor esteve fisicamente
diante do ativo**. E o leitor, que no UHF é um equipamento dedicado de custo
elevado, passa a ser o aparelho que o auditor já tem no bolso.

## Arquitetura

```
┌─ percepção física ──────────────────────────────────────────────┐
│  etiqueta NFC passiva NTAG213/215 · ISO/IEC 14443-A · 13,56 MHz │
│  smartphone Android 10+ · Chrome 89+ · antena NFC nativa        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ UID lido
┌─ aplicação (cliente) ────────▼──────────────────────────────────┐
│  PWA · TypeScript · React · Next.js                             │
│  Web NFC (NDEFReader) em contexto seguro HTTPS                  │
│  fila offline em IndexedDB · painel de conferência              │
└──────────────────────────────┬──────────────────────────────────┘
                               │ POST /leituras
┌─ serviço e persistência ─────▼──────────────────────────────────┐
│  API REST · Node.js · Express · PostgreSQL · Prisma             │
│  registros imutáveis · trilha de auditoria                      │
└─────────────────────────────────────────────────────────────────┘
```

## Decisão de projeto que atravessa o código

**Registro de leitura nunca é alterado.** Correção gera um novo registro; o
vínculo entre etiqueta e ativo é revogado, não editado. Isso não é preciosismo:
auditoria avalia a confiabilidade do processo que produziu a contagem, e um
registro editável não serve como evidência.

A consequência aparece em todo lugar — no `schema.prisma` sem campo de
atualização, no `revogadaEm` da etiqueta, na transação de encerramento.

## Rodando

```bash
docker compose up -d banco              # sobe só o PostgreSQL

cd api
cp .env.example .env                    # DATABASE_URL apontando para localhost
npm install
npx prisma migrate dev --name inicial   # cria as tabelas e gera o cliente
npm run seed                            # auditor, ambientes e ativos de ensaio
npm run dev

cd ../web && npm install && npm run dev
```

O `.env` importa: dentro do contêiner o host do banco é `banco`, mas quando a
API ou o script de ensaios rodam na sua máquina é `localhost`. Sem isso o
Prisma falha com `Can't reach database server`.

**Sem Docker?** Se `docker compose` reclamar que não encontra o daemon, o
Docker Desktop não está aberto. Abra e repita. Se o Docker não for uma opção na
sua máquina, crie um PostgreSQL gratuito em neon.com ou supabase.com e cole a
string de conexão no `DATABASE_URL`. O resto do projeto não muda.

A Web NFC exige **contexto seguro**. Em desenvolvimento, `localhost` conta como
seguro, mas o aparelho de teste precisa alcançar a máquina por HTTPS — use um
túnel ou um certificado local. Com `http://` em IP de rede, `NDEFReader` não
existe e a aplicação cai no aviso de navegador sem suporte.

## Ensaios

A instrumentação faz parte do produto, não é um apêndice. Toda tentativa de
leitura — inclusive as que falham — grava UID, desfecho, mensagem de erro,
carimbo de tempo do cliente e do servidor, aparelho e condição experimental.
São os seis dados previstos na subseção 3.6 do artigo.

```bash
# no cliente, define a condição experimental daquela bateria
cd web && NEXT_PUBLIC_CONDICAO=aco-10mm-0g-online npm run dev

# ao final, apura as métricas do Quadro 4 e exporta o CSV
cd api && npm run metricas              # usa o inventário mais recente
cd api && npm run metricas -- <id>      # ou um ciclo específico
```

A apuração roda de dentro de `api/`, que é onde o cliente do Prisma está
instalado. O CSV sai em `api/ensaios/dados/`.

O protocolo completo está em [`docs/protocolo-ensaios.md`](docs/protocolo-ensaios.md)
e os requisitos levantados, em [`docs/requisitos.md`](docs/requisitos.md).

## Limites conhecidos

- **Só Chrome para Android 89+.** A Web NFC não existe em iOS nem em desktop.
  Isso é restrição da plataforma, não escolha do projeto, e delimita o escopo.
- **Só NDEF.** A interface não expõe ISO-DEP nem operações de nível inferior.
  Para ler UID e registro NDEF, basta.
- **Rádio bloqueado com a tela apagada.** A conferência exige o aparelho
  desbloqueado e a aba em primeiro plano.
- **Não é mais rápido que o método manual.** O ganho é de confiabilidade e de
  evidência, não de velocidade bruta: mil bens continuam sendo mil
  aproximações.

## Autores

Amanda do Carmo Rodrigues da Costa, André Luiz Anastácio Neves,
Guilherme Pereira Martins, Júlia Oliveira de Miranda,
Pedro Henrique de Castro Tirado.

Orientador: Prof. Me. Gilberto Alves Pereira.
