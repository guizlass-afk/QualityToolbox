# Quality ToolBox

Aplicativo estático de ferramentas da qualidade, criado na pasta compartilhada `Z:\Projetos\Quality Toolbox` (UNC: `\\192.168.15.73\Users\guizl_rede\compartilhamento\Projetos\Quality Toolbox`). Este é o checkout canônico: editar diretamente aqui.

Site: https://guizlass-afk.github.io/QualityToolbox/
Portal: https://guizlass-afk.github.io/FactoryToolbox/

## Ferramentas

- **PPAP**: lista editável de 18 elementos, aplicabilidade, situação, evidências, responsável e prazo; percentual concluído entre os elementos aplicáveis.
- **APQP**: cinco fases, entregas, datas, responsáveis, evidências e acompanhamento de conclusão.
- **DFMEA / PFMEA**: função, requisito, modo de falha, efeito, causa, controles, S/O/D, NPR, ações e reavaliação. NPR calculado antes/depois. Prioridade de Ação (AP) registrada manualmente, separadamente do NPR, com justificativa.
- **Plano de Controle**: processo e referência PFMEA, operação, equipamento, característica, classificação, especificação, método de medição, instrumento, amostra, frequência, controle e reação.
- **Fluxo de Processo**: etapas, tipo, entradas, saídas, responsáveis e referência à próxima etapa ou ramificação.
- **CEP / SPC**: medições individuais em ordem temporal, cartas I-MR, média, MR médio, sigma estimado, Cp/Cpk e Pp/Ppk. Aceita colagem de uma coluna do Excel e até 500 observações.
- **MSA**: R&R cruzado balanceado por ANOVA de efeitos aleatórios; 2–30 peças, 2–5 operadores e 2–5 repetições, nomes dos operadores, dados brutos e resultados. Aceita colagem de matriz do Excel.
- **5 Porquês**: problema, cadeia de perguntas, respostas, evidências, causa raiz, ação e verificação de eficácia; é possível adicionar mais níveis.
- **Ishikawa**: seis categorias (6M), hipóteses, evidências, validação, ações e diagrama de apoio. A tabela preserva o texto integral; o diagrama resume as primeiras três causas de cada categoria.

## Projeto e exportação

Os dados ficam no navegador em `qualitytoolbox-project-v1`. O salvamento JSON permite transferir um projeto entre computadores e manter cópias. O arquivo importado é validado antes da substituição. Não há upload nem servidor de dados.

**Excel desta ferramenta** exporta o modelo atual. **Exportar tudo** cria um XLSX com uma capa e todas as ferramentas: 14 abas no total, incluindo três abas auxiliares do MSA (`MSA Data`, `MSA Means`, `MSA Factors`). Entradas são azuis e fórmulas verdes; números, datas e identificadores são gravados com tipos apropriados. Textos do usuário nunca são convertidos em fórmulas.

As células calculadas contêm fórmulas Excel reais, resultados em cache e solicitação de recálculo ao abrir. As fórmulas continuam funcionando ao editar as entradas do estudo exportado. Para alterar a quantidade de peças, operadores, repetições ou linhas, ajuste o modelo no aplicativo e exporte novamente: a estrutura do estudo exportado não se redimensiona sozinha.

O Excel exporta os dados e tabelas de cálculo. Os diagramas de apoio e as cartas SVG são exibidos no aplicativo; não são gráficos nativos editáveis no Excel.

## Métodos

Modelos de trabalho independentes, não formulários oficiais licenciados nem certificação de conformidade. Registre norma, edição e requisitos específicos nos dados do projeto. Preenchimento não é aprovação PPAP.

- FMEA: notas inteiras 1–10; NPR = S × O × D. A AP AIAG-VDA não é obtida por corte de NPR. O usuário a registra com base na tabela adotada; o aplicativo não reproduz as tabelas normativas nem implementa automaticamente os sete passos completos do manual AIAG-VDA.
- CEP: MR entre observações consecutivas; sigma = MR médio / 1,128; limites individuais média ± 3 sigma; MR superior = 3,267 × MR médio e inferior = 0. Limites estimados da série atual (fase de estudo); sinalização apenas de pontos fora dos limites. Sem testes de normalidade nem regras adicionais de sequência. Lacunas internas bloqueiam o cálculo I-MR. Capacidade bilateral requer LSE > LIE; Cp/Cpk usam sigma intraprocesso e Pp/Ppk o desvio amostral. Supõem estabilidade, independência e normalidade aproximada. Menos de 50 medições recebe indicação de estimativa preliminar.
- MSA: desenho completo cruzado e balanceado, com interação peça × operador mantida (sem pooling nem seleção por p-valor). Componentes: repetibilidade = MS erro; operador = max(0, (MS operador − MS interação)/(peças × repetições)); interação = max(0, (MS interação − MS erro)/repetições); peça = max(0, (MS peça − MS interação)/(operadores × repetições)). Reprodutibilidade soma operador e interação; R&R soma repetibilidade e reprodutibilidade. Variação de estudo = 6 sigma; contribuição = razão de variâncias; percentual de estudo = razão de desvios; ndc = floor(1,41 × sigma peça / sigma R&R). Divisões por zero ficam sem resultado, não como aprovação automática. Não inclui estudos de viés, linearidade, estabilidade ou concordância de atributos.

Referências: [AIAG Core Tools](https://www.aiag.org/expertise-areas/quality/quality-core-tools), [NIST I-MR](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm), [NIST Capability](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm), [NIST Gauge R&R](https://www.itl.nist.gov/div898/handbook/mpc/section4/mpc4.htm).

## Idiomas e aparência

Português, inglês, espanhol, chinês, hindi, árabe, francês, bengali, russo, alemão, italiano e japonês. Os 213 textos de cada idioma estão em `locales/` e no bundle local `i18n.js`. Árabe utiliza RTL. Tema claro/escuro compartilha a preferência `factorytoolbox-theme` do portal; idioma usa `qualitytoolbox-language`. Não depende de tradução remota.

## Desenvolvimento e validação

Sem build de aplicação. Sirva esta pasta com `python -m http.server 8080`.

- `python tests/test_quality.py`: navegador Chrome/Playwright, cálculos conhecidos, entradas inválidas, importação, colagem, persistência, exportações, 12 idiomas e telas de 320 a 1440 px.
- `powershell -NoProfile -ExecutionPolicy Bypass -File tests/test_excel.ps1`: requer Microsoft Excel no Windows. Abre uma instância invisível separada, recalcula as planilhas de teste temporárias, compara 153 resultados e verifica a atualização após editar entradas de FMEA, CEP e MSA. Fecha a própria instância ao terminar.
- As evidências de teste são gravadas em `%TEMP%\quality-toolbox-tests`, fora do repositório.
- Após editar dicionários, execute `python tests/build_i18n.py` para reconstruir o bundle e verificar a paridade das chaves.

## Licenciamento

Código próprio com todos os direitos reservados, conforme `LICENSE`. A biblioteca ExcelJS 4.4.0 é distribuída localmente em `vendor/`, com sua licença MIT preservada em `vendor/EXCELJS-LICENSE.txt`. As licenças de terceiros não são substituídas pela licença do projeto.
