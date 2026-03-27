# Manual do Usuário - Dashboard BI Casa Brasilis Marine

Bem-vindo à plataforma de Business Intelligence da Casa Brasilis Marine, gerida pela **Mendonça Galvão Contadores Associados**. 
Este sistema foi desenhado visando ser uma ferramenta executiva ágil, entregando clareza extrema sobre os fluxos operacionais (Gross Revenue) contra os encargos e custo dos produtos vendidos (CPV), fechando com a verdadeira margem líquida do seu negócio.

## 1. Como Acessar a Plataforma
A plataforma é inteiramente restrita aos associados e administradores. 
- O acesso só é concedido mediante possuir um e-mail do escopo `@mendoncagalvao.com.br`.
- Qualquer tentativa de utilizar uma conta Gmail, Yahoo, ou outros domínios corporativos será automaticamente rejeitada pelos nossos servidores de segurança.

## 2. Visão Geral: Análise Comparativa (Month-over-Month)
A tela principal do sistema não trabalha com métricas isoladas, mas sim em contexto **comparativo**.
No painel global superior, você visualizará dois seletores:
- **Mês Atual (Referência):** O mês que você deseja analisar prioritariamente.
- **Comparar Com:** A base referencial histórica da qual deseja extrair as setas de crescimento (trendlines).
**Nota:** Caso compare o "Mês Fechado" com a métrica de "Saldo Acumulado (YTD)", certas margens de % demonstrarão o impacto do mês sobre o ano todo.

### 2.1 Cards de KPI's Dinâmicos
Os resumos em tarjetas da tela inicial (Receita Bruta, CPV, Despesas Operacionais e Lucro Líquido) exibem não só o montante bruto faturado (`R$ 00,00`), mas também o `Delta de Crescimento`.
- **Setas Verdes:** Indicadores positivos (se foi no Lucro, significa ganho extra, se foi no Custo, significa diminuição/economia frente ao mês base).
- **Setas Vermelhas:** Indicadores de Alerta (Ocorrência onde o gasto excedeu o mês passado, ou a receita tombou).

## 3. Gráficos de Tendência
A plataforma seccionou a visão gráfica em duas áreas de altíssimo valor de auditoria:
1. **Curva de Evolução temporal:** As linhas coloridas no gráfico esquerdo traçam a esteira contínua entre todos os meses disponíveis no banco. A linha Exclusiva Pontilhada Azul reflete a variação da sub-Métrica (O `%` percentual puro da margem, em escala da direita).
2. **Rosca de Composição (Donut Chart):** Demonstra instantaneamente para onde a sua Receita está indo (Fatia do ICMS, PIS, COFINS, e Custos fixos). Passar o cursor acima exibe valores exatos contábeis.

## 4. Auditoria Detail-Level (Drill-down D.R.E. Table)
Abaixo dos gráficos, a tabela analítica é 100% expansível. 
Contas condensadas (como `(=) Lucro Bruto` ou `(-) Deduções da Receita Bruta`) possuem setas ao lado do título. Clicando, você pode "abrir" e fatiar a métrica em impostos granulares ou custos centavos-por-centavos vindos diretamente da planilha base contábil matriz.
