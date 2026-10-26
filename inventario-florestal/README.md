# Plataforma Web de Inventário Florestal | ESALQ/USP — CMQ

Aplicação web responsiva e offline-first desenvolvida para as atividades práticas e didáticas da disciplina **LCF0510 - Inventário Florestal** da **Escola Superior de Agricultura Luiz de Queiroz (ESALQ/USP)**, com desenvolvimento atribuído ao **CMQ — Centro de Métodos Quantitativos**.

- **Disciplina:** LCF0510 - Inventário Florestal
- **Professores:** Matheus Pinheiro Ferreira e Jonathan Trautenmüller
- **Monitor:** Matheus Siqueira Barros
- **Estrutura:** Inventários da disciplina (`Inventário ESALQ — Fazenda Areão`), com cadastro de Grupos de alunos, alocação de parcelas identificadas por código, nome e inventariante, dashboard estatístico atribuído por grupo e download de CSV unificado com todas as parcelas e medições de cada grupo.

---

## 1. Visão Geral e Objetivos

A plataforma apoia estudantes, professores e monitores em trabalhos de campo e aulas práticas, permitindo:
- Registro ágil de árvores e espécies em parcelas amostrais.
- Medição e validação de Circunferência à Altura do Peito (CAP em cm).
- Cálculo dendrométrico instantâneo de Diâmetro à Altura do Peito (DAP em cm) e Área Transversal individual ($g$ em m²).
- Dimensionamento e cálculo de área para parcelas circulares ($πr²$ ou $πd²/4$) e retangulares ($C \times L$).
- Determinação da Área Basal total da parcela ($G = \sum g_i$) e Área Basal por hectare ($G/ha$).
- Cálculo de estatísticas descritivas com variância amostral ($s²$) calculada estritamente com denominador $n - 1$ (graus de liberdade).
- Análise de estrutura e dominância por espécie (com $G/ha$ da espécie referenciado à área total da parcela).
- Coleta de geolocalização opcional via GPS nativo do dispositivo (com estimativa de precisão $\pm m$ e altitude $H$).
- Persistência 100% local com **IndexedDB** e funcionamento offline como **Progressive Web App (PWA)**.
- Exportação de dados para CSV (compatível com Excel pt-BR, R, Python e SIG) e Backup completo em JSON.

---

## 2. Tecnologias Empregadas

- **HTML5 & CSS3:** Interface mobile-first de alto contraste, alvos de toque $\ge 44 \times 44\text{ px}$, sem rolagem horizontal obrigatória no celular.
- **Vanilla JavaScript & TypeScript:** Arquitetura modular sem frameworks pesados de interface (sem React/Vue/Angular em tempo de execução).
- **IndexedDB:** Banco de dados relacional client-side para armazenamento local, preservando dados entre sessões.
- **Service Worker & Web App Manifest:** PWA instalável com suporte total a coleta em locais sem conectividade celular.
- **API Geolocation Nativa:** Captura de coordenadas geográficas (WGS84 / SIRGAS 2000).

---

## 3. Fórmulas Dendrométricas e Estatísticas Implementadas

### 3.1 DAP (Diâmetro à Altura do Peito)
$$\text{DAP (cm)} = \frac{\text{CAP (cm)}}{\pi}$$

### 3.2 Área Transversal Individual ($g$)
$$g\text{ (m²)} = \frac{\pi \times \text{DAP}^2}{40.000} = \frac{\text{CAP}^2}{40.000 \times \pi}$$
*Nota:* O divisor 40.000 decorre da conversão de raio para diâmetro $((2 \times 100)^2 = 40.000)$ e de cm² para m². Os cálculos internos utilizam precisão de ponto flutuante sem arredondamento intermediário.

### 3.3 Área da Parcela Amostral
- **Circular (Raio $r$ em metros):** $\text{Área (m²)} = \pi \times r^2$
- **Circular (Diâmetro $d$ em metros):** $\text{Área (m²)} = \frac{\pi \times d^2}{4}$
- **Retangular (Comprimento $C$ e Largura $L$ em metros):** $\text{Área (m²)} = C \times L$
- **Conversão para hectares:** $\text{Área (ha)} = \frac{\text{Área (m²)}}{10.000}$

### 3.4 Área Basal da Parcela ($G$) e por Hectare ($G/ha$)
$$G_{\text{parcela}}\text{ (m²)} = \sum_{i=1}^{n} g_i$$
$$G_{\text{ha}}\text{ (m²/ha)} = \frac{G_{\text{parcela}}}{\text{Área da Parcela (ha)}}$$

### 3.5 Estatísticas Descritivas do DAP
- **Média Aritmética:** $\bar{x} = \frac{\sum \text{DAP}_i}{n}$
- **Variância Amostral ($s²$):** $s^2 = \frac{\sum (\text{DAP}_i - \bar{x})^2}{n - 1}$
- **Desvio Padrão Amostral ($s$):** $s = \sqrt{s^2}$
- **Mediana:** Elemento central ordenado (para $n$ ímpar) ou média aritmética dos dois valores centrais (para $n$ par).
- **Regras Estritas para $n$:**
  - $n = 0$: Média, mediana, variância e desvio padrão não calculáveis.
  - $n = 1$: Média e mediana válidas; variância e desvio padrão declarados indisponíveis ($n - 1 = 0$).
  - $n \ge 2$: Estatísticas completas estimáveis.

### 3.6 Resumo por Espécie
A área basal por hectare atribuída a cada espécie é obtida por:
$$G_{\text{ha, espécie}} = \frac{\sum g_{\text{espécie}}}{\text{Área Total da Parcela (ha)}}$$
*(A área total da parcela amostrada é utilizada como denominador).*

