# Requisitos da solução

Levantados a partir do procedimento de inventário previsto na Instrução Normativa
SEDAP nº 205/1988 e da distinção entre inventário e auditoria discutida na seção 2.1
do artigo.

## Requisitos funcionais

| ID | Requisito | Origem |
|----|-----------|--------|
| RF01 | Autenticar o auditor e manter sessão identificada durante a conferência | Trilha de auditoria exige autoria da leitura |
| RF02 | Manter cadastro de ativos com identificação individualizada e lotação | IN 205/1988, art. 7 |
| RF03 | Associar o UID de uma etiqueta NFC a um ativo cadastrado | Vínculo etiqueta-ativo |
| RF04 | Abrir ciclo de inventário com escopo, modalidade e responsável | IN 205/1988, cinco modalidades |
| RF05 | Registrar leitura com UID, carimbo de tempo, auditor e ambiente | Evidência de presença física |
| RF06 | Acumular leituras localmente quando não houver rede e sincronizar depois | Depósitos e subsolos sem cobertura |
| RF07 | Deduplicar leituras na sincronização em lote | POST não é idempotente |
| RF08 | Apurar divergências em três categorias: não localizado, localizado em ambiente diverso, não cadastrado | Confronto esperado x lido |
| RF09 | Encerrar o ciclo tornando o resultado imutável | Natureza probatória |
| RF10 | Devolver a trilha de auditoria completa do ciclo | Auditoria avalia o processo, não só a contagem |

## Requisitos não funcionais

| ID | Requisito | Justificativa |
|----|-----------|---------------|
| RNF01 | Captura exclusivamente por software, sem hardware dedicado | Hipótese de viabilidade econômica |
| RNF02 | Execução em Chrome para Android 89+ sobre HTTPS | Restrição da Web NFC |
| RNF03 | Registros de leitura imutáveis; correção gera novo registro | Consistência da trilha |
| RNF04 | Atomicidade das transações de encerramento | Integridade do ciclo |
| RNF05 | Operação offline sem perda nem duplicação de registros | Métrica de integridade (Quadro 4) |
| RNF06 | Instrumentação de carimbos de tempo cliente e servidor | Métrica de latência (Quadro 4) |
| RNF07 | Registro do desfecho e da mensagem de erro de cada tentativa | Análise qualitativa dos modos de falha |
