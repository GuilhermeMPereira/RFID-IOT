# Protocolo de ensaios

Operacionaliza a subseção 3.6 do artigo. A condição experimental é escolhida
no seletor no alto da tela `/conferencia`, acompanha cada leitura até o banco
e é por ela que `npm run metricas` agrupa os resultados. Não é preciso
reiniciar nem recompilar nada ao trocar de condição.

## Conjunto de referência

Sete bens, criados por `npm run seed`, cada um com uma etiqueta adesiva
de 25 mm compatível com NTAG213 — ISO/IEC 14443-3A, NFC Forum Type 2, 144
bytes de memória de usuário, UID de 7 bytes — colada em local visível e plano.
O fornecedor declara alcance máximo de leitura de 7 cm; a varredura de
distância abaixo verifica esse valor por substrato. Só o UID
é usado: o vínculo com o bem vive no banco, e nada é gravado na etiqueta. Quatro deles existem para
cobrir os substratos que o acoplamento indutivo distingue; os outros três
compõem a lista esperada do ciclo, de modo que a apuração de divergências
tenha com o que trabalhar.

| Tombamento | Bem | Substrato | Ambiente |
|------------|-----|-----------|----------|
| 000101 | Mesa | madeira | LAB-01 |
| 000102 | Gaveteiro | plástico | LAB-01 |
| 000103 | Armário | aço pintado | LAB-01 |
| 000104 | Monitor ligado | próximo a eletrônico energizado | LAB-01 |
| 000105 | Cadeira de escritório | plástico | LAB-01 |
| 000201 | Estante metálica | aço | DEP-01 |
| 000202 | Caixa plástica | plástico | DEP-01 |

Instrumentos: gabarito de acrílico graduado em milímetros para fixar a
distância entre o aparelho e a etiqueta, transferidor para o ângulo, e
cronômetro apenas como conferência — o tempo que entra nas métricas é o
carimbo registrado pela própria aplicação.

## Conjunto de aparelhos

Mínimo de três modelos distintos de Android com NFC e Chrome 89 ou superior,
de fabricantes diferentes, porque a posição da antena e a implementação da
pilha NFC variam por fabricante. Cada aparelho executa o roteiro completo.

## Condições e repetições

Dez condições, 30 repetições cada, por aparelho. Trinta repetições por
condição permitem estimar a taxa de sucesso com erro padrão abaixo de 10
pontos percentuais no pior caso (p = 0,5), suficiente para separar uma
condição que falha de uma que não falha, que é a pergunta do ensaio.

| Condição (seletor) | Bem | Distância | Ângulo | Rede |
|--------------------|-----|-----------|--------|------|
| `madeira-0mm-0g` | 000101 | 0 mm | 0° | com |
| `madeira-10mm-0g` | 000101 | 10 mm | 0° | com |
| `plastico-0mm-0g` | 000102 | 0 mm | 0° | com |
| `plastico-10mm-0g` | 000102 | 10 mm | 0° | com |
| `aco-0mm-0g` | 000103 | 0 mm | 0° | com |
| `aco-10mm-0g` | 000103 | 10 mm | 0° | com |
| `eletronico-0mm` | 000104 | 0 mm | 0° | com |
| `angulo-45g` | 000101 | 0 mm | 45° | com |
| `angulo-90g` | 000101 | 0 mm | 90° | com |
| `sem-rede` | 000101 | 0 mm | 0° | sem |

São 300 tentativas por aparelho e 900 no conjunto de três. A bateria completa
de um aparelho leva em torno de uma hora.

## Passos

1. Subir a API e o cliente, e abrir o cliente no celular pelo túnel HTTPS
   (ver [`como-executar.md`](como-executar.md)).
2. Em `/ativos`, conferir que os sete bens estão cadastrados com a lotação
   correta. Em `/etiquetas`, vincular a etiqueta de cada um.
3. Localizar a antena do aparelho com uma etiqueta conhecida antes de
   começar, e marcar a posição com fita. A antena fica em geral no terço
   superior do verso, mas varia por modelo.
4. Em `/`, abrir **um** ciclo de inventário por aparelho, modalidade
   Eventual, ambiente LAB-01. Anotar o identificador do ciclo.
5. Em `/conferencia`, selecionar a primeira condição.
6. Posicionar o aparelho no gabarito, na distância e no ângulo da condição,
   tocar em "Conferir próximo bem" e aproximar. Repetir 30 vezes, afastando o
   aparelho do gabarito entre uma tentativa e outra, para que cada repetição
   seja uma aproximação completa e não uma leitura contínua.
7. Trocar a condição no seletor e repetir o passo 6, até as dez condições.
   Na condição `sem-rede`, colocar o aparelho em modo avião antes e restaurar
   a rede ao final, conferindo que a fila subiu.
8. Encerrar o ciclo em "Encerrar ciclo". O encerramento consolida o resultado
   e impede leitura posterior, de modo que a apuração seja sobre um conjunto
   fechado.
9. Repetir os passos 4 a 8 nos demais aparelhos.
10. Apurar: `cd api && npm run metricas -- <id do ciclo>`. O CSV sai em
    `api/ensaios/dados/`, com uma linha por condição.

## Distância máxima efetiva

Medida à parte, porque exige varredura e não repetição em ponto fixo. Para
cada substrato, com o ângulo em 0°: 10 leituras a 0 mm, depois a 5, 10, 15 e
20 mm. A distância máxima efetiva é o maior passo em que a taxa de sucesso se
mantém em 95% ou mais. Usar a condição `<substrato>-<distância>mm-0g` para
que os passos fiquem separados na apuração.

## Ensaio de integridade offline

Executado à parte, para a métrica de integridade dos registros:

1. Colocar o aparelho em modo avião.
2. Executar 30 leituras, contando-as manualmente.
3. Restaurar a rede e aguardar a sincronização.
4. Conferir `persistidas + duplicadasIgnoradas` contra 30, e conferir a
   contagem em `/trilha`.
5. Repetir forçando a queda no meio da sincronização, para verificar que o
   reenvio não duplica registros.
