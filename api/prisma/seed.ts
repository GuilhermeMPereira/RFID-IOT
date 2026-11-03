/**
 * Popula o banco com um conjunto minimo para a primeira conferencia:
 * um auditor, dois ambientes e os ativos que receberao etiqueta.
 *
 * Os ativos cobrem os quatro substratos previstos no protocolo de ensaios
 * (madeira, plastico, aco pintado e proximo a eletronico energizado), porque
 * a sensibilidade do acoplamento indutivo ao substrato e justamente o que os
 * ensaios precisam medir.
 *
 * Uso: npm run seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const AMBIENTES = [
  { codigo: 'LAB-01', nome: 'Laboratorio de bancada' },
  { codigo: 'DEP-01', nome: 'Deposito sem cobertura de rede' },
]

const ATIVOS = [
  { tombamento: '000101', descricao: 'Mesa de madeira (substrato: madeira)', ambiente: 'LAB-01' },
  { tombamento: '000102', descricao: 'Gaveteiro plastico (substrato: plastico)', ambiente: 'LAB-01' },
  { tombamento: '000103', descricao: 'Armario de aco pintado (substrato: aco)', ambiente: 'LAB-01' },
  { tombamento: '000104', descricao: 'Monitor ligado (substrato: proximo a eletronico)', ambiente: 'LAB-01' },
  { tombamento: '000105', descricao: 'Cadeira de escritorio', ambiente: 'LAB-01' },
  { tombamento: '000201', descricao: 'Estante metalica', ambiente: 'DEP-01' },
  { tombamento: '000202', descricao: 'Caixa plastica empilhavel', ambiente: 'DEP-01' },
]

async function principal() {
  const auditor = await prisma.auditor.upsert({
    where: { email: 'auditor@impacta.edu.br' },
    update: {},
    create: {
      nome: 'Auditor de ensaios',
      email: 'auditor@impacta.edu.br',
      senhaHash: await bcrypt.hash('auditoria2026', 10),
      perfil: 'GESTOR',
    },
  })

  const porCodigo = new Map<string, string>()
  for (const a of AMBIENTES) {
    const criado = await prisma.ambiente.upsert({
      where: { codigo: a.codigo },
      update: {},
      create: a,
    })
    porCodigo.set(a.codigo, criado.id)
  }

  for (const a of ATIVOS) {
    await prisma.ativo.upsert({
      where: { tombamento: a.tombamento },
      update: {},
      create: {
        tombamento: a.tombamento,
        descricao: a.descricao,
        ambienteId: porCodigo.get(a.ambiente)!,
      },
    })
  }

  console.log('Banco populado.\n')
  console.log(`  auditor : ${auditor.email}`)
  console.log('  senha   : auditoria2026')
  console.log(`  ambientes: ${AMBIENTES.map((a) => a.codigo).join(', ')}`)
  console.log(`  ativos   : ${ATIVOS.length}\n`)
  console.log('As etiquetas ainda nao estao vinculadas. Vincule cada UID a um ativo')
  console.log('pelo painel, ou por POST /ativos/{id}/etiquetas, antes de conferir.')
}

principal()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    await prisma.$disconnect()
    console.error(erro?.message ?? erro)
    process.exitCode = 1
  })
