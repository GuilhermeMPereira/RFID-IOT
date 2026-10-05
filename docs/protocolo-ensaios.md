# Protocolo de ensaios

Operacionaliza a subseção 3.6 do artigo. Cada condição experimental é informada
à aplicação pela variável `NEXT_PUBLIC_CONDICAO` e acompanha cada leitura até o
banco, de modo que a apuração por condição seja automática.

## Fatores variados

| Fator | Níveis |
|-------|--------|
| Substrato de fixação | madeira, plástico, aço pintado, próximo a eletrônico energizado |
| Distância | 0, 5, 10, 15, 20 mm (gabarito graduado) |
| Ângulo de aproximação | 0°, 45°, 90° |
| Modelo de aparelho | conjunto de teste (mínimo três modelos) |
| Conectividade | com rede, sem rede |

Nomenclatura da condição: `substrato-distancia-angulo-rede`,
por exemplo `aco-10mm-0g-offline`.

## Execução

1. Subir o ambiente: `docker compose up -d`
2. Cadastrar ativos e vincular etiquetas pelo painel
3. Abrir um inventário por bateria de ensaios
4. Para cada condição, definir `NEXT_PUBLIC_CONDICAO` e executar as repetições
5. Ao final, apurar: `npx tsx ensaios/metricas.ts <inventarioId>`

## Ensaio de integridade offline

Executado à parte, para a métrica de integridade dos registros:

1. Colocar o aparelho em modo avião
2. Executar N leituras (registrar N manualmente)
3. Restaurar a rede e aguardar a sincronização
4. Conferir `persistidas + duplicadasIgnoradas` contra N
5. Repetir forçando queda no meio da sincronização, para verificar que o
   reenvio não duplica registros