---

## 4. Dicionário de Campos Exportados (CSV)

### 4.1 Árvores Individuais (`arvores_individuais.csv`)
| Campo | Descrição | Unidade / Formato |
|---|---|---|
| `ID_Inventario` | Identificador único do inventário | Texto |
| `Nome_Inventario` | Nome do projeto/atividade | Texto |
| `Turma_Grupo` | Turma acadêmica ou equipe de campo | Texto |
| `Data_Inventario` | Data do inventário | AAAA-MM-DD |
| `Responsavel` | Aluno/Professor/Monitor responsável | Texto |
| `ID_Parcela` | Identificador único da parcela | Texto |
| `Codigo_Parcela` | Código visível da parcela (ex: P01, P02) | Texto |
| `Formato_Parcela` | Formato da parcela | circular / retangular |
| `Dimensoes_Descricao`| Especificação das dimensões | Texto (ex: raio=12.62m) |
| `Area_Parcela_m2` | Área calculada da parcela | m² |
| `Area_Parcela_ha` | Área calculada em hectares | ha |
| `Status_Parcela` | Estado da coleta | nao_iniciada / em_andamento / concluida |
| `ID_Arvore` | Identificador interno da árvore | Texto |
| `Numero_Arvore` | Número de identificação sequencial | Inteiro ou Texto |
| `Especie` | Nome científico ou comum da espécie | Texto ("Não identificada" se vazio) |
| `CAP_cm` | Circunferência à altura do peito | cm |
| `DAP_cm` | Diâmetro à altura do peito ($CAP/\pi$) | cm |
| `Area_Transversal_g_m2` | Área transversal individual | m² |
| `Status_Medicao` | Validade da medição | valida / incompleta / invalida |
| `Motivo_Invalido` | Causa de rejeição ou observação | Texto |
| `Observacoes_Arvore` | Notas sobre defeitos, fuste ou bifurcação | Texto |
| `Coord_Tipo` | Método de posicionamento | centro / cantos / manual |
| `Latitude` | Latitude geográfica (WGS84) | Graus decimais |
| `Longitude` | Longitude geográfica (WGS84) | Graus decimais |
| `Altitude_H_m` | Altitude elipsoidal/ortométrica | metros |
| `Precisao_GPS_m` | Precisão horizontal estimada pelo sensor | metros |
| `DataHora_GPS` | Carimbo de data/hora do sinal GPS | ISO 8601 |

### 4.2 Resumo por Parcela (`resumo_parcelas.csv`)
Contém indicadores consolidados: Código, Formato, Dimensões, Área m², Área ha, Total de Árvores, Árvores Válidas ($n$), CAP médio, DAP médio, DAP mediano, Variância amostral ($s²$), Desvio padrão amostral ($s$), DAP mínimo, DAP máximo, Área Basal total ($G$) e $G/ha$.

---

## 5. Como Executar Localmente

### Pré-requisitos
- Node.js (versão 18 ou superior) ou Bun.

### Instalação
```bash
# Clone ou acesse o diretório do projeto
cd /app/applet

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento na porta 3000
npm run dev
```

Acesse no navegador: `http://localhost:3000`

### Como Rodar a Verificação de Tipos e Testes
```bash
# Validação estática de tipos TypeScript
npm run lint

# Compilação de produção
npm run build
```

Na própria interface web, acesse a aba **"Testes"** para executar a auditoria interativa dos 20 requisitos matemáticos obrigatórios com detalhamento de valores esperados e obtidos.

---

## 6. Publicação em Hospedagem Estática com HTTPS

Como a aplicação é 100% client-side (HTML5, CSS3, Vanilla JS/TS e IndexedDB), ela pode ser hospedada em qualquer serviço de arquivos estáticos moderno que forneça **HTTPS** (obrigatório para a API nativa de Geolocalização e Service Worker PWA):

1. **Gere a pasta de produção:**
   ```bash
   npm run build
   ```
   Os arquivos compilados estarão na pasta `dist/`.

2. **Opções de Hospedagem:**
   - **GitHub Pages:** Ative o GitHub Pages apontando para o diretório `dist` ou via GitHub Actions.
   - **Vercel / Netlify / Cloudflare Pages:** Conecte o repositório; o comando de build é `npm run build` e o diretório de saída é `dist`.
   - **Google Cloud Storage / Firebase Hosting:**
     ```bash
     firebase deploy --only hosting
     ```

---

## 7. Limitações Conhecidas

1. **Acurácia do GPS sob Dossel:** A recepção de satélites GNSS pode sofrer interferências ou imprecisões significativas (acima de 10–20 metros) em florestas com cobertura de copa muito fechada. Recomenda-se registrar em clareiras ou utilizar marcos topográficos com coordenadas inseridas manualmente.
2. **Altitude pelo Sensor Móvel:** Dispositivos móveis de entrada nem sempre fornecem altitude precisa via sensor barométrico; quando indisponível pelo hardware, a aplicação permite inserção manual com unidade explícita.
3. **Persistência Local do Navegador:** Os dados ficam armazenados no IndexedDB do navegador do dispositivo. Para evitar perda acidental (ex: limpeza de cookies ou troca de aparelho), utilize regularmente o botão **"Exportar / Backup (JSON)"**.
4. **Método de Amostragem:** Nesta versão, a seleção do método amostral (AAS, Sistemática, Estratificada) é de caráter informativo e organizador. Estimativas com erros amostrais populacionais complexos podem ser integradas em versões futuras.
