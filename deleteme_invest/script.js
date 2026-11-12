const body = document.body;
const sidebar = document.querySelector("#sidebar");
const menuToggle = document.querySelector(".menu-toggle");
const themeToggle = document.querySelector("#themeToggle");
const helpToggle = document.querySelector("#helpToggle");
const helpMenu = document.querySelector("#helpMenu");
const accordionTrigger = document.querySelector(".accordion-trigger");
const supportList = document.querySelector("#support-list");

const savedTheme = localStorage.getItem("sibainvest-theme");
if (savedTheme === "dark") {
  body.classList.add("dark");
}

function setSidebarExpanded(expanded) {
  body.classList.remove("sidebar-hovered");
  body.classList.toggle("sidebar-collapsed", !expanded);
  menuToggle.setAttribute("aria-expanded", String(expanded));
}

function toggleSidebar() {
  setSidebarExpanded(body.classList.contains("sidebar-collapsed"));
}

menuToggle.addEventListener("click", toggleSidebar);

// Clicar fora da sidebar (estando expandida) recolhe — comportamento padrão
document.addEventListener("click", (e) => {
  if (body.classList.contains("sidebar-collapsed")) return; // já está compacta
  if (sidebar.contains(e.target) || menuToggle.contains(e.target)) return; // clique na sidebar ou no botão
  setSidebarExpanded(false);
});

sidebar.addEventListener("mouseenter", () => {
  if (body.classList.contains("sidebar-collapsed")) {
    body.classList.add("sidebar-hovered");
  }
});

sidebar.addEventListener("mouseleave", () => {
  body.classList.remove("sidebar-hovered");
});

document.querySelectorAll(".nav-link[href]").forEach((link) => {
  link.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      setSidebarExpanded(false);
    }
  });
});

document.querySelectorAll('.nav-link[aria-disabled="true"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
  });
});

themeToggle.addEventListener("click", () => {
  const dark = body.classList.toggle("dark");
  localStorage.setItem("sibainvest-theme", dark ? "dark" : "light");
});

function setHelpMenuOpen(open) {
  helpMenu.hidden = !open;
  helpToggle.setAttribute("aria-expanded", String(open));
}

helpToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  setHelpMenuOpen(helpMenu.hidden);
});

helpMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", () => {
  setHelpMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setHelpMenuOpen(false);
    helpToggle.focus();
  }
});

if (accordionTrigger && supportList) {
  accordionTrigger.addEventListener("click", () => {
    const expanded = accordionTrigger.getAttribute("aria-expanded") === "true";
    accordionTrigger.setAttribute("aria-expanded", String(!expanded));
    supportList.hidden = expanded;
  });
}

let _chartTooltipEl = null;
function getChartTooltip() {
  if (!_chartTooltipEl) {
    _chartTooltipEl = document.createElement("div");
    _chartTooltipEl.className = "chart-tooltip";
    _chartTooltipEl.hidden = true;
    document.body.appendChild(_chartTooltipEl);
  }
  return _chartTooltipEl;
}

// ── Compound SVG stacked bar chart ──────────────────────────────────────────

function fmtAxisCurrency(v) {
  if (v >= 1e6) return `R$${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (v >= 1e3) return `R$${Math.round(v / 1e3)}K`;
  return `R$${Math.round(v)}`;
}

function createCompoundSVGChart(monthlyRows, annualRows) {
  const useAnnual = monthlyRows.length > 24;
  const rows = useAnnual ? annualRows : monthlyRows;
  const periodLabel = useAnnual ? "Ano" : "Mês";
  const n = rows.length;
  if (n === 0) return "";

  const W = 760, H = 280;
  const pad = { t: 22, r: 24, b: 44, l: 88 };
  const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
  const baseY = pad.t + ph;
  const maxVal = Math.max(...rows.map((r) => r.balance), 1);

  const slotW = pw / n;
  const gap = Math.max(1, slotW * 0.18);
  const bw = Math.max(2, slotW - gap);

  const yTicks = Array.from({ length: 5 }, (_, k) => {
    const ratio = k / 4;
    const y = pad.t + ph - ratio * ph;
    return `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${W - pad.r}" y2="${y.toFixed(1)}" stroke="#d9e0e7" stroke-width="1" stroke-dasharray="3,3"/>
      <text x="${pad.l - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10">${fmtAxisCurrency(maxVal * ratio)}</text>`;
  }).join("");

  const labelStep = Math.max(1, Math.ceil(n / 8));
  const xTicks = rows.map((row, i) => {
    if (i !== 0 && i !== n - 1 && i % labelStep !== 0) return "";
    const cx = pad.l + (i + 0.5) * slotW;
    return `<text x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10">${periodLabel} ${row.period}</text>`;
  }).join("");

  const bars = rows.map((row, i) => {
    const totalInvested = row.invested + row.contribution * row.period;
    const prevInterest = row.totalInterest - row.periodInterest;
    const h_inv = (totalInvested / maxVal) * ph;
    const h_prev = (prevInterest / maxVal) * ph;
    const h_cur = (row.periodInterest / maxVal) * ph;
    const x = pad.l + i * slotW + gap / 2;
    const da = `data-period="${row.period}" data-balance="${row.balance}" data-invested="${totalInvested}" data-prev-interest="${prevInterest}" data-period-interest="${row.periodInterest}"`;
    return `
      ${h_inv > 0.5 ? `<rect class="bar-seg-invested" x="${x.toFixed(1)}" y="${(baseY - h_inv - h_prev - h_cur).toFixed(1)}" width="${bw.toFixed(1)}" height="${h_inv.toFixed(1)}" fill="#1e40af" rx="2" ${da}/>` : ""}
      ${h_prev > 0.5 ? `<rect class="bar-seg-interest" x="${x.toFixed(1)}" y="${(baseY - h_prev - h_cur).toFixed(1)}" width="${bw.toFixed(1)}" height="${h_prev.toFixed(1)}" fill="#3b82f6" ${da}/>` : ""}
      ${h_cur > 0.5 ? `<rect class="bar-seg-period" x="${x.toFixed(1)}" y="${(baseY - h_cur).toFixed(1)}" width="${bw.toFixed(1)}" height="${h_cur.toFixed(1)}" fill="#93c5fd" ${da}/>` : ""}`;
  }).join("");

  return `<svg class="compound-svg-chart" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
    <g fill="#64717f" font-family="inherit">${yTicks}</g>
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${baseY}" stroke="#9aa7b4" stroke-width="1.5"/>
    <line x1="${pad.l}" y1="${baseY}" x2="${W - pad.r}" y2="${baseY}" stroke="#9aa7b4" stroke-width="1.5"/>
    <g fill="#64717f" font-family="inherit">${xTicks}</g>
    ${bars}
    <line class="chart-crosshair" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${baseY}" stroke="#64717f" stroke-width="1" stroke-dasharray="4,3" visibility="hidden"/>
    <rect class="chart-overlay" x="${pad.l}" y="${pad.t}" width="${pw}" height="${ph}" fill="transparent"/>
  </svg>`;
}

function setupCompoundChartHover(svg) {
  if (!svg) return;
  const tip = getChartTooltip();
  const crosshair = svg.querySelector(".chart-crosshair");
  const W = 760;

  svg.addEventListener("mousemove", (ev) => {
    const rect = svg.getBoundingClientRect();
    const svgX = (ev.clientX - rect.left) * (W / rect.width);
    const bars = svg.querySelectorAll(".bar-seg-invested");
    let nearest = null, nearestDist = Infinity;
    bars.forEach((b) => {
      const cx = Number(b.getAttribute("x")) + Number(b.getAttribute("width")) / 2;
      const d = Math.abs(svgX - cx);
      if (d < nearestDist) { nearestDist = d; nearest = b; }
    });
    if (!nearest) { tip.hidden = true; if (crosshair) crosshair.setAttribute("visibility", "hidden"); return; }
    const cx = Number(nearest.getAttribute("x")) + Number(nearest.getAttribute("width")) / 2;
    if (crosshair) { crosshair.setAttribute("x1", cx.toFixed(1)); crosshair.setAttribute("x2", cx.toFixed(1)); crosshair.removeAttribute("visibility"); }
    const totalInterest = Number(nearest.dataset.prevInterest) + Number(nearest.dataset.periodInterest);
    tip.innerHTML = `<strong>Período ${nearest.dataset.period}</strong>Total: ${formatCurrency(Number(nearest.dataset.balance))}<br>Capital investido: ${formatCurrency(Number(nearest.dataset.invested))}<br>Juros acumulados: ${formatCurrency(totalInterest)}<br>Juros no período: ${formatCurrency(Number(nearest.dataset.periodInterest))}`;
    tip.hidden = false;
    tip.style.left = `${ev.clientX + 16}px`;
    tip.style.top = `${ev.clientY - 14}px`;
  });
  svg.addEventListener("mouseleave", () => { tip.hidden = true; if (crosshair) crosshair.setAttribute("visibility", "hidden"); });
}

// ── Retirement area chart hover with crosshair ───────────────────────────────

function setupRetirementChartHover(svg) {
  if (!svg) return;
  const tip = getChartTooltip();
  const crosshair = svg.querySelector(".chart-crosshair");
  const W = 760, padL = 112, padT = 58, padB = 42, H = 330;
  const ph = H - padT - padB;
  const baseY = padT + ph;

  const points = [...svg.querySelectorAll(".chart-point[data-balance]")];
  const n = points.length;
  if (n === 0) return;
  const pw = W - padL - 28;
  const step = pw / Math.max(n - 1, 1);

  svg.addEventListener("mousemove", (ev) => {
    const rect = svg.getBoundingClientRect();
    const svgX = (ev.clientX - rect.left) * (W / rect.width);
    const index = Math.max(0, Math.min(n - 1, Math.round((svgX - padL) / step)));
    const pt = points[index];
    if (!pt) { tip.hidden = true; return; }
    const x = padL + index * step;
    if (crosshair) { crosshair.setAttribute("x1", x.toFixed(1)); crosshair.setAttribute("x2", x.toFixed(1)); crosshair.removeAttribute("visibility"); }
    const bal = pt.dataset.balance ? `<br>Patrimônio: ${formatCurrency(Number(pt.dataset.balance))}` : "";
    tip.innerHTML = `<strong>${pt.dataset.year}</strong>Dividendos: ${formatCurrency(Number(pt.dataset.income))}<br>Custo de vida: ${formatCurrency(Number(pt.dataset.cost))}${bal}`;
    tip.hidden = false;
    tip.style.left = `${ev.clientX + 16}px`;
    tip.style.top = `${ev.clientY - 14}px`;
  });
  svg.addEventListener("mouseleave", () => { tip.hidden = true; if (crosshair) crosshair.setAttribute("visibility", "hidden"); });
}

const compoundForm = document.querySelector("#compoundForm");
const yieldRate = document.querySelector("#yieldRate");
const yieldUnit = document.querySelector("#yieldUnit");
const yieldRateHelp = document.querySelector("#yieldRateHelp");
const compoundResult = document.querySelector("#compoundResult");

function parseNumber(value) {
  const cleaned = String(value).replace(/[^\d,.-]/g, "");
  const hasComma = cleaned.includes(",");
  const dotCount = (cleaned.match(/\./g) || []).length;
  const decimalSeparator = hasComma ? "," : dotCount === 1 && /\.\d{1,2}$/.test(cleaned) ? "." : null;
  const normalized = decimalSeparator
    ? cleaned
      .replace(new RegExp(`\\${decimalSeparator === "," ? "." : ","}`, "g"), "")
      .replace(decimalSeparator, ".")
    : cleaned.replace(/[.,]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Link externo para a página do ativo no Investidor10 (ações ou FIIs)
function investidor10Link(ticker, tipo) {
  const slug = String(ticker || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!slug) return "";
  const path = tipo === "fii" ? "fiis" : "acoes";
  const url = `https://investidor10.com.br/${path}/${slug}/`;
  return `<a class="i10-link" href="${url}" target="_blank" rel="noopener noreferrer" title="Ver ${ticker} no Investidor10">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
    <span>Investidor10</span>
  </a>`;
}

function formatPercent(value, digits = 3) {
  return `${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function setPercentInputValue(input, rate, digits = 2) {
  if (!input || !Number.isFinite(rate)) {
    return;
  }

  input.value = formatPercent(rate, digits);
}

async function loadMarketIndicators() {
  try {
    const response = await fetch("/invest/api/indicators");
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

// Indicadores do Banco Central (IPCA longo prazo, CDI) — buscados uma vez e reutilizados.
let _indicatorsPromise = null;
function getMarketIndicatorsCached() {
  if (!_indicatorsPromise) _indicatorsPromise = loadMarketIndicators();
  return _indicatorsPromise;
}

// Prêmio de risco de ações sobre o juro livre de risco (CDI/Selic), em fração.
// Usado para ancorar o WACC padrão a dados de mercado vivos, em vez de um valor fixo.
const EQUITY_RISK_PREMIUM = 0.04;

function formatDecimal(value, digits = 2) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPeriodMonths(months) {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  }

  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}`);
  }

  return parts.join(" e ") || "0 meses";
}

function buildCompoundJourney(initial, monthly, months, monthlyRate) {
  const monthlyRows = [];
  const annualRows = [];
  let balance = initial;
  let totalContributions = 0;
  let totalInterest = 0;

  for (let month = 1; month <= months; month += 1) {
    const interest = balance * monthlyRate;
    balance += interest + monthly;
    totalContributions += monthly;
    totalInterest += interest;

    monthlyRows.push({
      period: month,
      invested: initial,
      periodInterest: interest,
      contribution: monthly,
      totalInterest,
      balance,
    });
  }

  for (let start = 0; start < monthlyRows.length; start += 12) {
    const rows = monthlyRows.slice(start, start + 12);
    const last = rows[rows.length - 1];
    const yearInterest = rows.reduce((sum, row) => sum + row.periodInterest, 0);
    const yearContribution = rows.reduce((sum, row) => sum + row.contribution, 0);

    annualRows.push({
      period: Math.floor(start / 12) + 1,
      invested: initial,
      periodInterest: yearInterest,
      contribution: yearContribution,
      totalInterest: last.totalInterest,
      balance: last.balance,
    });
  }

  return { monthlyRows, annualRows, totalContributions, totalInterest, finalAmount: balance };
}

function createJourneyTable(rows, periodLabel, contributionLabel) {
  const bodyRows = rows.map((row) => `
    <tr>
      <td>${row.period}</td>
      <td>${formatCurrency(row.invested)}</td>
      <td>${formatCurrency(row.periodInterest)}</td>
      <td>${formatCurrency(row.contribution)}</td>
      <td>${formatCurrency(row.totalInterest)}</td>
      <td>${formatCurrency(row.balance)}</td>
      <td>${row.balance > row.invested ? "Patrimônio em crescimento" : "Início da jornada"}</td>
    </tr>
  `).join("");

  return `
    <table class="journey-table">
      <thead>
        <tr>
          <th scope="col">${periodLabel}</th>
          <th scope="col">Investimento</th>
          <th scope="col">Juros no ${periodLabel.toLowerCase().includes("ano") ? "ano" : "mês"}</th>
          <th scope="col">${contributionLabel}</th>
          <th scope="col">Total Juros</th>
          <th scope="col">Balanço Total</th>
          <th scope="col">Mensagem</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

function createMonthlyJourneyTable(rows) {
  const bodyRows = rows.map((row) => `
    <tr>
      <td>${Math.ceil(row.period / 12)}</td>
      <td>${row.period}</td>
      <td>${formatCurrency(row.invested)}</td>
      <td>${formatCurrency(row.periodInterest)}</td>
      <td>${formatCurrency(row.contribution)}</td>
      <td>${formatCurrency(row.totalInterest)}</td>
      <td>${formatCurrency(row.balance)}</td>
      <td>${row.balance > row.invested ? "Patrimônio em crescimento" : "Início da jornada"}</td>
    </tr>
  `).join("");

  return `
    <table class="journey-table">
      <thead>
        <tr>
          <th scope="col">Ano</th>
          <th scope="col">Período (mês)</th>
          <th scope="col">Investimento</th>
          <th scope="col">Juros no mês</th>
          <th scope="col">Aporte Mensal</th>
          <th scope="col">Total Juros</th>
          <th scope="col">Balanço Total</th>
          <th scope="col">Mensagem</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

function renderCompoundResult({
  initial,
  monthly,
  months,
  monthlyRate,
  passiveIncome,
  finalAmount,
  totalContributions,
  totalInterest,
  annualRows,
  monthlyRows,
}, shouldFocus = false) {
  const periodText = formatPeriodMonths(months);
  const invested = initial + totalContributions;
  const passiveMonthlyEstimate = finalAmount * monthlyRate;
  const passiveProgress = passiveIncome > 0 ? Math.min((passiveMonthlyEstimate / passiveIncome) * 100, 100) : 0;
  const pieInitial = invested > 0 ? (initial / finalAmount) * 100 : 0;
  const pieContributions = invested > 0 ? (totalContributions / finalAmount) * 100 : 0;
  const chartTableRows = monthlyRows.map((row) => `
    <tr>
      <td>${row.period}</td>
      <td>${formatCurrency(row.balance)}</td>
      <td>${formatCurrency(row.invested + row.contribution * row.period)}</td>
      <td>${formatCurrency(row.totalInterest)}</td>
      <td>${formatCurrency(row.periodInterest)}</td>
    </tr>
  `).join("");

  compoundResult.innerHTML = `
    <div class="compound-results-shell">
      <section class="compound-summary-card" aria-labelledby="compoundSummaryTitle">
        <div class="compound-card-content">
          <div>
            <h3 id="compoundSummaryTitle" tabindex="-1">Veja só o seu resultado em ${periodText}</h3>
            <p class="compound-total-value">${formatCurrency(finalAmount)}, consistindo em:</p>
            <ul class="composition-list">
              <li><span class="legend-square legend-initial" aria-hidden="true"></span>Investimento inicial: <strong>${formatCurrency(initial)}</strong></li>
              <li><span class="legend-square legend-contributions" aria-hidden="true"></span>Aportes mensais: <strong>${formatCurrency(totalContributions)}</strong></li>
              <li><span class="legend-square legend-interest" aria-hidden="true"></span>Juros acumulados: <strong>${formatCurrency(totalInterest)}</strong></li>
            </ul>
          </div>
          <div class="pie-chart" aria-hidden="true" style="--initial:${pieInitial}; --contributions:${pieContributions};"></div>
        </div>
      </section>

      <section class="compound-summary-card" aria-labelledby="compoundGoalTitle">
        <div class="card-title-row">
          <h3 id="compoundGoalTitle">Meta em andamento</h3>
          <span class="tooltip-wrap">
            <button class="tooltip-button" type="button" aria-label="Mais detalhes sobre a meta de renda passiva" aria-describedby="compoundGoalHelp">?</button>
            <span class="tooltip-content" id="compoundGoalHelp" role="tooltip">A meta compara a renda mensal estimada com a expectativa informada no formulário.</span>
          </span>
        </div>
        <p>Chegar aos <strong>${formatCurrency(passiveMonthlyEstimate)}</strong> em dividendos é como garantir aquela pizza de sexta-feira, todo mês, sem esforço. É a sua fatia inicial na grande pizza da independência financeira.</p>
        <div
          class="goal-progress"
          role="progressbar"
          aria-valuenow="${formatDecimal(passiveProgress, 2)}"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Progresso da meta de renda passiva"
          style="--progress:${passiveProgress};"
        >
          <strong>${formatDecimal(passiveProgress, 2)}%</strong>
          <span>Porcentagem</span>
        </div>
      </section>

      <section class="wide-result-panel" aria-labelledby="compoundBarChartTitle">
        <div class="card-title-row">
          <h3 id="compoundBarChartTitle">Retorno no período</h3>
          <button class="icon-button chart-action" type="button" aria-label="Alternar visualização do gráfico">
            <span aria-hidden="true">BAR</span>
          </button>
        </div>
        <ul class="chart-legend-list" aria-label="Legenda do gráfico">
          <li><span class="legend-square" style="background:#1e40af" aria-hidden="true"></span>Capital investido</li>
          <li><span class="legend-square" style="background:#3b82f6" aria-hidden="true"></span>Juros acumulados</li>
          <li><span class="legend-square" style="background:#93c5fd" aria-hidden="true"></span>Juros no período</li>
        </ul>
        <div class="bar-chart-figure" role="figure" aria-label="Gráfico de barras empilhadas mostrando a evolução do patrimônio">
          ${createCompoundSVGChart(monthlyRows, annualRows)}
          <table class="sr-only">
            <caption>Evolução do patrimônio mês a mês</caption>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col">Valor Total</th>
                <th scope="col">Investimento total</th>
                <th scope="col">Juros acumulados</th>
                <th scope="col">Juros no período</th>
              </tr>
            </thead>
            <tbody>${chartTableRows}</tbody>
          </table>
        </div>
      </section>

      <section class="wide-result-panel" aria-labelledby="compoundJourneyTitle">
        <div class="card-title-row">
          <div>
            <h3 id="compoundJourneyTitle">Detalhamento da sua jornada</h3>
            <span class="tooltip-wrap">
              <button class="tooltip-button" type="button" aria-label="Mais detalhes sobre a tabela de detalhamento" aria-describedby="compoundJourneyHelp">?</button>
              <span class="tooltip-content" id="compoundJourneyHelp" role="tooltip">Use as abas para alternar entre a visão anual e mensal da simulação.</span>
            </span>
          </div>
          <button class="outline-action" type="button">Fixar cabeçalho</button>
        </div>
        <div class="tabs" role="tablist" aria-label="Detalhamento da jornada">
          <button id="tab-anual" type="button" role="tab" aria-selected="true" aria-controls="panel-anual">Detalhamento Anual</button>
          <button id="tab-mensal" type="button" role="tab" aria-selected="false" aria-controls="panel-mensal">Detalhamento Mensal</button>
        </div>
        <div id="panel-anual" role="tabpanel" aria-labelledby="tab-anual">
          ${createJourneyTable(annualRows, "Período (ano)", "Aporte Anual")}
        </div>
        <div id="panel-mensal" role="tabpanel" aria-labelledby="tab-mensal" hidden>
          ${createMonthlyJourneyTable(monthlyRows)}
        </div>
      </section>
    </div>
  `;

  setupCompoundChartHover(compoundResult.querySelector(".compound-svg-chart"));

  if (shouldFocus) {
    const firstHeading = compoundResult.querySelector("#compoundSummaryTitle");
    firstHeading.focus({ preventScroll: false });
  }
}

function updateCompoundSimulation(shouldFocus = false) {
  if (!compoundForm) {
    return;
  }

  const initial = parseNumber(document.querySelector("#initialInvestment").value);
  const monthly = parseNumber(document.querySelector("#monthlyContribution").value);
  const period = Math.max(1, parseNumber(document.querySelector("#applicationPeriod").value));
  const periodUnit = document.querySelector("#periodUnit").value;
  const months = periodUnit === "years" ? period * 12 : period;
  const monthlyRate = getMonthlyRate();
  const passiveIncome = parseNumber(document.querySelector("#passiveIncome").value);
  const journey = buildCompoundJourney(initial, monthly, months, monthlyRate);

  renderCompoundResult({
    initial,
    monthly,
    months,
    monthlyRate,
    passiveIncome,
    ...journey,
  }, shouldFocus);
}

function getMonthlyRate() {
  const rate = parseNumber(yieldRate.value) / 100;
  return yieldUnit.value === "annual" ? Math.pow(1 + rate, 1 / 12) - 1 : rate;
}

function updateAnnualYieldHelp() {
  if (!yieldRate || !yieldUnit || !yieldRateHelp) {
    return;
  }

  const annualRate = Math.pow(1 + getMonthlyRate(), 12) - 1;
  yieldRateHelp.textContent = `Que dá ${formatPercent(annualRate)} ao ano.`;
}

if (compoundForm) {
  updateAnnualYieldHelp();

  function updateCompoundFromField() {
    updateAnnualYieldHelp();
    updateCompoundSimulation(false);
  }

  compoundForm.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener(field.tagName === "SELECT" ? "change" : "input", updateCompoundFromField);
  });

  compoundForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateCompoundSimulation(true);
  });

  updateCompoundSimulation(false);
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest('[role="tab"]');
  if (!tab) {
    return;
  }

  const tablist = tab.closest('[role="tablist"]');
  if (!tablist) {
    return;
  }

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs
    .map((item) => document.querySelector(`#${item.getAttribute("aria-controls")}`))
    .filter(Boolean);

  tabs.forEach((item) => item.setAttribute("aria-selected", String(item === tab)));
  panels.forEach((panel) => {
    panel.hidden = panel.id !== tab.getAttribute("aria-controls");
  });
});

document.addEventListener("keydown", (event) => {
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) {
    return;
  }

  event.preventDefault();
  const tabs = Array.from(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
  const currentIndex = tabs.indexOf(tab);
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
  nextTab.focus();
  nextTab.click();
});

const rateConverterForm = document.querySelector("#rateConverterForm");
const initialRate = document.querySelector("#initialRate");
const inputRateType = document.querySelector("#inputRateType");
const rateConverterResult = document.querySelector("#rateConverterResult");

const rateTypeLabels = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  semiannual: "Semestral",
  annual: "Anual",
};

const rateTypePeriodLabels = {
  daily: "ao dia",
  weekly: "por semana",
  monthly: "ao mês",
  semiannual: "ao semestre",
  annual: "ao ano",
};

const rateTypePeriodsPerYear = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  semiannual: 2,
  annual: 1,
};

const rateTypeDays = {
  daily: 1,
  monthly: 30,
  annual: 365,
};

function getEquivalentRate(rate, fromType, toType) {
  if (fromType === toType) {
    return rate;
  }

  const annualRate = Math.pow(1 + rate, rateTypePeriodsPerYear[fromType]) - 1;
  return Math.pow(1 + annualRate, 1 / rateTypePeriodsPerYear[toType]) - 1;
}

function getRunningDailyRate(rate, fromType) {
  return rate / rateTypeDays[fromType];
}

function formatRateValue(rate, digits) {
  return `${(rate * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

function getRateDigits(rateType) {
  return rateType === "daily" || rateType === "weekly" ? 3 : 2;
}

function updateRateConverterResult() {
  if (!initialRate || !inputRateType || !rateConverterResult) {
    return;
  }

  const sourceRate = parseNumber(initialRate.value) / 100;
  const fromType = inputRateType.value;
  const convertedRates = ["daily", "weekly", "monthly", "semiannual", "annual"]
    .map((toType) => {
      const convertedRate = getEquivalentRate(sourceRate, fromType, toType);
      return `
        <span>
          A taxa ${rateTypeLabels[fromType]} de <strong>${formatRateValue(sourceRate, 2)}</strong> equivale a <strong>${formatRateValue(convertedRate, getRateDigits(toType))} ${rateTypePeriodLabels[toType]}</strong>.
        </span>
      `;
    })
    .join("");

  rateConverterResult.innerHTML = `
    <h3>Taxas convertidas</h3>
    <p class="rate-conversion-list">${convertedRates}</p>
  `;
}

if (rateConverterForm) {
  updateRateConverterResult();

  rateConverterForm.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  [initialRate, inputRateType].forEach((field) => {
    field.addEventListener(field.tagName === "SELECT" ? "change" : "input", updateRateConverterResult);
  });
}

const retirementForm = document.querySelector("#retirementForm");
const retirementYieldRate = document.querySelector("#retirementYieldRate");
const retirementYieldUnit = document.querySelector("#retirementYieldUnit");
const retirementYieldRateHelp = document.querySelector("#retirementYieldRateHelp");
const retirementResult = document.querySelector("#retirementResult");
const annualInflationInput = document.querySelector("#annualInflation");
const annualInflationLast12 = document.querySelector("#annualInflationLast12");

function getRetirementMonthlyRate() {
  if (!retirementYieldRate || !retirementYieldUnit) {
    return 0;
  }

  const rate = parseNumber(retirementYieldRate.value) / 100;
  return retirementYieldUnit.value === "annual" ? Math.pow(1 + rate, 1 / 12) - 1 : rate;
}

function updateRetirementYieldHelp() {
  if (!retirementYieldRateHelp) {
    return;
  }

  const annualRate = Math.pow(1 + getRetirementMonthlyRate(), 12) - 1;
  retirementYieldRateHelp.textContent = `Que dá ${formatPercent(annualRate)} ao ano.`;
}

function calculateRetirementPlan() {
  const monthlyExpense = parseNumber(document.querySelector("#monthlyExpense").value);
  const annualInflation = parseNumber(document.querySelector("#annualInflation").value) / 100;
  const initialInvestment = parseNumber(document.querySelector("#retirementInitialInvestment").value);
  const monthlyContribution = parseNumber(document.querySelector("#retirementMonthlyContribution").value);
  const annualContributionIncrease = parseNumber(document.querySelector("#annualContributionIncrease").value) / 100;
  const monthlyRate = getRetirementMonthlyRate();

  let balance = initialInvestment;
  let adjustedExpense = monthlyExpense;
  let adjustedContribution = monthlyContribution;
  let months = 0;
  const maxMonths = 80 * 12;

  while (months < maxMonths) {
    months += 1;
    balance = balance * (1 + monthlyRate) + adjustedContribution;

    if (monthlyRate > 0 && balance * monthlyRate >= adjustedExpense) {
      break;
    }

    if (months % 12 === 0) {
      adjustedExpense *= 1 + annualInflation;
      adjustedContribution *= 1 + annualContributionIncrease;
    }
  }

  return {
    balance,
    months,
    adjustedExpense,
    monthlyIncome: balance * monthlyRate,
    reachedGoal: months < maxMonths,
  };
}

function buildRetirementJourney() {
  const monthlyExpense = parseNumber(document.querySelector("#monthlyExpense").value);
  const annualInflation = parseNumber(document.querySelector("#annualInflation").value) / 100;
  const initialInvestment = parseNumber(document.querySelector("#retirementInitialInvestment").value);
  const initialMonthlyContribution = parseNumber(document.querySelector("#retirementMonthlyContribution").value);
  const annualContributionIncrease = parseNumber(document.querySelector("#annualContributionIncrease").value) / 100;
  const monthlyRate = getRetirementMonthlyRate();
  const monthlyInflationRate = Math.pow(1 + annualInflation, 1 / 12) - 1;
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setMonth(startDate.getMonth() - 1);
  const monthlyRows = [];
  const annualRows = [];
  let balance = initialInvestment;
  let adjustedMonthlyExpense = monthlyExpense;
  let adjustedMonthlyContribution = initialMonthlyContribution;
  let investedPrincipal = initialInvestment;
  let yearStartInvestment = initialInvestment;
  let totalInterest = 0;
  let reachedMonth = null;
  let displayUntilYear = null;
  const maxMonths = 80 * 12;

  for (let month = 1; month <= maxMonths; month += 1) {
    const interest = balance * monthlyRate;
    balance += interest + adjustedMonthlyContribution;
    totalInterest += interest;

    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + month);
    const monthlyIncome = balance * monthlyRate;
    const retired = reachedMonth !== null;

    monthlyRows.push({
      period: month,
      date: currentDate,
      cost: adjustedMonthlyExpense,
      retired,
      interest,
      investment: investedPrincipal,
      contribution: adjustedMonthlyContribution,
      totalInterest,
      balance,
      monthlyIncome,
    });
    investedPrincipal += adjustedMonthlyContribution;

    if (month % 12 === 0) {
      const rows = monthlyRows.slice(month - 12, month);
      const last = rows[rows.length - 1];
      const yearCost = rows.reduce((sum, row) => sum + row.cost, 0);
      const yearInterest = rows.reduce((sum, row) => sum + row.interest, 0);
      const yearRetired = yearInterest >= yearCost;
      annualRows.push({
        period: month / 12,
        date: last.date,
        cost: yearCost,
        retired: yearRetired,
        interest: yearInterest,
        investment: yearStartInvestment,
        contribution: rows.reduce((sum, row) => sum + row.contribution, 0),
        totalInterest: last.totalInterest,
        balance: last.balance,
        monthlyIncome: last.monthlyIncome,
        annualIncome: last.monthlyIncome * 12,
      });

      if (yearRetired && reachedMonth === null) {
        reachedMonth = month - 11;
        rows.forEach((row) => {
          row.retired = true;
        });
        displayUntilYear = Math.max(annualRows.length, Math.floor((reachedMonth * 2) / 12));
      }

      if (displayUntilYear !== null && annualRows.length >= displayUntilYear) {
        break;
      }

      const nextMonthlyContribution = adjustedMonthlyContribution * (1 + annualContributionIncrease);
      const contributionIncrease = nextMonthlyContribution - adjustedMonthlyContribution;
      adjustedMonthlyContribution = nextMonthlyContribution;
      investedPrincipal += contributionIncrease;
      balance += contributionIncrease;
      yearStartInvestment = investedPrincipal;
    }

    adjustedMonthlyExpense *= 1 + monthlyInflationRate;
  }

  if (reachedMonth !== null && monthlyRows.length % 12 !== 0) {
    const start = Math.floor((monthlyRows.length - 1) / 12) * 12;
    const rows = monthlyRows.slice(start);
    const last = rows[rows.length - 1];
    const yearCost = rows.reduce((sum, row) => sum + row.cost, 0);
    const yearInterest = rows.reduce((sum, row) => sum + row.interest, 0);
    annualRows.push({
      period: Math.ceil(monthlyRows.length / 12),
      date: last.date,
      cost: yearCost,
      retired: yearInterest >= yearCost,
      interest: yearInterest,
      investment: yearStartInvestment,
      contribution: rows.reduce((sum, row) => sum + row.contribution, 0),
      totalInterest: last.totalInterest,
      balance: last.balance,
      monthlyIncome: last.monthlyIncome,
      annualIncome: last.monthlyIncome * 12,
    });
  }

  const resultRow = reachedMonth === null ? monthlyRows[monthlyRows.length - 1] : monthlyRows[reachedMonth - 1];

  return {
    monthlyRows,
    annualRows,
    reachedMonth,
    reachedGoal: reachedMonth !== null,
    daysRemaining: reachedMonth === null ? null : Math.max(0, Math.round((resultRow.date - new Date()) / 86400000)),
    monthlyIncome: resultRow.monthlyIncome,
    monthlyCost: resultRow.cost,
  };
}

function formatShortDate(date) {
  return date.toLocaleDateString("pt-BR", {
    month: "2-digit",
    year: "numeric",
  });
}

function createRetirementJourneyTable(rows, periodLabel, costLabel, contributionLabel) {
  const bodyRows = rows.map((row) => `
    <tr>
      <td>${row.period}</td>
      <td>${formatShortDate(row.date)}</td>
      <td>${formatCurrency(row.cost)}</td>
      <td><strong class="${row.retired ? "retirement-badge success" : "retirement-badge pending"}">${row.retired ? "Sim!" : "Calma lá!"}</strong></td>
      <td>${formatCurrency(row.interest)}</td>
      <td>${formatCurrency(row.investment)}</td>
      <td>${formatCurrency(row.contribution)}</td>
      <td>${formatCurrency(row.totalInterest)}</td>
      <td>${formatCurrency(row.balance)}</td>
    </tr>
  `).join("");

  return `
    <table class="journey-table retirement-journey-table">
      <thead>
        <tr>
          <th scope="col">${periodLabel}</th>
          <th scope="col">Data</th>
          <th scope="col">${costLabel}</th>
          <th scope="col">Me aposentei?</th>
          <th scope="col">Juros no ${periodLabel === "Ano" ? "ano" : "mês"}</th>
          <th scope="col">Investimento</th>
          <th scope="col">${contributionLabel}</th>
          <th scope="col">Total Juros</th>
          <th scope="col">Balanço Total</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

function createRetirementAreaChart(rows) {
  const chartRows = rows.length > 1 ? rows : [...rows, ...rows];
  const maxValue = Math.max(...chartRows.flatMap((row) => [row.annualIncome, row.cost]), 1);
  const width = 760;
  const height = 330;
  const padding = { top: 58, right: 28, bottom: 42, left: 112 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const step = plotWidth / Math.max(chartRows.length - 1, 1);
  const svgNumber = (value) => Number(value).toFixed(2);
  const toPoint = (row, index, key) => {
    const x = padding.left + index * step;
    const y = padding.top + plotHeight - (row[key] / maxValue) * plotHeight;
    return `${svgNumber(x)},${svgNumber(y)}`;
  };
  const incomePoints = chartRows.map((row, index) => toPoint(row, index, "annualIncome")).join(" ");
  const costPoints = chartRows.map((row, index) => toPoint(row, index, "cost")).join(" ");
  const baselineY = padding.top + plotHeight;
  const incomeArea = `${padding.left},${baselineY} ${incomePoints} ${width - padding.right},${baselineY}`;
  const yTicks = [0, 0.5, 1].map((ratio) => {
    const value = maxValue * ratio;
    const y = padding.top + plotHeight - ratio * plotHeight;
    return `
      <g>
        <line x1="${padding.left}" y1="${svgNumber(y)}" x2="${width - padding.right}" y2="${svgNumber(y)}" stroke="#d9e0e7" stroke-width="1"></line>
        <text x="${padding.left - 10}" y="${svgNumber(y + 4)}" text-anchor="end">${formatCurrency(value)}</text>
      </g>
    `;
  }).join("");
  const xIndexes = [0, Math.floor((chartRows.length - 1) / 2), chartRows.length - 1].filter((value, index, array) => array.indexOf(value) === index);
  const xTicks = xIndexes.map((index) => {
    const x = padding.left + index * step;
    return `<text x="${svgNumber(x)}" y="${height - 12}" text-anchor="middle">${formatShortDate(chartRows[index].date)}</text>`;
  }).join("");

  const incomeCircles = chartRows.map((row, index) => {
    const x = padding.left + index * step;
    const y = padding.top + plotHeight - (row.annualIncome / maxValue) * plotHeight;
    return `<circle class="chart-point" cx="${svgNumber(x)}" cy="${svgNumber(y)}" r="4" fill="#2563eb" stroke="#fff" stroke-width="2"
      data-year="${formatShortDate(row.date)}"
      data-income="${row.annualIncome}"
      data-cost="${row.cost}"
      data-balance="${row.balance}"
    ></circle>`;
  }).join("");

  const costCircles = chartRows.map((row, index) => {
    const x = padding.left + index * step;
    const y = padding.top + plotHeight - (row.cost / maxValue) * plotHeight;
    return `<circle class="chart-point" cx="${svgNumber(x)}" cy="${svgNumber(y)}" r="4" fill="#dc2626" stroke="#fff" stroke-width="2"
      data-year="${formatShortDate(row.date)}"
      data-income="${row.annualIncome}"
      data-cost="${row.cost}"
    ></circle>`;
  }).join("");

  return `
    <svg class="retirement-area-chart" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">
      <g class="chart-svg-legend">
        <line x1="250" y1="24" x2="286" y2="24" stroke="#dc2626" stroke-width="2"></line>
        <circle cx="268" cy="24" r="3" fill="#ffffff" stroke="#dc2626" stroke-width="2"></circle>
        <text x="296" y="29">Custo de vida no ano</text>
        <line x1="442" y1="24" x2="478" y2="24" stroke="#2563eb" stroke-width="2"></line>
        <circle cx="460" cy="24" r="3" fill="#ffffff" stroke="#2563eb" stroke-width="2"></circle>
        <text x="488" y="29">Dividendos no ano</text>
      </g>
      <g class="chart-axis">
        ${yTicks}
        <line x1="${padding.left}" y1="${baselineY}" x2="${width - padding.right}" y2="${baselineY}" stroke="#9aa7b4" stroke-width="1.5"></line>
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${baselineY}" stroke="#9aa7b4" stroke-width="1.5"></line>
        ${xTicks}
      </g>
      <polygon points="${incomeArea}" fill="rgba(37, 99, 235, 0.12)"></polygon>
      <polyline points="${incomePoints}" fill="none" stroke="#2563eb" stroke-width="2"></polyline>
      <polyline points="${costPoints}" fill="none" stroke="#dc2626" stroke-width="2"></polyline>
      ${costCircles}
      ${incomeCircles}
      <line class="chart-crosshair" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${baselineY}" stroke="#64717f" stroke-width="1" stroke-dasharray="5,4" visibility="hidden"/>
      <rect class="chart-overlay" x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" fill="transparent"/>
    </svg>
  `;
}

function updateRetirementResult(shouldFocus = false) {
  if (!retirementResult) {
    return;
  }

  const result = buildRetirementJourney();
  const years = result.reachedMonth === null ? 80 : Math.floor(result.reachedMonth / 12);
  const remainingMonths = result.reachedMonth === null ? 0 : result.reachedMonth % 12;
  const periodText = years > 0
    ? `${years} anos${remainingMonths > 0 ? ` e ${remainingMonths} meses` : ""}`
    : `${remainingMonths} meses`;

  if (!result.reachedGoal) {
    retirementResult.innerHTML = `
      <h3 tabindex="-1" id="retirementVerdictTitle">Ainda falta ajustar o plano.</h3>
      <p>Com os valores atuais, a renda mensal projetada ainda não cobre a despesa estimada dentro de 80 anos. Revise aportes, rendimento ou despesa mensal e calcule novamente.</p>
    `;
    if (shouldFocus) {
      retirementResult.querySelector("#retirementVerdictTitle").focus({ preventScroll: false });
    }
    return;
  }

  retirementResult.innerHTML = `
    <div class="retirement-results-shell">
      <section class="retirement-success-panel" aria-labelledby="retirementVerdictTitle">
        <h3 tabindex="-1" id="retirementVerdictTitle">Restam aproximadamente ${formatDecimal(result.daysRemaining, 0)} dias (${periodText}) para você se aposentar!</h3>
        <ul class="composition-list retirement-legend">
          <li><span class="legend-square legend-income" aria-hidden="true"></span>Dividendos mensais: <strong>${formatCurrency(result.monthlyIncome)}</strong></li>
          <li><span class="legend-square legend-cost" aria-hidden="true"></span>Custo mensal: <strong>${formatCurrency(result.monthlyCost)}</strong></li>
        </ul>
        <div class="retirement-chart-wrap">
          ${createRetirementAreaChart(result.annualRows)}
        </div>
      </section>

      <section class="wide-result-panel" aria-labelledby="retirementJourneyTitle">
        <div class="card-title-row">
          <div>
            <h3 id="retirementJourneyTitle">Detalhamento da sua jornada</h3>
            <span class="tooltip-wrap">
              <button class="tooltip-button" type="button" aria-label="Mais detalhes sobre o detalhamento da jornada" aria-describedby="retirementJourneyHelp">?</button>
              <span class="tooltip-content" id="retirementJourneyHelp" role="tooltip">A tabela espelha os dados do gráfico para navegação por leitores de tela.</span>
            </span>
          </div>
          <button class="pin-action" type="button" aria-label="Fixar cabeçalho da tabela">
            <span aria-hidden="true">📌</span>
          </button>
        </div>
        <div class="tabs" role="tablist" aria-label="Detalhamento do plano de aposentadoria">
          <button id="retirement-tab-anual" type="button" role="tab" aria-selected="true" aria-controls="retirement-panel-anual">Detalhamento Anual</button>
          <button id="retirement-tab-mensal" type="button" role="tab" aria-selected="false" aria-controls="retirement-panel-mensal">Detalhamento Mensal</button>
        </div>
        <div id="retirement-panel-anual" role="tabpanel" aria-labelledby="retirement-tab-anual">
          ${createRetirementJourneyTable(result.annualRows, "Ano", "Custo de vida anual", "Aportes no ano")}
        </div>
        <div id="retirement-panel-mensal" role="tabpanel" aria-labelledby="retirement-tab-mensal" hidden>
          ${createRetirementJourneyTable(result.monthlyRows, "Mês", "Custo de vida mensal", "Aportes no mês")}
        </div>
      </section>
    </div>
  `;

  setupRetirementChartHover(retirementResult.querySelector(".retirement-area-chart"));

  if (shouldFocus) {
    retirementResult.querySelector("#retirementVerdictTitle").focus({ preventScroll: false });
  }
}

if (retirementForm) {
  updateRetirementYieldHelp();

  loadMarketIndicators().then((indicators) => {
    if (!indicators) {
      return;
    }

    setPercentInputValue(annualInflationInput, indicators.ipcaTwentyYearAverage, 2);
    if (annualInflationLast12) {
      annualInflationLast12.textContent = `Inflação dos últimos 12 meses: ${formatPercent(indicators.ipcaLastTwelveMonths, 2)}`;
    }
    updateRetirementResult(false);
  });

  function updateRetirementFromField() {
    updateRetirementYieldHelp();
    updateRetirementResult(false);
  }

  retirementForm.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener(field.tagName === "SELECT" ? "change" : "input", updateRetirementFromField);
  });

  retirementForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateRetirementResult(true);
  });

  updateRetirementResult(false);
}

const fixedIncomeForm = document.querySelector("#fixedIncomeForm");
const fixedIncomeResult = document.querySelector("#fixedIncomeResult");

const brazilHolidayCache = new Map();
const iofRates = {
  1: 0.96,
  2: 0.93,
  3: 0.9,
  4: 0.86,
  5: 0.83,
  6: 0.8,
  7: 0.76,
  8: 0.73,
  9: 0.7,
  10: 0.66,
  11: 0.63,
  12: 0.6,
  13: 0.56,
  14: 0.53,
  15: 0.5,
  16: 0.46,
  17: 0.43,
  18: 0.4,
  19: 0.36,
  20: 0.33,
  21: 0.3,
  22: 0.26,
  23: 0.23,
  24: 0.2,
  25: 0.16,
  26: 0.13,
  27: 0.1,
  28: 0.06,
  29: 0.03,
  30: 0,
};

function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return null;
  }

  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function daysBetween(start, end) {
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function dateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function getBrazilHolidayKeys(year) {
  if (brazilHolidayCache.has(year)) {
    return brazilHolidayCache.get(year);
  }

  const easter = getEasterDate(year);
  const holidays = [
    new Date(Date.UTC(year, 0, 1)),
    addDays(easter, -48),
    addDays(easter, -47),
    addDays(easter, -2),
    new Date(Date.UTC(year, 3, 21)),
    new Date(Date.UTC(year, 4, 1)),
    addDays(easter, 60),
    new Date(Date.UTC(year, 8, 7)),
    new Date(Date.UTC(year, 9, 12)),
    new Date(Date.UTC(year, 10, 2)),
    new Date(Date.UTC(year, 10, 15)),
    new Date(Date.UTC(year, 10, 20)),
    new Date(Date.UTC(year, 11, 25)),
  ];
  const keys = new Set(holidays.map(dateKey));
  brazilHolidayCache.set(year, keys);
  return keys;
}

function isBusinessDay(date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6 && !getBrazilHolidayKeys(date.getUTCFullYear()).has(dateKey(date));
}

function addBusinessDays(date, days) {
  if (days === 0) {
    return date;
  }

  let current = date;
  let remaining = Math.abs(days);
  const direction = days > 0 ? 1 : -1;

  while (remaining > 0) {
    current = addDays(current, direction);
    if (isBusinessDay(current)) {
      remaining -= 1;
    }
  }

  return current;
}

function countBusinessDays(start, end) {
  if (end < start) {
    return 0;
  }

  let total = 0;
  let current = start;
  while (current <= end) {
    if (isBusinessDay(current)) {
      total += 1;
    }
    current = addDays(current, 1);
  }
  return total;
}

function getFixedIncomeTaxRate(product, calendarDays) {
  if (product === "LCI/LCA" || product === "CRI/CRA") {
    return 0;
  }

  if (calendarDays <= 180) {
    return 0.225;
  }
  if (calendarDays <= 360) {
    return 0.2;
  }
  if (calendarDays <= 720) {
    return 0.175;
  }
  return 0.15;
}

function getFixedIncomeIofRate(product, calendarDays) {
  if (product === "MP" || calendarDays <= 0 || calendarDays > 30) {
    return 0;
  }
  return iofRates[calendarDays] || 0;
}

function calculateFixedIncome() {
  const product = document.querySelector("#fixedProduct").value;
  const applicationDate = parseLocalDate(document.querySelector("#fixedApplicationDate").value);
  const maturityDate = parseLocalDate(document.querySelector("#fixedMaturityDate").value);
  if (!applicationDate || !maturityDate) {
    return { invalid: true, message: "Informe datas válidas para calcular a simulação." };
  }

  const investedAmount = parseNumber(document.querySelector("#fixedInvestedAmount").value);
  const requestedRateMode = document.querySelector("#fixedRateMode").value;
  const rateMode = product === "Tesouro" ? "pre" : requestedRateMode;
  const indexer = document.querySelector("#fixedIndexer").value;
  const postRate = rateMode === "post" ? parseNumber(document.querySelector("#fixedPostRate").value) / 100 : 0;
  const preRate = rateMode === "pre" ? parseNumber(document.querySelector("#fixedPreRate").value) / 100 : 0;
  const ipcaRate = parseNumber(document.querySelector("#fixedIpcaRate").value) / 100;
  const cdiRate = parseNumber(document.querySelector("#fixedCdiRate").value) / 100;
  const settlementDays = 0;
  const settledApplicationDate = addBusinessDays(applicationDate, settlementDays);
  const firstYieldDate = addBusinessDays(applicationDate, settlementDays + 1);
  const calendarDays = Math.max(daysBetween(settledApplicationDate, maturityDate), 0);
  const businessDays = countBusinessDays(firstYieldDate, maturityDate);
  const yearsCalendar = calendarDays / 365;
  const yearsBusiness = businessDays / 252;
  const baseIndexerRate = indexer === "IPCA" ? ipcaRate : indexer === "CDI" ? cdiRate : 0;
  // CDI: postRate = % do CDI (ex: 1.2 para 120% do CDI) → totalRate = postRate * CDI
  // IPCA: postRate = spread a.a. (ex: 0.05 para 5%) → totalRate = (1 + IPCA) * (1 + spread) - 1
  let totalAnnualRate;
  if (rateMode === "pre") {
    totalAnnualRate = preRate;
  } else if (indexer === "IPCA") {
    totalAnnualRate = (1 + baseIndexerRate) * (1 + postRate) - 1;
  } else {
    totalAnnualRate = postRate * baseIndexerRate;
  }
  const totalDailyRate = Math.pow(1 + totalAnnualRate, 1 / 252) - 1;
  const grossYield = investedAmount * (Math.pow(1 + totalDailyRate, businessDays) - 1);
  const incomeTaxRate = getFixedIncomeTaxRate(product, calendarDays);
  const iofRate = getFixedIncomeIofRate(product, calendarDays);
  const incomeTax = -grossYield * incomeTaxRate;
  const iofTax = -grossYield * iofRate;
  const custodyFee = product === "Tesouro" ? -investedAmount * yearsCalendar * 0.0025 : 0;
  const netYield = grossYield + incomeTax + iofTax + custodyFee;
  const maturityTotal = investedAmount + netYield;
  const relativeMixedRate = investedAmount > 0 && maturityTotal > 0 && businessDays > 0
    ? Math.pow(maturityTotal / investedAmount, 1 / (businessDays > 1000 ? yearsBusiness : businessDays)) - 1
    : 0;
  const relativeAnnualRate = businessDays > 1000 ? relativeMixedRate : Math.pow(1 + relativeMixedRate, 252) - 1;
  const netCdiRelative = cdiRate > 0 ? relativeAnnualRate / cdiRate : 0;

  return {
    product,
    investedAmount,
    calendarDays,
    businessDays,
    yearsCalendar,
    yearsBusiness,
    incomeTaxRate,
    iofRate,
    totalAnnualRate,
    totalDailyRate,
    grossYield,
    incomeTax,
    iofTax,
    custodyFee,
    netYield,
    maturityTotal,
    relativeMixedRate,
    relativeAnnualRate,
    netCdiRelative,
  };
}

if (fixedIncomeForm) {
  const fixedProduct = document.querySelector("#fixedProduct");
  const fixedRateMode = document.querySelector("#fixedRateMode");
  const fixedPostFields = document.querySelectorAll(".fixed-post-field");
  const fixedPreFields = document.querySelectorAll(".fixed-pre-field");
  const fixedIpcaRate = document.querySelector("#fixedIpcaRate");
  const fixedCdiRate = document.querySelector("#fixedCdiRate");
  const fixedApplicationDate = document.querySelector("#fixedApplicationDate");
  const fixedMaturityDate = document.querySelector("#fixedMaturityDate");
  const fixedSimulations = [];
  let simCounter = 0;

  function formatInputDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function setDefaultFixedIncomeDates() {
    const today = new Date();
    const maturity = new Date(today);
    maturity.setFullYear(maturity.getFullYear() + 5);
    fixedApplicationDate.value = formatInputDate(today);
    fixedMaturityDate.value = formatInputDate(maturity);
  }

  function updateFixedIncomeFieldVisibility() {
    const isTreasury = fixedProduct.value === "Tesouro";
    if (isTreasury) fixedRateMode.value = "pre";
    const isPost = fixedRateMode.value === "post" && !isTreasury;
    fixedPostFields.forEach((f) => { f.hidden = !isPost; });
    fixedPreFields.forEach((f) => { f.hidden = isPost; });
    fixedRateMode.disabled = isTreasury;

    // Adapt post-rate field label and hint for CDI (% do CDI) vs IPCA (spread a.a.)
    if (isPost) {
      const indexerVal = document.querySelector("#fixedIndexer")?.value ?? "CDI";
      const lbl = document.querySelector('label[for="fixedPostRate"]');
      const hlp = document.querySelector("#fixedPostRateHelp");
      const inp = document.querySelector("#fixedPostRate");
      if (indexerVal === "IPCA") {
        if (lbl) lbl.textContent = "Spread (a.a.)";
        if (hlp) hlp.textContent = "Taxa adicional sobre o IPCA. Ex: IPCA + 5,00%.";
        if (inp && /^(100%|100,00%)$/.test(inp.value.trim())) inp.value = "5,00%";
      } else {
        if (lbl) lbl.textContent = "% do CDI";
        if (hlp) hlp.textContent = "Percentual do CDI. Ex: 120% do CDI.";
        if (inp && /^(5%|5,00%)$/.test(inp.value.trim())) inp.value = "100%";
      }
    }
  }

  const comparisonMetrics = [
    { key: "investedAmount", label: "Valor investido", fmt: formatCurrency, best: null },
    { key: "calendarDays", label: "Dias corridos", fmt: (v) => formatDecimal(v, 0), best: null },
    { key: "businessDays", label: "Dias úteis", fmt: (v) => formatDecimal(v, 0), best: null },
    { key: "totalAnnualRate", label: "Taxa total a.a.", fmt: (v) => formatPercent(v, 2), best: "max" },
    { key: "grossYield", label: "Rendimento bruto", fmt: formatCurrency, best: "max" },
    { key: "incomeTax", label: "IR retido", fmt: formatCurrency, best: "max" },
    { key: "iofTax", label: "IOF", fmt: formatCurrency, best: "max" },
    { key: "custodyFee", label: "Taxa de custódia", fmt: formatCurrency, best: "max" },
    { key: "netYield", label: "Rendimento líquido", fmt: formatCurrency, best: "max" },
    { key: "maturityTotal", label: "Total no vencimento", fmt: formatCurrency, best: "max" },
    { key: "relativeAnnualRate", label: "Taxa relativa a.a.", fmt: (v) => formatPercent(v, 2), best: "max" },
    { key: "netCdiRelative", label: "% CDI líquido", fmt: (v) => formatPercent(v, 2), best: "max" },
  ];

  function renderFixedIncomeComparison() {
    if (!fixedIncomeResult) return;

    if (fixedSimulations.length === 0) {
      fixedIncomeResult.innerHTML = `
        <h3>Comparador de simulações</h3>
        <p>Preencha os dados e clique em <strong>Calcular</strong> para adicionar uma simulação. Adicione várias e compare lado a lado.</p>
      `;
      return;
    }

    const headerCols = fixedSimulations.map(({ id, result }, ci) =>
      `<th>${result.product} #${ci + 1}<button class="comparison-remove" data-id="${id}" type="button" aria-label="Remover simulação ${ci + 1}">×</button></th>`
    ).join("");

    const bodyRows = comparisonMetrics.map(({ key, label, fmt, best }) => {
      const vals = fixedSimulations.map(({ result }) => result[key]);
      const bestVal = best === "max" && fixedSimulations.length > 1 ? Math.max(...vals) : null;
      const worstVal = best === "max" && fixedSimulations.length > 1 ? Math.min(...vals) : null;
      const cells = vals.map((v) => {
        const cls = v === bestVal ? "best-value" : v === worstVal ? "worst-value" : "";
        return `<td${cls ? ` class="${cls}"` : ""}>${fmt(v)}</td>`;
      }).join("");
      return `<tr><td class="comparison-label">${label}</td>${cells}</tr>`;
    }).join("");

    const clearBtn = fixedSimulations.length > 1
      ? `<button class="comparison-clear-btn" id="fixedClearAll" type="button">Limpar tudo</button>` : "";

    fixedIncomeResult.innerHTML = `
      <div class="comparison-panel">
        <div class="comparison-header">
          <h3>Comparador de simulações <span class="comparison-count">${fixedSimulations.length}</span></h3>
          ${clearBtn}
        </div>
        <div class="comparison-table-wrap">
          <table class="comparison-table" aria-label="Comparação de simulações de renda fixa">
            <thead><tr><th>Métrica</th>${headerCols}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
      </div>
    `;

    fixedIncomeResult.querySelectorAll(".comparison-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const idx = fixedSimulations.findIndex((s) => s.id === id);
        if (idx >= 0) { fixedSimulations.splice(idx, 1); renderFixedIncomeComparison(); }
      });
    });

    const clearAllBtn = fixedIncomeResult.querySelector("#fixedClearAll");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => {
        fixedSimulations.length = 0;
        renderFixedIncomeComparison();
      });
    }
  }

  setDefaultFixedIncomeDates();
  updateFixedIncomeFieldVisibility();

  loadMarketIndicators().then((indicators) => {
    if (!indicators) return;
    setPercentInputValue(fixedIpcaRate, indicators.ipcaLastTwelveMonths, 2);
    setPercentInputValue(fixedCdiRate, indicators.cdiAnnual, 2);
  });

  fixedIncomeForm.querySelectorAll("input, select").forEach((field) => {
    const eventName = field.tagName === "SELECT" || field.type === "date" ? "change" : "input";
    field.addEventListener(eventName, updateFixedIncomeFieldVisibility);
  });

  fixedIncomeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = calculateFixedIncome();
    if (result.invalid) {
      fixedIncomeResult.innerHTML = `<h3>Dados inválidos</h3><p>${result.message}</p>`;
      return;
    }
    simCounter += 1;
    fixedSimulations.push({ id: simCounter, result });
    renderFixedIncomeComparison();
  });
}

// ── Valuation de FII ─────────────────────────────────────────────────────────
// Réplica exata da planilha "Como saber se um FII está caro" (validada com 2 cenários).
const fiiForm = document.querySelector("#fiiForm");
const fiiResult = document.querySelector("#fiiResult");
const fiiComparison = document.querySelector("#fiiComparison");

if (fiiForm && fiiResult) {
  const fiiSnapshots = [];
  let fiiCounter = 0;

  function readFiiInputs() {
    const value = (sel) => document.querySelector(sel).value;
    return {
      ticker: (value("#fiiTicker") || "FII").trim().toUpperCase(),
      price: parseNumber(value("#fiiPrice")),                          // B3
      dividend: parseNumber(value("#fiiDividend")),                    // B4
      growth: parseNumber(value("#fiiGrowth")) / 100,                  // B5 (informativo, não entra no cálculo)
      ntnbReal: parseNumber(value("#fiiNtnbReal")) / 100,              // B6
      ipca: parseNumber(value("#fiiIpca")) / 100,                      // B7
      irNtnb: parseNumber(value("#fiiIrNtnb")) / 100,                  // B8
      desiredPremium: parseNumber(value("#fiiDesiredPremium")) / 100,  // B9
      safetyMargin: parseNumber(value("#fiiSafetyMargin")) / 100,      // B10
      tax: parseNumber(value("#fiiTax")) / 100,                        // B11
      maturity: value("#fiiMaturity"),                                 // B12
    };
  }

  function calculateFii(i) {
    const dyMonthlyGross = i.price > 0 ? i.dividend / i.price : 0;                       // F3
    const dyMonthlyNet = dyMonthlyGross * (1 - i.tax);
    const dyCashAnnual = dyMonthlyNet * 12;                                              // F4
    const dyCompound = Math.pow(1 + dyMonthlyNet, 12) - 1;                               // F5
    const ntnbGross = (1 + i.ntnbReal) * (1 + i.ipca) - 1;                               // F6
    const ntnbNet = ntnbGross * (1 - i.irNtnb);                                          // F7
    const fiiReturn = (1 + dyCashAnnual) * (1 + i.ipca) - 1;                             // F8
    const premiumNominal = fiiReturn - ntnbNet;                                         // F9
    const premiumAdjusted = dyCompound - ntnbNet;                                       // F10
    const requiredReturn = ntnbNet + i.desiredPremium;                                  // F11
    const dyCashRequired = Math.max(0, (1 + requiredReturn) / (1 + i.ipca) - 1);        // F12
    const annualDividendNet = i.dividend * 12 * (1 - i.tax);
    const ceilingPrice = dyCashRequired > 0                                             // F13
      ? (annualDividendNet / dyCashRequired) * (1 - i.safetyMargin)
      : 0;
    const zeroDenom = Math.max(0.000001, (1 + ntnbNet) / (1 + i.ipca) - 1);
    const zeroPremiumPrice = annualDividendNet / zeroDenom;                              // F14
    const upside = i.price > 0 ? ceilingPrice / i.price - 1 : 0;                         // F15
    const cheap = i.price < ceilingPrice;                                               // F16
    return {
      ...i, dyMonthlyGross, dyCashAnnual, dyCompound, ntnbGross, ntnbNet, fiiReturn,
      premiumNominal, premiumAdjusted, requiredReturn, dyCashRequired, ceilingPrice,
      zeroPremiumPrice, upside, cheap,
    };
  }

  function renderFiiEvaluation(r) {
    const valid = r.price > 0 && r.dividend > 0;

    window.getRaioXPayload = () => (r.price > 0 && r.dividend > 0) ? {
      tipo: "fii",
      ticker: r.ticker || "FII",
      contexto: [
        `Preço da cota: ${formatCurrency(r.price)}`,
        `Dividendo mensal: ${formatCurrency(r.dividend)}`,
        `DY mensal: ${formatPercent(r.dyMonthlyGross, 2)} | DY anual (caixa): ${formatPercent(r.dyCashAnnual, 2)}`,
        `Preço-teto calculado: ${formatCurrency(r.ceilingPrice)}`,
        `Preço com prêmio zero vs NTN-B: ${formatCurrency(r.zeroPremiumPrice)}`,
        `Upside até o teto: ${formatPercent(r.upside, 2)}`,
        `Situação: ${r.cheap ? "BARATO (cotação abaixo do preço-teto)" : "CARO (cotação acima do preço-teto)"}`,
        `Prêmio sobre a NTN-B (ajustado): ${formatPercent(r.premiumAdjusted, 2)}`,
        `Premissas: NTN-B real ${formatPercent(r.ntnbReal, 2)}, IPCA ${formatPercent(r.ipca, 2)}, prêmio desejado ${formatPercent(r.desiredPremium, 2)}`,
      ].join("\n"),
    } : null;

    if (!valid) {
      fiiResult.innerHTML = `
        <h3>Avaliação do FII</h3>
        <p>Informe um <strong>preço da cota</strong> e um <strong>dividendo mensal</strong> válidos para ver os indicadores.</p>`;
      return;
    }

    const statusClass = r.cheap ? "is-cheap" : "is-expensive";
    const statusText = r.cheap ? "Barato" : "Caro";
    const good = "#0f766e";
    const bad = "#dc2626";
    const upColor = r.upside >= 0 ? good : bad;

    const refMax = Math.max(r.price, r.ceilingPrice, r.zeroPremiumPrice, 0.01);
    const bar = (label, value, cls) => {
      const w = Math.max(2, Math.min(100, (value / refMax) * 100));
      return `
        <div class="fii-ref-row">
          <span class="fii-ref-label">${label}</span>
          <div class="fii-ref-track"><div class="fii-ref-fill ${cls}" style="width:${w.toFixed(1)}%"></div></div>
          <span class="fii-ref-value">${formatCurrency(value)}</span>
        </div>`;
    };
    const metric = (label, value, opts = {}) => `
      <div class="result-metric${opts.highlight ? " is-highlight" : ""}">
        <span>${label}</span>
        <strong${opts.color ? ` style="color:${opts.color}"` : ""}>${value}</strong>
      </div>`;

    fiiResult.innerHTML = `
      <div class="fii-eval">
        <div class="fii-eval-head">
          <div>
            <h3 style="display:flex;align-items:center;gap:10px">${r.ticker || "FII"} ${investidor10Link(r.ticker, "fii")}</h3>
            <p class="fii-eval-sub">Preço atual ${formatCurrency(r.price)} · Preço-teto ${formatCurrency(r.ceilingPrice)}</p>
          </div>
          <span class="fii-status-badge ${statusClass}">${statusText}</span>
        </div>

        <div class="fii-highlight-grid">
          ${metric("Preço atual", formatCurrency(r.price), { highlight: true })}
          ${metric("Preço-teto", formatCurrency(r.ceilingPrice), { highlight: true })}
          ${metric("Upside até teto", formatPercent(r.upside, 2), { highlight: true, color: upColor })}
        </div>

        <div class="fii-ref-block">
          <h4>Preço atual × preços de referência</h4>
          ${bar("Preço atual", r.price, "is-now")}
          ${bar("Preço-teto c/ IPCA estrutural", r.ceilingPrice, "is-ceiling")}
          ${bar("Preço prêmio zero", r.zeroPremiumPrice, "is-zero")}
        </div>

        <h4>Indicadores</h4>
        <div class="result-grid fii-indicator-grid">
          ${metric("Dividend yield mensal", formatPercent(r.dyMonthlyGross, 2))}
          ${metric("Dividend yield anual caixa", formatPercent(r.dyCashAnnual, 2))}
          ${metric("DY anual composto", formatPercent(r.dyCompound, 2))}
          ${metric("NTN-B nominal bruta estimada", formatPercent(r.ntnbGross, 2))}
          ${metric("NTN-B nominal líquida após IR", formatPercent(r.ntnbNet, 2))}
          ${metric("Retorno nominal estimado do FII", formatPercent(r.fiiReturn, 2))}
          ${metric("Prêmio nominal atual do FII", formatPercent(r.premiumNominal, 2), { color: r.premiumNominal >= 0 ? good : bad })}
          ${metric("Prêmio AJUSTADO atual do FII", formatPercent(r.premiumAdjusted, 2), { color: r.premiumAdjusted >= 0 ? good : bad })}
          ${metric("Retorno nominal requerido", formatPercent(r.requiredReturn, 2))}
          ${metric("DY caixa requerido do FII", formatPercent(r.dyCashRequired, 2))}
          ${metric("Preço para prêmio zero", formatCurrency(r.zeroPremiumPrice))}
          ${metric("Crescimento informado", formatPercent(r.growth, 2))}
        </div>
      </div>`;
  }

  const fiiComparisonMetrics = [
    { key: "price", label: "Preço atual", fmt: formatCurrency, best: null },
    { key: "dyCashAnnual", label: "DY anual caixa", fmt: (v) => formatPercent(v, 2), best: "max" },
    { key: "dyCompound", label: "DY composto", fmt: (v) => formatPercent(v, 2), best: "max" },
    { key: "premiumNominal", label: "Prêmio nominal", fmt: (v) => formatPercent(v, 2), best: "max" },
    { key: "premiumAdjusted", label: "Prêmio ajustado", fmt: (v) => formatPercent(v, 2), best: "max" },
    { key: "ceilingPrice", label: "Preço-teto", fmt: formatCurrency, best: null },
    { key: "zeroPremiumPrice", label: "Preço prêmio zero", fmt: formatCurrency, best: null },
    { key: "upside", label: "Upside até teto", fmt: (v) => formatPercent(v, 2), best: "max" },
  ];

  function renderFiiComparison() {
    if (!fiiComparison) return;
    if (fiiSnapshots.length === 0) {
      fiiComparison.hidden = true;
      fiiComparison.innerHTML = "";
      return;
    }
    fiiComparison.hidden = false;

    const headerCols = fiiSnapshots.map(({ id, result }) =>
      `<th>${result.ticker || "FII"}<button class="comparison-remove" data-id="${id}" type="button" aria-label="Remover ${result.ticker}">×</button></th>`
    ).join("");

    const bodyRows = fiiComparisonMetrics.map(({ key, label, fmt, best }) => {
      const vals = fiiSnapshots.map(({ result }) => result[key]);
      const bestVal = best === "max" && fiiSnapshots.length > 1 ? Math.max(...vals) : null;
      const worstVal = best === "max" && fiiSnapshots.length > 1 ? Math.min(...vals) : null;
      const cells = vals.map((v) => {
        const cls = v === bestVal ? "best-value" : v === worstVal ? "worst-value" : "";
        return `<td${cls ? ` class="${cls}"` : ""}>${fmt(v)}</td>`;
      }).join("");
      return `<tr><td class="comparison-label">${label}</td>${cells}</tr>`;
    }).join("");

    const statusCells = fiiSnapshots.map(({ result }) =>
      `<td><span class="fii-status-pill ${result.cheap ? "is-cheap" : "is-expensive"}">${result.cheap ? "Barato" : "Caro"}</span></td>`
    ).join("");

    const clearBtn = fiiSnapshots.length > 1
      ? `<button class="comparison-clear-btn" id="fiiClearAll" type="button">Limpar tudo</button>` : "";

    fiiComparison.innerHTML = `
      <div class="comparison-panel">
        <div class="comparison-header">
          <h3>Comparador de FIIs <span class="comparison-count">${fiiSnapshots.length}</span></h3>
          ${clearBtn}
        </div>
        <div class="comparison-table-wrap">
          <table class="comparison-table" aria-label="Comparação de FIIs">
            <thead><tr><th>Métrica</th>${headerCols}</tr></thead>
            <tbody>${bodyRows}<tr><td class="comparison-label">Status</td>${statusCells}</tr></tbody>
          </table>
        </div>
      </div>`;

    fiiComparison.querySelectorAll(".comparison-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const idx = fiiSnapshots.findIndex((s) => s.id === id);
        if (idx >= 0) { fiiSnapshots.splice(idx, 1); renderFiiComparison(); }
      });
    });
    const clearAll = fiiComparison.querySelector("#fiiClearAll");
    if (clearAll) {
      clearAll.addEventListener("click", () => { fiiSnapshots.length = 0; renderFiiComparison(); });
    }
  }

  function updateFiiLive() {
    renderFiiEvaluation(calculateFii(readFiiInputs()));
  }

  fiiForm.querySelectorAll("input, select").forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, updateFiiLive);
  });

  loadMarketIndicators().then((indicators) => {
    if (!indicators) return;
    const ipcaField = document.querySelector("#fiiIpca");
    if (ipcaField && Number.isFinite(indicators.ipcaLastTwelveMonths)) {
      setPercentInputValue(ipcaField, indicators.ipcaLastTwelveMonths, 2);
    }
    // NTN-B curta real ≈ juro real de curto prazo livre de risco = (1+CDI)/(1+IPCA) − 1.
    // Derivado dos dados vivos do Banco Central — antes era um valor fixo só rotulado de "automático".
    const ntnbField = document.querySelector("#fiiNtnbReal");
    if (ntnbField && Number.isFinite(indicators.cdiAnnual) && Number.isFinite(indicators.ipcaLastTwelveMonths)) {
      const realRate = (1 + indicators.cdiAnnual) / (1 + indicators.ipcaLastTwelveMonths) - 1;
      setPercentInputValue(ntnbField, realRate, 2);
      FIELD_GUIDES.fiiNtnbReal.onde =
        `Calculada a partir do CDI (≈ ${formatPercent(indicators.cdiAnnual, 1)}) e do IPCA (${formatPercent(indicators.ipcaLastTwelveMonths, 1)}) atuais do Banco Central: é o juro real de curto prazo livre de risco.`;
    }
    updateFiiLive();
  });

  fiiForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = calculateFii(readFiiInputs());
    if (!(result.price > 0) || !(result.dividend > 0)) {
      renderFiiEvaluation(result);
      return;
    }
    fiiCounter += 1;
    fiiSnapshots.push({ id: fiiCounter, result });
    renderFiiComparison();
    fiiComparison.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  updateFiiLive();
}

// ── "Como usar" modal ────────────────────────────────────────────────────────

(function setupHowToUse() {
  const menu = document.querySelector("#helpMenu");
  if (!menu) return;

  // Inject "Como usar" button at top of help menu
  const btn = document.createElement("button");
  btn.textContent = "Como usar";
  btn.setAttribute("role", "menuitem");
  btn.type = "button";
  menu.insertBefore(btn, menu.firstChild);

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "howToUseTitle");
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2 id="howToUseTitle">Como usar</h2>
        <button class="modal-close" type="button" aria-label="Fechar">×</button>
      </div>
      <div class="modal-body" id="howToUseBody"></div>
    </div>`;
  document.body.appendChild(overlay);

  function closeModal() { overlay.hidden = true; btn.focus(); }
  overlay.querySelector(".modal-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (ev) => { if (ev.target === overlay) closeModal(); });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !overlay.hidden) closeModal(); });

  function getContent() {
    const t = document.title;
    if (t.includes("Juros Compostos")) return `
      <p>A <strong>Calculadora de Juros Compostos</strong> simula o crescimento do seu patrimônio ao longo do tempo com aportes mensais regulares.</p>
      <ol>
        <li>Informe o <strong>investimento inicial</strong> — o capital disponível hoje.</li>
        <li>Defina os <strong>aportes mensais</strong> — o valor que você adicionará todo mês.</li>
        <li>Configure o <strong>período</strong> de simulação (meses ou anos) e a <strong>taxa de rendimento</strong> (mensal ou anual).</li>
        <li>Opcional: informe a <strong>expectativa de renda passiva</strong> para ver o progresso da sua meta.</li>
        <li>Clique em <strong>Calcular</strong>. Os resultados atualizam automaticamente ao alterar qualquer campo.</li>
      </ol>
      <p>O <strong>gráfico de barras</strong> mostra a evolução período a período, com barras divididas em: <strong style="color:#1e40af">capital investido</strong>, <strong style="color:#3b82f6">juros acumulados</strong> e <strong style="color:#93c5fd">juros do período</strong>. Passe o mouse sobre as barras para ver os detalhes.</p>`;
    if (t.includes("Conversor")) return `
      <p>O <strong>Conversor de Taxas</strong> transforma qualquer taxa de juros entre os períodos: diária, semanal, mensal, semestral e anual — automaticamente.</p>
      <ol>
        <li>Insira a taxa no campo de entrada.</li>
        <li>Selecione o <strong>tipo da taxa</strong> (ex: mensal, anual).</li>
        <li>Os valores convertidos aparecem instantaneamente para todos os outros períodos.</li>
      </ol>
      <p>O cálculo usa <strong>taxa corrida</strong> (equivalência composta), o método matematicamente correto. Por isso, 9% ao mês equivale a 0,288% ao dia — não 0,300% (que seria a proporção simples sem juros compostos).</p>`;
    if (t.includes("Aposentadoria")) return `
      <p>O <strong>Plano de Aposentadoria</strong> projeta o mês em que seus dividendos cobrem todo o seu custo de vida, considerando inflação e crescimento anual dos aportes.</p>
      <ol>
        <li>Informe <strong>investimento inicial</strong>, <strong>aportes mensais</strong> e a <strong>taxa de rendimento</strong>.</li>
        <li>Defina o <strong>custo de vida mensal</strong> desejado e a <strong>inflação anual</strong> esperada.</li>
        <li>Configure o <strong>aumento anual dos aportes</strong> (recomendado: ao menos o IPCA).</li>
        <li>Clique em <strong>Calcular</strong> para ver a projeção detalhada.</li>
      </ol>
      <p>O <strong>gráfico</strong> mostra dividendos vs custo de vida ao longo dos anos. Passe o mouse pelo gráfico para ver os valores de cada ano com um guia vertical. O cruzamento das linhas marca a <strong>independência financeira</strong>.</p>`;
    if (t.includes("Renda Fixa")) return `
      <p>O <strong>Investimento Renda Fixa</strong> simula títulos com as mesmas regras da planilha: dias úteis, feriados, IR regressivo, IOF e taxa de custódia do Tesouro.</p>
      <ol>
        <li>Selecione o <strong>produto</strong>: CDB, LCI/LCA, CRI/CRA ou Tesouro Direto.</li>
        <li>Informe as <strong>datas</strong> de aplicação e vencimento, e o <strong>valor investido</strong>.</li>
        <li>Para <strong>pós-fixado CDI</strong>: campo "% do CDI" (ex: 120% = 120% do CDI).</li>
        <li>Para <strong>pós-fixado IPCA</strong>: campo "Spread (a.a.)" (ex: 5,00% = IPCA + 5%).</li>
        <li>Para <strong>pré-fixado</strong>: informe a taxa anual diretamente.</li>
        <li>Clique em <strong>Calcular</strong> para adicionar a simulação ao comparador.</li>
      </ol>
      <p>Adicione múltiplas simulações para comparar investimentos lado a lado. O melhor valor de cada linha fica destacado em <strong style="color:#2563eb">azul</strong>. Use o botão <strong>×</strong> para remover simulações individuais.</p>`;
    if (t.includes("Valuation")) return `
      <p>O <strong>Valuation de FII</strong> indica se um fundo imobiliário está <strong>barato ou caro</strong> comparando o retorno dos dividendos com o de uma NTN-B (Tesouro IPCA+), exigindo um prêmio de risco.</p>
      <ol>
        <li>Informe o <strong>ticker</strong>, o <strong>preço da cota</strong> e o <strong>dividendo mensal</strong> esperado por cota (aceita centavos, ex.: 0,083).</li>
        <li>Ajuste as premissas: <strong>NTN-B real</strong>, <strong>IPCA</strong> (já vem do Banco Central), <strong>IR</strong>, <strong>prêmio desejado</strong>, margem de segurança e tributação do FII.</li>
        <li>A avaliação é recalculada <strong>automaticamente</strong> enquanto você digita.</li>
        <li>Clique em <strong>Adicionar à comparação</strong> para guardar o FII e comparar vários lado a lado.</li>
      </ol>
      <p>O <strong>preço-teto</strong> é o valor máximo que entrega o retorno requerido: acima dele o FII fica <strong style="color:#dc2626">Caro</strong>, abaixo fica <strong style="color:#0f766e">Barato</strong>. O <strong>prêmio AJUSTADO</strong> usa o DY composto (mais conservador) contra a NTN-B líquida, sem assumir ganho de capital com a inflação.</p>`;
    return `<p>Selecione uma ferramenta para ver as instruções de uso.</p>`;
  }

  btn.addEventListener("click", () => {
    setHelpMenuOpen(false);
    document.querySelector("#howToUseBody").innerHTML = getContent();
    overlay.hidden = false;
    overlay.querySelector(".modal-close").focus();
  });
}());

// ── Valuation de Ações ───────────────────────────────────────────────────────
const acoesForm = document.querySelector("#acoesForm");
const acoesResult = document.querySelector("#acoesResult");
const acoesComparison = document.querySelector("#acoesComparison");

if (acoesForm && acoesResult) {
  const acoesSnapshots = [];
  let acoesCounter = 0;

  function readAcoesInputs() {
    const v = (sel) => document.querySelector(sel).value;
    return {
      ticker: (v("#acoesTicker") || "AÇÃO").trim().toUpperCase(),
      cotacao: parseNumber(v("#acoesCotacao")),
      lpa: parseNumber(v("#acoesLpa")),
      vpa: parseNumber(v("#acoesVpa")),
      dpa: parseNumber(v("#acoesDpa")),
      crescLucro: parseNumber(v("#acoesCrescLucro")) / 100,
      fcl: parseNumber(v("#acoesFcl")),
      wacc: parseNumber(v("#acoesWacc")) / 100,
      crescFcl: parseNumber(v("#acoesCrescFcl")) / 100,
      crescTerminal: parseNumber(v("#acoesCrescTerminal")) / 100,
      prazoDcf: Math.max(1, Math.min(30, Math.round(parseNumber(v("#acoesPrazoDcf"))))),
      dyMinBazin: parseNumber(v("#acoesDyMinBazin")) / 100,
      margemSeg: parseNumber(v("#acoesMargemSeg")) / 100,
    };
  }

  function calculateAcoes(i) {
    const pl = i.lpa > 0 ? i.cotacao / i.lpa : null;
    const pvp = i.vpa > 0 ? i.cotacao / i.vpa : null;
    const dyAtual = i.cotacao > 0 ? i.dpa / i.cotacao : 0;

    // Bazin: preço justo = DPA / DY_minimo
    const precoBazin = i.dyMinBazin > 0 ? i.dpa / i.dyMinBazin : null;
    const precoBazinMS = precoBazin ? precoBazin * (1 - i.margemSeg) : null;
    const bazinOk = precoBazinMS !== null && i.cotacao <= precoBazinMS;

    // Graham: VI = sqrt(22.5 * LPA * VPA) — aplicável se LPA > 0 e VPA > 0
    const precoGraham = i.lpa > 0 && i.vpa > 0 ? Math.sqrt(22.5 * i.lpa * i.vpa) : null;
    const precoGrahamMS = precoGraham ? precoGraham * (1 - i.margemSeg) : null;
    const grahamOk = precoGrahamMS !== null && i.cotacao <= precoGrahamMS;

    // Peter Lynch / PEG: PEG = P/L / crescimento (crescimento em %)
    const crescLucroPct = i.crescLucro * 100;
    const peg = pl !== null && crescLucroPct > 0 ? pl / crescLucroPct : null;
    let lynchStatus = "neutral";
    if (peg !== null) {
      if (peg < 1) lynchStatus = "cheap";
      else if (peg <= 2) lynchStatus = "warning";
      else lynchStatus = "expensive";
    }

    // DCF multi-período: FCL cresce a crescFcl por prazoDcf anos, depois perpetuidade a crescTerminal
    let precoDcf = null;
    if (i.fcl > 0 && i.wacc > i.crescTerminal && i.wacc > 0) {
      let pvFluxos = 0;
      let fclT = i.fcl;
      for (let t = 1; t <= i.prazoDcf; t++) {
        fclT *= (1 + i.crescFcl);
        pvFluxos += fclT / Math.pow(1 + i.wacc, t);
      }
      const valorTerminal = (fclT * (1 + i.crescTerminal)) / (i.wacc - i.crescTerminal);
      const pvTerminal = valorTerminal / Math.pow(1 + i.wacc, i.prazoDcf);
      precoDcf = pvFluxos + pvTerminal;
    }
    const precoDcfMS = precoDcf ? precoDcf * (1 - i.margemSeg) : null;
    const dcfOk = precoDcfMS !== null && i.cotacao <= precoDcfMS;

    // Upsides
    const upsideBazin = precoBazinMS && i.cotacao > 0 ? precoBazinMS / i.cotacao - 1 : null;
    const upsideGraham = precoGrahamMS && i.cotacao > 0 ? precoGrahamMS / i.cotacao - 1 : null;
    const upsideDcf = precoDcfMS && i.cotacao > 0 ? precoDcfMS / i.cotacao - 1 : null;

    return {
      ...i, pl, pvp, dyAtual,
      precoBazin, precoBazinMS, bazinOk, upsideBazin,
      precoGraham, precoGrahamMS, grahamOk, upsideGraham,
      peg, lynchStatus,
      precoDcf, precoDcfMS, dcfOk, upsideDcf,
    };
  }

  function methodBadge(ok, label) {
    if (label === "neutral") return `<span class="method-status-badge is-neutral">Indefinido</span>`;
    if (label === "warning") return `<span class="method-status-badge is-warning">Razoável</span>`;
    if (ok === null)  return `<span class="method-status-badge is-neutral">Sem dados</span>`;
    return ok
      ? `<span class="method-status-badge is-cheap">Barato</span>`
      : `<span class="method-status-badge is-expensive">Caro</span>`;
  }

  function renderAcoesResult(r) {
    const valid = r.cotacao > 0;
    if (!valid) {
      acoesResult.innerHTML = `<p style="color:var(--muted);font-size:.9rem">Informe uma cotação válida.</p>`;
      return;
    }
    const c = formatCurrency;
    const p = (v, d = 2) => v !== null ? formatPercent(v, d) : "—";
    const n2 = (v) => v !== null && Number.isFinite(v) ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

    const upsideColor = (u) => u === null ? "var(--muted)" : u >= 0 ? "var(--success)" : "var(--danger)";

    const overallBuy = [r.bazinOk, r.grahamOk, r.dcfOk].filter(Boolean).length;
    const total = [r.bazinOk, r.grahamOk, r.dcfOk].filter(v => v !== null).length;

    window.acoesLastResult = r;

    // ── Veredito principal (hierarquia visual: preço atual → justo → diferença → status) ──
    const fairCandidates = [r.precoBazinMS, r.precoGrahamMS, r.precoDcfMS].filter((x) => Number.isFinite(x) && x > 0);
    let fairFallback = [r.precoBazin, r.precoGraham, r.precoDcf].filter((x) => Number.isFinite(x) && x > 0);
    const fairSet = fairCandidates.length ? fairCandidates : fairFallback;
    let fairAvg = null;
    if (fairSet.length) {
      const sorted = [...fairSet].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      fairAvg = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    const diff = fairAvg && r.cotacao > 0 ? fairAvg / r.cotacao - 1 : null;
    let vStatus = "is-neutral", vLabel = "Sem dados", vDot = "⚪";
    if (diff !== null) {
      if (diff >= 0.10) { vStatus = "is-cheap"; vLabel = "Barata"; vDot = "🟢"; }
      else if (diff <= -0.10) { vStatus = "is-expensive"; vLabel = "Cara"; vDot = "🔴"; }
      else { vStatus = "is-neutral"; vLabel = "Preço justo"; vDot = "🟡"; }
    }
    const diffColor = diff === null ? "var(--muted)" : diff >= 0 ? "var(--success)" : "var(--danger)";
    const verdictHtml = `
      <div class="val-verdict ${vStatus}">
        <div class="vv-grid">
          <div class="vv-item">
            <span class="vv-k">Preço atual</span>
            <strong class="vv-v">${c(r.cotacao)}</strong>
          </div>
          <div class="vv-item vv-fair">
            <span class="vv-k">Preço justo médio</span>
            <strong class="vv-v">${fairAvg !== null ? c(fairAvg) : "—"}</strong>
          </div>
          <div class="vv-item">
            <span class="vv-k">Diferença</span>
            <strong class="vv-v" style="color:${diffColor}">${diff !== null ? (diff >= 0 ? "+" : "") + p(diff) : "—"}</strong>
          </div>
          <div class="vv-item vv-statuscell">
            <span class="vv-k">Veredito</span>
            <span class="vv-badge ${vStatus}">${vDot} ${vLabel}</span>
          </div>
        </div>
        <details class="vv-how">
          <summary>Como esse valor foi calculado?</summary>
          <div class="vv-how-body">
            <p>O <strong>preço justo médio</strong> é a mediana dos preços justos (já com margem de segurança) dos métodos que puderam ser calculados:</p>
            <ul>
              <li>Bazin (renda): ${r.precoBazinMS !== null ? c(r.precoBazinMS) : "—"}</li>
              <li>Graham (valor intrínseco): ${r.precoGrahamMS !== null ? c(r.precoGrahamMS) : "—"}</li>
              <li>DCF (fluxo de caixa): ${r.precoDcfMS !== null ? c(r.precoDcfMS) : "—"}</li>
            </ul>
            <p>A <strong>diferença</strong> compara esse preço justo com a cotação atual. Acima de +10% sugere ação barata; abaixo de −10%, cara; no meio, preço justo. Veja cada método em detalhe abaixo.</p>
          </div>
        </details>
      </div>`;

    window.getRaioXPayload = () => r.cotacao > 0 ? {
      tipo: "acao",
      ticker: r.ticker || "AÇÃO",
      contexto: [
        `Cotação: ${c(r.cotacao)}`,
        `P/L: ${n2(r.pl)} | P/VP: ${n2(r.pvp)} | DY atual: ${p(r.dyAtual)}`,
        `LPA: ${n2(r.lpa)} | VPA: ${n2(r.vpa)} | DPA: ${c(r.dpa)}`,
        `Bazin — preço justo c/ margem: ${r.precoBazinMS ? c(r.precoBazinMS) : "—"} → ${r.bazinOk ? "BARATO" : "caro"} (upside ${p(r.upsideBazin)})`,
        `Graham — preço justo c/ margem: ${r.precoGrahamMS ? c(r.precoGrahamMS) : "—"} → ${r.grahamOk ? "BARATO" : "caro"} (upside ${p(r.upsideGraham)})`,
        `Peter Lynch / PEG: ${r.peg !== null ? n2(r.peg) : "—"} (${r.lynchStatus})`,
        `DCF — preço justo c/ margem: ${r.precoDcfMS ? c(r.precoDcfMS) : "—"} → ${r.dcfOk ? "BARATO" : "caro"} (upside ${p(r.upsideDcf)})`,
        `Crescimento de lucro estimado: ${p(r.crescLucro)}`,
      ].join("\n"),
    } : null;

    acoesResult.innerHTML = `
      ${verdictHtml}
      <div class="fii-eval-head" style="margin-bottom:18px">
        <div>
          <h3 style="margin:0;font-size:1.25rem;font-weight:800;letter-spacing:-0.02em;display:flex;align-items:center;gap:10px">${r.ticker} ${investidor10Link(r.ticker, "acao")}</h3>
          <p style="margin:4px 0 0;color:var(--muted);font-size:.87rem">Cotação ${c(r.cotacao)} · DY ${p(r.dyAtual)} · P/L ${n2(r.pl)} · P/VP ${n2(r.pvp)}</p>
        </div>
        <span class="fii-status-badge ${overallBuy >= 2 ? "is-cheap" : overallBuy === 0 ? "is-expensive" : "is-neutral"}">
          ${overallBuy}/${total} métodos OK
        </span>
      </div>

      <div class="valuation-methods-grid">
        <!-- Bazin -->
        <div class="method-card bazin">
          <div class="method-card-head">
            <div>
              <div class="method-card-label">Método 1</div>
              <div class="method-card-name">Bazin — Renda</div>
            </div>
            ${methodBadge(r.bazinOk, r.bazinOk === null ? null : (r.bazinOk ? true : false))}
          </div>
          <div class="method-price-row">
            <div class="method-price-item">
              <span>Preço Justo</span>
              <strong>${r.precoBazin !== null ? c(r.precoBazin) : "—"}</strong>
            </div>
            <div class="method-price-item">
              <span>Com margem (${p(r.margemSeg,0)})</span>
              <strong>${r.precoBazinMS !== null ? c(r.precoBazinMS) : "—"}</strong>
            </div>
          </div>
          <div class="method-sub-metrics">
            <div class="method-sub-metric"><span>DY atual: </span><strong>${p(r.dyAtual)}</strong></div>
            <div class="method-sub-metric"><span>DY mín: </span><strong>${p(r.dyMinBazin,0)}</strong></div>
            <div class="method-sub-metric"><span>Upside: </span><strong style="color:${upsideColor(r.upsideBazin)}">${r.upsideBazin !== null ? p(r.upsideBazin) : "—"}</strong></div>
          </div>
          <div class="method-formula">Preço Justo = DPA ÷ DY_mínimo &nbsp;→&nbsp; ${c(r.dpa)} ÷ ${p(r.dyMinBazin,0)}</div>
        </div>

        <!-- Graham -->
        <div class="method-card graham">
          <div class="method-card-head">
            <div>
              <div class="method-card-label">Método 2</div>
              <div class="method-card-name">Graham — Valor Intrínseco</div>
            </div>
            ${methodBadge(r.grahamOk, r.precoGraham === null ? null : (r.grahamOk ? true : false))}
          </div>
          <div class="method-price-row">
            <div class="method-price-item">
              <span>Valor Intrínseco</span>
              <strong>${r.precoGraham !== null ? c(r.precoGraham) : "—"}</strong>
            </div>
            <div class="method-price-item">
              <span>Com margem (${p(r.margemSeg,0)})</span>
              <strong>${r.precoGrahamMS !== null ? c(r.precoGrahamMS) : "—"}</strong>
            </div>
          </div>
          <div class="method-sub-metrics">
            <div class="method-sub-metric"><span>LPA: </span><strong>${c(r.lpa)}</strong></div>
            <div class="method-sub-metric"><span>VPA: </span><strong>${c(r.vpa)}</strong></div>
            <div class="method-sub-metric"><span>Upside: </span><strong style="color:${upsideColor(r.upsideGraham)}">${r.upsideGraham !== null ? p(r.upsideGraham) : "—"}</strong></div>
          </div>
          <div class="method-formula">VI = √(22,5 × LPA × VPA) &nbsp;→&nbsp; √(22,5 × ${c(r.lpa)} × ${c(r.vpa)})</div>
        </div>

        <!-- Peter Lynch / PEG -->
        <div class="method-card lynch">
          <div class="method-card-head">
            <div>
              <div class="method-card-label">Método 3</div>
              <div class="method-card-name">Peter Lynch — PEG</div>
            </div>
            ${methodBadge(r.lynchStatus === "cheap", r.lynchStatus)}
          </div>
          <div class="method-price-row">
            <div class="method-price-item">
              <span>PEG Ratio</span>
              <strong>${r.peg !== null ? n2(r.peg) : "—"}</strong>
            </div>
            <div class="method-price-item">
              <span>P/L atual</span>
              <strong>${n2(r.pl)}</strong>
            </div>
          </div>
          <div class="method-sub-metrics">
            <div class="method-sub-metric"><span>Cresc. lucro: </span><strong>${p(r.crescLucro)}</strong></div>
            <div class="method-sub-metric"><span>PEG &lt; 1 → Barato · 1–2 → Razoável · &gt; 2 → Caro</span></div>
          </div>
          <div class="method-formula">PEG = P/L ÷ crescimento_lucro(%) &nbsp;→&nbsp; ${n2(r.pl)} ÷ ${(r.crescLucro * 100).toFixed(1)}</div>
        </div>

        <!-- DCF -->
        <div class="method-card dcf">
          <div class="method-card-head">
            <div>
              <div class="method-card-label">Método 4</div>
              <div class="method-card-name">DCF — Fluxo de Caixa Descontado</div>
            </div>
            ${methodBadge(r.dcfOk, r.precoDcf === null ? null : (r.dcfOk ? true : false))}
          </div>
          <div class="method-price-row">
            <div class="method-price-item">
              <span>Valor Justo DCF</span>
              <strong>${r.precoDcf !== null ? c(r.precoDcf) : "—"}</strong>
            </div>
            <div class="method-price-item">
              <span>Com margem (${p(r.margemSeg,0)})</span>
              <strong>${r.precoDcfMS !== null ? c(r.precoDcfMS) : "—"}</strong>
            </div>
          </div>
          <div class="method-sub-metrics">
            <div class="method-sub-metric"><span>FCL/ação: </span><strong>${c(r.fcl)}</strong></div>
            <div class="method-sub-metric"><span>WACC: </span><strong>${p(r.wacc)}</strong></div>
            <div class="method-sub-metric"><span>Upside: </span><strong style="color:${upsideColor(r.upsideDcf)}">${r.upsideDcf !== null ? p(r.upsideDcf) : "—"}</strong></div>
          </div>
          <div class="method-formula">${r.prazoDcf} anos a ${p(r.crescFcl,0)} + perpetuidade a ${p(r.crescTerminal,0)} | WACC ${p(r.wacc,0)}</div>
        </div>
      </div>`;
  }

  const acoesComparisonMetrics = [
    { key: "cotacao",     label: "Cotação atual",    fmt: formatCurrency,               best: null },
    { key: "pl",          label: "P/L",              fmt: (v) => v !== null ? v.toLocaleString("pt-BR",{maximumFractionDigits:2}) : "—", best: null },
    { key: "pvp",         label: "P/VP",             fmt: (v) => v !== null ? v.toLocaleString("pt-BR",{maximumFractionDigits:2}) : "—", best: null },
    { key: "dyAtual",     label: "DY atual",         fmt: (v) => formatPercent(v, 2),   best: "max" },
    { key: "precoBazin",  label: "Preço Bazin",      fmt: (v) => v ? formatCurrency(v) : "—", best: null },
    { key: "precoGraham", label: "Preço Graham",     fmt: (v) => v ? formatCurrency(v) : "—", best: null },
    { key: "peg",         label: "PEG Ratio",        fmt: (v) => v !== null ? v.toLocaleString("pt-BR",{maximumFractionDigits:2}) : "—", best: "min" },
    { key: "precoDcf",    label: "Valor DCF",        fmt: (v) => v ? formatCurrency(v) : "—", best: null },
  ];

  function renderAcoesComparison() {
    if (!acoesComparison) return;
    if (acoesSnapshots.length === 0) { acoesComparison.hidden = true; return; }
    acoesComparison.hidden = false;

    const headerCols = acoesSnapshots.map(({ id, result }) =>
      `<th>${result.ticker}<button class="comparison-remove" data-id="${id}" type="button" aria-label="Remover ${result.ticker}">×</button></th>`
    ).join("");

    const bodyRows = acoesComparisonMetrics.map(({ key, label, fmt, best }) => {
      const vals = acoesSnapshots.map(({ result }) => result[key]);
      const numVals = vals.filter(v => typeof v === "number" && Number.isFinite(v));
      const bestVal = best === "max" && numVals.length > 1 ? Math.max(...numVals) : best === "min" && numVals.length > 1 ? Math.min(...numVals) : null;
      const worstVal = best === "max" && numVals.length > 1 ? Math.min(...numVals) : best === "min" && numVals.length > 1 ? Math.max(...numVals) : null;
      const cells = vals.map((v) => {
        const cls = v === bestVal ? "best-value" : v === worstVal ? "worst-value" : "";
        return `<td${cls ? ` class="${cls}"` : ""}>${fmt(v)}</td>`;
      }).join("");
      return `<tr><td class="comparison-label">${label}</td>${cells}</tr>`;
    }).join("");

    const statusCells = acoesSnapshots.map(({ result }) => {
      const ok = [result.bazinOk, result.grahamOk, result.dcfOk].filter(Boolean).length;
      const total = [result.bazinOk, result.grahamOk, result.dcfOk].filter(v => v !== null).length;
      return `<td>${ok}/${total} <span class="fii-status-pill ${ok >= 2 ? "is-cheap" : "is-expensive"}">${ok >= 2 ? "OK" : "Caro"}</span></td>`;
    }).join("");

    const clearBtn = acoesSnapshots.length > 1
      ? `<button class="comparison-clear-btn" id="acoesClearAll" type="button">Limpar tudo</button>` : "";

    acoesComparison.innerHTML = `
      <div class="comparison-panel">
        <div class="comparison-header">
          <h3>Comparador de Ações <span class="comparison-count">${acoesSnapshots.length}</span></h3>
          ${clearBtn}
        </div>
        <div class="comparison-table-wrap">
          <table class="comparison-table" aria-label="Comparação de ações">
            <thead><tr><th>Métrica</th>${headerCols}</tr></thead>
            <tbody>${bodyRows}<tr><td class="comparison-label">Consenso</td>${statusCells}</tr></tbody>
          </table>
        </div>
      </div>`;

    acoesComparison.querySelectorAll(".comparison-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const idx = acoesSnapshots.findIndex(s => s.id === id);
        if (idx >= 0) { acoesSnapshots.splice(idx, 1); renderAcoesComparison(); }
      });
    });
    const clearAll = acoesComparison.querySelector("#acoesClearAll");
    if (clearAll) clearAll.addEventListener("click", () => { acoesSnapshots.length = 0; renderAcoesComparison(); });
  }

  function updateAcoesLive() {
    renderAcoesResult(calculateAcoes(readAcoesInputs()));
  }

  acoesForm.querySelectorAll("input").forEach((f) => f.addEventListener("input", updateAcoesLive));
  acoesForm.querySelectorAll("select").forEach((f) => f.addEventListener("change", updateAcoesLive));

  acoesForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const result = calculateAcoes(readAcoesInputs());
    if (!(result.cotacao > 0)) return;
    acoesCounter += 1;
    acoesSnapshots.push({ id: acoesCounter, result });
    renderAcoesComparison();
    acoesComparison.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  updateAcoesLive();
}

// ── Stock Screening (Fundamentus) ─────────────────────────────────────────────
(function setupScreening() {
  if (!document.querySelector("#screeningContent")) return;
  if (document.querySelector("#screeningSegmento")) return; // FII page handled by setupFiiScreening

  const content = document.querySelector("#screeningContent");
  const loading = document.querySelector("#screeningLoading");
  const searchEl = document.querySelector("#screeningSearch");
  const sortEl = document.querySelector("#screeningSort");
  const filterEl = document.querySelector("#screeningFilter");
  const statEl = document.querySelector("#screeningStat");
  const refreshBtn = document.querySelector("#screeningRefresh");

  let allData = [];
  let sortKey = "dy_desc";
  let filterKey = "all";
  let searchQ = "";
  let sortDir = -1;
  let activeSortCol = null;

  function fmtNum(v) {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "number" && !Number.isFinite(v)) return "—";
    if (typeof v === "string") return v;
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(v) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "—";
    return formatPercent(v, 2);
  }

  function fmtCur(v) {
    if (!v && v !== 0) return "—";
    return formatCurrency(v);
  }

  // Compute extra columns from raw Fundamentus data
  function enrichRow(row) {
    const cotacao = row["Cotação"] ?? null;
    const pl = row["P/L"] ?? null;
    const pvp = row["P/VP"] ?? null;
    const dy = row["Div.Yield"] ?? null;

    // DPA proxy from DY * cotação
    const dpa = (cotacao && dy) ? cotacao * dy : null;

    // Bazin: buy if DY >= 6%
    const bazinOk = dy !== null ? dy >= 0.06 : false;

    // Graham: VI = sqrt(22.5 * LPA * VPA)
    // LPA = cotacao / P/L; VPA = cotacao / P/VP
    let precoGraham = null;
    if (cotacao && pl && pl > 0 && pvp && pvp > 0) {
      const lpa = cotacao / pl;
      const vpa = cotacao / pvp;
      if (lpa > 0 && vpa > 0) precoGraham = Math.sqrt(22.5 * lpa * vpa);
    }
    const grahamOk = precoGraham !== null && cotacao <= precoGraham;

    return { ...row, _dpa: dpa, _bazinOk: bazinOk, _precoGraham: precoGraham, _grahamOk: grahamOk };
  }

  function applyFilters(data) {
    let rows = data;
    if (searchQ) {
      const q = searchQ.toUpperCase();
      rows = rows.filter(r => String(r["Papel"] || "").toUpperCase().includes(q));
    }
    switch (filterKey) {
      case "bazin_ok":   rows = rows.filter(r => r._bazinOk); break;
      case "graham_ok":  rows = rows.filter(r => r._grahamOk); break;
      case "pl_pos":     rows = rows.filter(r => r["P/L"] > 0); break;
      case "roe_10":     rows = rows.filter(r => r["ROE"] >= 0.10); break;
      case "liq_min":    rows = rows.filter(r => r["Liq.2meses"] >= 1_000_000); break;
    }
    return rows;
  }

  function applySort(data) {
    const sorts = {
      "dy_desc":     (a, b) => (b["Div.Yield"] ?? -Infinity) - (a["Div.Yield"] ?? -Infinity),
      "pl_asc":      (a, b) => { const av = a["P/L"]; const bv = b["P/L"]; if (!(av > 0)) return 1; if (!(bv > 0)) return -1; return av - bv; },
      "pvp_asc":     (a, b) => (a["P/VP"] ?? Infinity) - (b["P/VP"] ?? Infinity),
      "roe_desc":    (a, b) => (b["ROE"] ?? -Infinity) - (a["ROE"] ?? -Infinity),
      "roic_desc":   (a, b) => (b["ROIC"] ?? -Infinity) - (a["ROIC"] ?? -Infinity),
      "evebit_asc":  (a, b) => { const av = a["EV/EBIT"]; const bv = b["EV/EBIT"]; if (!(av > 0)) return 1; if (!(bv > 0)) return -1; return av - bv; },
      "bazin_desc":  (a, b) => (b["Div.Yield"] ?? -Infinity) - (a["Div.Yield"] ?? -Infinity),
      "graham_desc": (a, b) => { const ag = a._precoGraham ?? 0; const bg = b._precoGraham ?? 0; const ac = a["Cotação"] ?? 0; const bc = b["Cotação"] ?? 0; return (bg / Math.max(bc, 0.01)) - (ag / Math.max(ac, 0.01)); },
    };
    const fn = activeSortCol
      ? (a, b) => {
          const av = a[activeSortCol]; const bv = b[activeSortCol];
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          return (av - bv) * sortDir;
        }
      : sorts[sortKey] || sorts["dy_desc"];
    return [...data].sort(fn);
  }

  const COLS = [
    { key: "Papel",          label: "Papel",       fmt: (v) => v },
    { key: "Cotação",        label: "Cotação",      fmt: fmtCur },
    { key: "P/L",            label: "P/L",          fmt: fmtNum },
    { key: "P/VP",           label: "P/VP",         fmt: fmtNum },
    { key: "Div.Yield",      label: "DY",           fmt: fmtPct },
    { key: "ROE",            label: "ROE",          fmt: fmtPct },
    { key: "ROIC",           label: "ROIC",         fmt: fmtPct },
    { key: "EV/EBIT",        label: "EV/EBIT",      fmt: fmtNum },
    { key: "Mrg. Líq.",      label: "Mrg Líq.",     fmt: fmtPct },
    { key: "Liq.2meses",     label: "Liq. 2m",      fmt: (v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : (v || "—") },
    { key: "_bazinOk",       label: "Bazin",        fmt: (v) => v ? `<span class="screening-tag buy">OK</span>` : `<span class="screening-tag sell">—</span>` },
    { key: "_grahamOk",      label: "Graham",       fmt: (v) => v ? `<span class="screening-tag buy">OK</span>` : `<span class="screening-tag sell">—</span>` },
    { key: "_precoGraham",   label: "P. Graham",    fmt: (v) => v ? fmtCur(v) : "—" },
  ];

  function renderTable(rows) {
    if (rows.length === 0) {
      content.innerHTML = `<div class="screening-loading"><p>Nenhuma ação encontrada com os filtros aplicados.</p></div>`;
      return;
    }

    const ths = COLS.map(col => {
      const cls = activeSortCol === col.key ? (sortDir === 1 ? "sort-asc" : "sort-desc") : "";
      return `<th class="${cls}" data-col="${col.key}">${col.label}</th>`;
    }).join("");

    const trs = rows.map(row => {
      const tds = COLS.map(col => {
        const val = row[col.key];
        return `<td>${col.fmt(val)}</td>`;
      }).join("");
      const link = row["Papel"] ? `href="analise-avancada.html?ticker=${row["Papel"]}"` : "";
      return `<tr>
        <td><a ${link} style="color:var(--accent);font-weight:800;text-decoration:none">${row["Papel"]}</a></td>
        ${COLS.slice(1).map(col => `<td>${col.fmt(row[col.key])}</td>`).join("")}
      </tr>`;
    }).join("");

    content.innerHTML = `
      <div class="screening-table-wrap">
        <table class="screening-table" aria-label="Screening de ações">
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>`;

    content.querySelectorAll(".screening-table thead th[data-col]").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.dataset.col;
        if (activeSortCol === col) { sortDir *= -1; }
        else { activeSortCol = col; sortDir = -1; }
        renderFiltered();
      });
    });
  }

  function renderFiltered() {
    const filtered = applyFilters(allData);
    const sorted = applySort(filtered);
    statEl.innerHTML = `<strong>${sorted.length}</strong> ações`;
    renderTable(sorted);
  }

  async function loadData(forceRefresh = false) {
    loading && (loading.hidden = false);
    content.innerHTML = `<div class="screening-loading" id="screeningLoading"><p>Buscando dados do Fundamentus…</p><p style="font-size:.8rem;margin-top:4px">Isso pode levar alguns segundos na primeira vez.</p></div>`;
    statEl.textContent = "Carregando…";
    try {
      const url = "/invest/api/fundamentus/acoes" + (forceRefresh ? "?refresh=1" : "");
      const res = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Erro");
      allData = json.data.map(enrichRow);
      const age = json.cacheAgeMinutes ?? 0;
      statEl.innerHTML = `<strong>${allData.length}</strong> ações · cache ${age}min`;
      renderFiltered();
    } catch (e) {
      content.innerHTML = `<div class="screening-loading"><p style="color:var(--danger)">Erro ao carregar dados: ${e.message}</p><p style="font-size:.8rem">O Fundamentus pode estar indisponível. Tente novamente em alguns instantes.</p></div>`;
      statEl.textContent = "Erro";
    }
  }

  searchEl.addEventListener("input", () => { searchQ = searchEl.value; renderFiltered(); });
  sortEl.addEventListener("change", () => { sortKey = sortEl.value; activeSortCol = null; renderFiltered(); });
  filterEl.addEventListener("change", () => { filterKey = filterEl.value; renderFiltered(); });
  refreshBtn.addEventListener("click", () => loadData(true));

  window.getAiContext = () => {
    const filtered = applyFilters(allData);
    const top10 = applySort(filtered).slice(0, 10);
    if (top10.length === 0) return "Nenhuma ação carregada no screening.";
    const rows = top10.map(r =>
      `${r["Papel"]}: cotação ${fmtCur(r["Cotação"])}, DY ${fmtPct(r["Div.Yield"])}, P/L ${fmtNum(r["P/L"])}, ROE ${fmtPct(r["ROE"])}, Bazin:${r._bazinOk ? "OK" : "Não"}, Graham:${r._grahamOk ? "OK" : "Não"}`
    ).join("\n");
    return `Screening de ações (${filtered.length} resultados com filtros atuais):\n${rows}`;
  };

  loadData();
}());

// ── Análise Avançada ──────────────────────────────────────────────────────────
(function setupAnaliseAvancada() {
  const loadBtn = document.querySelector("#analiseLoadBtn");
  const tickerInput = document.querySelector("#analiseTickerInput");
  const analiseArea = document.querySelector("#analiseArea");
  if (!loadBtn || !tickerInput || !analiseArea) return;

  // Pre-fill ticker from URL if coming from screening page
  const params = new URLSearchParams(location.search);
  if (params.get("ticker")) {
    tickerInput.value = params.get("ticker").toUpperCase();
  }

  function fmtNum(v, d = 2) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "—";
    return v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function renderAnalise(row, ticker) {
    const c = formatCurrency;
    const pct = (v) => Number.isFinite(v) ? formatPercent(v, 2) : "—";

    const cotacao = row["Cotação"] ?? null;
    const pl = row["P/L"] ?? null;
    const pvp = row["P/VP"] ?? null;
    const dy = row["Div.Yield"] ?? null;
    const roe = row["ROE"] ?? null;
    const roic = row["ROIC"] ?? null;
    const evEbit = row["EV/EBIT"] ?? null;
    const evEbitda = row["EV/EBITDA"] ?? null;
    const mrgLiq = row["Mrg. Líq."] ?? null;
    const mrgEbit = row["Mrg Ebit"] ?? null;
    const divLiq = row["Dív.Líq/ Patrim."] ?? null;
    const liq = row["Liq.2meses"] ?? null;
    const crescRec = row["Cresc. Rec.5a"] ?? null;

    // Valuation
    const dpa = (cotacao && dy) ? cotacao * dy : null;
    const bazinPrice = dpa ? dpa / 0.06 : null;
    const lpa = (cotacao && pl && pl > 0) ? cotacao / pl : null;
    const vpa = (cotacao && pvp && pvp > 0) ? cotacao / pvp : null;
    const grahamPrice = (lpa && vpa && lpa > 0 && vpa > 0) ? Math.sqrt(22.5 * lpa * vpa) : null;
    const bazinOk = dy !== null && dy >= 0.06;
    const grahamOk = grahamPrice !== null && cotacao !== null && cotacao <= grahamPrice;

    const kpiClass = (v, good, bad) => {
      if (v === null || !Number.isFinite(v)) return "";
      return v >= good ? "positive" : v <= bad ? "negative" : "";
    };

    window.getAiContext = () => `Análise de ${ticker}:
Cotação: ${cotacao ? c(cotacao) : "—"}
P/L: ${fmtNum(pl)} | P/VP: ${fmtNum(pvp)} | DY: ${pct(dy)}
ROE: ${pct(roe)} | ROIC: ${pct(roic)} | EV/EBIT: ${fmtNum(evEbit)}
Mrg Líq: ${pct(mrgLiq)} | Dív/PL: ${fmtNum(divLiq)} | Liq 2m: ${liq ? (liq/1e6).toFixed(1)+"M" : "—"}
Cresc Rec 5a: ${pct(crescRec)}
Preço Bazin (DY 6%): ${bazinPrice ? c(bazinPrice) : "—"} → ${bazinOk ? "OK" : "Não"}
Preço Graham: ${grahamPrice ? c(grahamPrice) : "—"} → ${grahamOk ? "OK" : "Não"}`;

    window.getRaioXPayload = () => ({
      tipo: "acao",
      ticker,
      contexto: window.getAiContext(),
    });

    analiseArea.innerHTML = `
      <div class="analise-tabs-bar" id="analiseTabs">
        <button class="analise-tab-btn active" data-tab="fundamentos">Fundamentos</button>
        <button class="analise-tab-btn" data-tab="valuation">Valuation</button>
        <button class="analise-tab-btn" data-tab="mercado">Mercado</button>
      </div>

      <!-- Fundamentos -->
      <div class="analise-tab-panel active" id="tab-fundamentos">
        <div class="fii-eval-head" style="margin-bottom:20px">
          <div>
            <h3 style="margin:0;font-size:1.4rem;font-weight:900;letter-spacing:-0.02em;display:flex;align-items:center;gap:10px">${ticker} ${investidor10Link(ticker, "acao")}</h3>
            <p style="margin:4px 0 0;color:var(--muted);font-size:.87rem">Cotação ${cotacao ? c(cotacao) : "—"} · DY ${pct(dy)} · P/L ${fmtNum(pl)} · P/VP ${fmtNum(pvp)}</p>
          </div>
          <span class="fii-status-badge ${bazinOk || grahamOk ? "is-cheap" : "is-expensive"}">${bazinOk || grahamOk ? "Pelo menos 1 método OK" : "Todos acima do preço"}</span>
        </div>

        <div class="analise-kpi-grid">
          <div class="analise-kpi ${kpiClass(roe, 0.15, 0.05)}"><span>ROE</span><strong>${pct(roe)}</strong></div>
          <div class="analise-kpi ${kpiClass(roic, 0.12, 0.05)}"><span>ROIC</span><strong>${pct(roic)}</strong></div>
          <div class="analise-kpi ${kpiClass(mrgLiq, 0.10, 0)}"><span>Margem Líquida</span><strong>${pct(mrgLiq)}</strong></div>
          <div class="analise-kpi ${kpiClass(mrgEbit, 0.15, 0)}"><span>Margem EBIT</span><strong>${pct(mrgEbit)}</strong></div>
          <div class="analise-kpi ${kpiClass(dy, 0.06, 0.02)}"><span>Dividend Yield</span><strong>${pct(dy)}</strong></div>
          <div class="analise-kpi ${kpiClass(divLiq ? -divLiq : null, -0.3, -2)}"><span>Dív. Líq. / PL</span><strong>${fmtNum(divLiq)}</strong></div>
          <div class="analise-kpi ${kpiClass(crescRec, 0.10, 0)}"><span>Cresc. Rec. 5a</span><strong>${pct(crescRec)}</strong></div>
          <div class="analise-kpi"><span>Liq. 2 meses</span><strong>${liq ? (liq >= 1e6 ? (liq/1e6).toFixed(1)+"M" : (liq/1e3).toFixed(0)+"K") : "—"}</strong></div>
        </div>

        <div class="analise-section-card">
          <h3>Dados completos (Fundamentus)</h3>
          <div style="overflow-x:auto">
            <table class="comparison-table">
              <tbody>
                ${Object.entries(row).filter(([k]) => !k.startsWith("_")).map(([k, v]) =>
                  `<tr><td class="comparison-label">${k}</td><td>${typeof v === "number" ? fmtNum(v) : v}</td></tr>`
                ).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Valuation -->
      <div class="analise-tab-panel" id="tab-valuation">
        <div class="valuation-methods-grid" style="max-width:none">
          <div class="method-card bazin">
            <div class="method-card-head">
              <div><div class="method-card-label">Método 1</div><div class="method-card-name">Bazin</div></div>
              <span class="method-status-badge ${bazinOk ? "is-cheap" : "is-expensive"}">${bazinOk ? "Barato" : "Caro"}</span>
            </div>
            <div class="method-price-row">
              <div class="method-price-item"><span>Preço Justo (DY 6%)</span><strong>${bazinPrice ? c(bazinPrice) : "—"}</strong></div>
              <div class="method-price-item"><span>Cotação atual</span><strong>${cotacao ? c(cotacao) : "—"}</strong></div>
            </div>
            <div class="method-formula">DPA ≈ ${dpa ? c(dpa) : "—"} / 6% → ${bazinPrice ? c(bazinPrice) : "—"}</div>
          </div>
          <div class="method-card graham">
            <div class="method-card-head">
              <div><div class="method-card-label">Método 2</div><div class="method-card-name">Graham</div></div>
              <span class="method-status-badge ${grahamOk ? "is-cheap" : "is-expensive"}">${grahamOk ? "Barato" : "Caro"}</span>
            </div>
            <div class="method-price-row">
              <div class="method-price-item"><span>Valor Intrínseco</span><strong>${grahamPrice ? c(grahamPrice) : "—"}</strong></div>
              <div class="method-price-item"><span>Cotação atual</span><strong>${cotacao ? c(cotacao) : "—"}</strong></div>
            </div>
            <div class="method-sub-metrics">
              <div class="method-sub-metric"><span>LPA: </span><strong>${lpa ? c(lpa) : "—"}</strong></div>
              <div class="method-sub-metric"><span>VPA: </span><strong>${vpa ? c(vpa) : "—"}</strong></div>
            </div>
            <div class="method-formula">√(22,5 × ${lpa ? c(lpa) : "?"} × ${vpa ? c(vpa) : "?"}) = ${grahamPrice ? c(grahamPrice) : "—"}</div>
          </div>
          <div class="method-card lynch">
            <div class="method-card-head">
              <div><div class="method-card-label">Método 3</div><div class="method-card-name">Peter Lynch / PEG</div></div>
              <span class="method-status-badge is-neutral">Sem crescimento</span>
            </div>
            <div class="method-price-row">
              <div class="method-price-item"><span>P/L atual</span><strong>${fmtNum(pl)}</strong></div>
            </div>
            <div class="method-formula">PEG = P/L ÷ crescimento — use Valuation de Ações para calcular</div>
          </div>
          <div class="method-card dcf">
            <div class="method-card-head">
              <div><div class="method-card-label">Método 4</div><div class="method-card-name">DCF</div></div>
              <span class="method-status-badge is-neutral">Manual</span>
            </div>
            <div class="method-formula">Use a página de <a href="valuation-acoes.html" style="color:var(--accent)">Valuation de Ações</a> para o DCF completo com as premissas desejadas.</div>
          </div>
        </div>
      </div>

      <!-- Mercado -->
      <div class="analise-tab-panel" id="tab-mercado">
        <div class="analise-kpi-grid">
          <div class="analise-kpi"><span>EV/EBIT</span><strong>${fmtNum(evEbit)}</strong></div>
          <div class="analise-kpi"><span>EV/EBITDA</span><strong>${fmtNum(evEbitda)}</strong></div>
          <div class="analise-kpi"><span>P/L</span><strong>${fmtNum(pl)}</strong></div>
          <div class="analise-kpi"><span>P/VP</span><strong>${fmtNum(pvp)}</strong></div>
          <div class="analise-kpi"><span>PSR</span><strong>${fmtNum(row["PSR"])}</strong></div>
          <div class="analise-kpi"><span>P/Ativo</span><strong>${fmtNum(row["P/Ativo"])}</strong></div>
          <div class="analise-kpi"><span>P/EBIT</span><strong>${fmtNum(row["P/EBIT"])}</strong></div>
          <div class="analise-kpi"><span>Liq. Corrente</span><strong>${fmtNum(row["Liq. Corr."])}</strong></div>
        </div>
      </div>`;

    // Tab switching
    analiseArea.querySelectorAll(".analise-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        analiseArea.querySelectorAll(".analise-tab-btn").forEach(b => b.classList.remove("active"));
        analiseArea.querySelectorAll(".analise-tab-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        analiseArea.querySelector(`#tab-${btn.dataset.tab}`).classList.add("active");
      });
    });
  }

  async function loadAnalise() {
    const ticker = tickerInput.value.trim().toUpperCase();
    if (!ticker) return;
    analiseArea.innerHTML = `<div class="analise-empty"><p>Buscando dados de <strong>${ticker}</strong>…</p></div>`;
    try {
      const res = await fetch("/invest/api/fundamentus/acoes");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Erro ao buscar dados");
      const row = json.data.find(r => String(r["Papel"] || "").toUpperCase() === ticker);
      if (!row) {
        analiseArea.innerHTML = `<div class="analise-empty"><p>Ação <strong>${ticker}</strong> não encontrada no Fundamentus.</p><p style="font-size:.82rem;margin-top:4px">Verifique o ticker ou tente a busca no <a href="stock-screening.html" style="color:var(--accent)">Screening</a>.</p></div>`;
        return;
      }
      renderAnalise(row, ticker);
    } catch (e) {
      analiseArea.innerHTML = `<div class="analise-empty"><p style="color:var(--danger)">Erro: ${e.message}</p></div>`;
    }
  }

  loadBtn.addEventListener("click", loadAnalise);
  tickerInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); loadAnalise(); } });

  if (tickerInput.value) loadAnalise();
}());

// ── Renderizador de Markdown (leve, sem dependências) ─────────────────────────
// Suporta: títulos, negrito, itálico, código, listas, tabelas e links.
// Escapa HTML antes de tudo (saída da IA é tratada como texto).
function renderMarkdown(md) {
  if (!md) return "";
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*/g, "$1<em>$2</em>")
      .replace(/(^|[^_\w])_(?!\s)([^_\n]+?)_(?![\w])/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let out = "", i = 0, list = null, para = [];
  const closeList = () => { if (list) { out += `</${list}>`; list = null; } };
  const flushPara = () => { if (para.length) { out += `<p>${para.join("<br>")}</p>`; para = []; } };
  const isSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l);
  const splitRow = (l) => l.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];
    // Tabela
    if (line.includes("|") && i + 1 < lines.length && isSep(lines[i + 1])) {
      flushPara(); closeList();
      const head = splitRow(line);
      i += 2;
      let bodyRows = "";
      while (i < lines.length && lines[i].includes("|") && !isSep(lines[i])) {
        const cells = splitRow(lines[i]);
        bodyRows += "<tr>" + head.map((_, c) => `<td>${inline(cells[c] || "")}</td>`).join("") + "</tr>";
        i++;
      }
      out += `<table class="ai-md-table"><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${bodyRows}</tbody></table>`;
      continue;
    }
    // Título
    const hm = line.match(/^(#{1,6})\s+(.*)$/);
    if (hm) { flushPara(); closeList(); const lvl = Math.min(hm[1].length + 2, 6); out += `<h${lvl}>${inline(hm[2])}</h${lvl}>`; i++; continue; }
    // Lista não ordenada
    const um = line.match(/^\s*[-*+]\s+(.*)$/);
    if (um) { flushPara(); if (list !== "ul") { closeList(); out += "<ul>"; list = "ul"; } out += `<li>${inline(um[1])}</li>`; i++; continue; }
    // Lista ordenada
    const om = line.match(/^\s*\d+\.\s+(.*)$/);
    if (om) { flushPara(); if (list !== "ol") { closeList(); out += "<ol>"; list = "ol"; } out += `<li>${inline(om[1])}</li>`; i++; continue; }
    // Linha em branco
    if (/^\s*$/.test(line)) { flushPara(); closeList(); i++; continue; }
    // Parágrafo
    para.push(inline(line));
    i++;
  }
  flushPara(); closeList();
  return out;
}

// ── Raio-X com IA (motor reutilizável) ────────────────────────────────────────
// payload = { tipo: "fii" | "acao", ticker, contexto } onde contexto é um texto
// com os indicadores já calculados. Renderiza um relatório estruturado em markdown.
async function gerarRaioX(payload, targetEl, btnEl) {
  if (!targetEl) return;
  if (!payload || !payload.contexto) {
    targetEl.hidden = false;
    targetEl.innerHTML = `<div class="raiox-card raiox-empty"><p>Calcule ou selecione um ativo primeiro para gerar o raio-x.</p></div>`;
    return;
  }

  const prevLabel = btnEl ? btnEl.innerHTML : "";
  if (btnEl) { btnEl.disabled = true; btnEl.classList.add("is-loading"); }
  targetEl.hidden = false;
  targetEl.innerHTML = `
    <div class="raiox-card raiox-loading">
      <span class="raiox-spinner" aria-hidden="true"></span>
      <p>A IA está montando o raio-x de <strong>${payload.ticker}</strong>…</p>
    </div>`;

  const tipoLabel = payload.tipo === "fii" ? "fundo imobiliário (FII)" : "ação";
  const system = {
    role: "system",
    content: `Você é um analista de investimentos sênior da plataforma SibaInvest. Faça um RAIO-X completo do ${tipoLabel} ${payload.ticker} usando APENAS os dados fornecidos (não invente números que não estão nos dados). Escreva em português brasileiro, em Markdown, seguindo EXATAMENTE esta estrutura (use "### " nos títulos das seções):

### Resumo
2 a 3 frases sobre o ativo e a tese de investimento.

### Pontos fortes
Lista com "- " (3 a 5 itens).

### Pontos de atenção
Lista com "- " (3 a 5 itens — riscos, fraquezas, sinais de alerta).

### Valuation / Preço justo
Compare a cotação atual com o preço justo/teto presente nos dados. Diga claramente se está **caro** ou **barato** e por quê.

### Veredito
1 a 2 frases com a conclusão prática e, na última linha, escreva **Nota: X/10** (sua nota geral de atratividade hoje, de 0 a 10).

Seja objetivo e use os números dos dados. Apresente como análise educativa — não dê ordem de compra/venda.

Dados do ativo:
${payload.contexto}`,
  };
  const user = { role: "user", content: `Gere o raio-x de ${payload.ticker}.` };

  try {
    const res = await fetch("/invest/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [system, user] }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Erro ao contatar a IA.");
    targetEl.innerHTML = `
      <div class="raiox-card">
        <div class="raiox-head">
          <span class="raiox-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
          </span>
          <div>
            <strong class="raiox-ticker">${payload.ticker} ${investidor10Link(payload.ticker, payload.tipo)}</strong>
            <span class="raiox-tipo">${payload.tipo === "fii" ? "Fundo Imobiliário" : "Ação"} · Raio-X IA</span>
          </div>
        </div>
        <div class="raiox-body ai-msg-body">${renderMarkdown(data.text)}</div>
        <p class="raiox-disclaimer">Gerado por IA com base nos dados do Fundamentus. Conteúdo educativo — não é recomendação de investimento.</p>
      </div>`;
  } catch (e) {
    targetEl.innerHTML = `<div class="raiox-card raiox-empty"><p style="color:var(--danger)">Não foi possível gerar o raio-x: ${e.message}</p></div>`;
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.classList.remove("is-loading"); btnEl.innerHTML = prevLabel; }
  }
}

// Injeta o botão "Gerar Raio-X com IA" após os painéis de resultado existentes
(function setupRaioXButtons() {
  ["#fiiResult", "#acoesResult", "#analiseArea"].forEach((sel) => {
    const result = document.querySelector(sel);
    if (!result) return;

    const launch = document.createElement("div");
    launch.className = "raiox-launch";
    launch.innerHTML = `
      <button type="button" class="raiox-btn">
        <span class="raiox-btn-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg></span>
        <span>Gerar Raio-X com IA</span>
      </button>
      <span class="raiox-launch-hint">Análise completa da IA com base nos números acima.</span>`;

    const output = document.createElement("div");
    output.className = "raiox-output";
    output.hidden = true;

    result.insertAdjacentElement("afterend", launch);
    launch.insertAdjacentElement("afterend", output);

    launch.querySelector(".raiox-btn").addEventListener("click", (e) => {
      const payload = typeof window.getRaioXPayload === "function" ? window.getRaioXPayload() : null;
      gerarRaioX(payload, output, e.currentTarget);
    });
  });
}());

// ── AI Chat Flutuante ─────────────────────────────────────────────────────────
(function setupAiChat() {
  // Só inicia se a página tem o help menu (i.e., é uma página do app)
  if (!document.querySelector("#helpMenu")) return;

  const toggle = document.createElement("button");
  toggle.id = "aiChatToggle";
  toggle.className = "ai-chat-toggle";
  toggle.setAttribute("aria-label", "Abrir assistente IA");
  toggle.setAttribute("type", "button");
  toggle.textContent = "IA";

  const panel = document.createElement("div");
  panel.id = "aiChatPanel";
  panel.className = "ai-chat-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-labelledby", "aiChatPanelTitle");
  panel.innerHTML = `
    <div class="ai-chat-header">
      <div class="ai-chat-title">
        <span class="ai-chat-dot" aria-hidden="true"></span>
        <span id="aiChatPanelTitle">Assistente SibaInvest</span>
      </div>
      <button class="ai-chat-close" type="button" aria-label="Fechar chat">×</button>
    </div>
    <div class="ai-chat-messages" id="aiChatMessages">
      <div class="ai-msg bot">
        <p>Olá! Sou seu assistente de investimentos. Pergunte sobre os dados desta tela — se uma ação está cara, o que os indicadores significam, o que eu recomendo.</p>
      </div>
    </div>
    <form class="ai-chat-form" id="aiChatForm" novalidate>
      <input class="ai-chat-input" id="aiChatInput" type="text" placeholder="Pergunte sobre os dados da tela…" autocomplete="off" maxlength="500" />
      <button class="ai-chat-send" id="aiChatSend" type="submit" aria-label="Enviar">→</button>
    </form>`;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  let isOpen = false;
  const messages = [];

  function openChat() {
    isOpen = true;
    panel.hidden = false;
    toggle.classList.add("is-active");
    document.querySelector("#aiChatInput").focus();
  }

  function closeChat() {
    isOpen = false;
    panel.hidden = true;
    toggle.classList.remove("is-active");
    toggle.focus();
  }

  toggle.addEventListener("click", () => { if (isOpen) closeChat(); else openChat(); });
  panel.querySelector(".ai-chat-close").addEventListener("click", closeChat);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeChat();
  });

  function appendMsg(role, text) {
    const msgs = document.querySelector("#aiChatMessages");
    const div = document.createElement("div");
    div.className = `ai-msg ${role === "user" ? "user" : "bot"}`;
    const p = document.createElement("div");
    p.className = "ai-msg-body";
    if (role === "user") {
      p.innerHTML = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
    } else {
      p.innerHTML = renderMarkdown(text);
    }
    div.appendChild(p);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return p;
  }

  function getPageContext() {
    if (typeof window.getAiContext === "function") return window.getAiContext();
    const panels = document.querySelectorAll(".result-panel, #acoesResult, #fiiResult, [id$='Result']");
    const text = [...panels].map(p => p.innerText).filter(t => t.length > 30).join("\n\n");
    return text || "Nenhum dado calculado ainda nesta tela.";
  }

  async function send(userText) {
    if (!userText.trim()) return;
    const sendBtn = document.querySelector("#aiChatSend");
    sendBtn.disabled = true;

    appendMsg("user", userText);
    const loadingP = appendMsg("bot", "Pensando…");
    loadingP.parentElement.classList.add("loading");

    const context = getPageContext();
    const systemMsg = {
      role: "system",
      content: `Você é um assistente financeiro especialista da plataforma SibaInvest. Responda de forma concisa e prática em português brasileiro, usando dados objetivos.\n\nFORMATO: responda SEMPRE em Markdown bem estruturado — use **negrito** para destacar termos e números, listas com "- " para enumerar itens, "### " para subtítulos de seções e tabelas markdown quando comparar valores. Não use HTML.\n\nQuando relevante, use os dados abaixo para embasar sua análise.\n\nContexto da tela atual:\n${context}`,
    };

    if (messages.length === 0) {
      messages.push(systemMsg);
    } else {
      messages[0] = systemMsg;
    }
    messages.push({ role: "user", content: userText });

    try {
      const res = await fetch("/invest/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      const reply = data.ok ? data.text : (data.error || "Erro ao contatar a IA.");
      loadingP.parentElement.classList.remove("loading");
      loadingP.innerHTML = renderMarkdown(reply);
      loadingP.parentElement.querySelector(".ai-msg-body")?.scrollIntoView?.({ block: "nearest" });
      messages.push({ role: "assistant", content: reply });
    } catch {
      loadingP.innerHTML = "Erro de conexão. Verifique se o servidor está rodando.";
      loadingP.parentElement.classList.remove("loading");
    } finally {
      sendBtn.disabled = false;
    }
  }

  document.querySelector("#aiChatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.querySelector("#aiChatInput");
    const text = input.value.trim();
    input.value = "";
    send(text);
  });
}());

// ── Ticker Autocomplete (componente compartilhado) ────────────────────────────
function createTickerAutocomplete({ apiUrl, inputEl, dropdownEl, hintEl, onSelect }) {
  let allItems = [];
  let focused = -1;

  async function loadData() {
    try {
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Erro");
      allItems = json.data;
      hintEl.textContent = `${allItems.length} ativos — comece a digitar`;
    } catch {
      hintEl.textContent = "Não foi possível carregar a lista do Fundamentus.";
    }
  }

  function matchItems(q) {
    if (!q) return [];
    const upper = q.toUpperCase();
    return allItems.filter(r => String(r["Papel"] || "").toUpperCase().startsWith(upper)).slice(0, 12);
  }

  function renderDropdown(items) {
    if (items.length === 0) {
      dropdownEl.innerHTML = `<div class="ticker-no-results">Nenhum resultado</div>`;
      dropdownEl.hidden = false;
      focused = -1;
      return;
    }
    dropdownEl.innerHTML = items.map((r, i) => {
      const dy = r["Div.Yield"] ?? r["Dividend Yield"] ?? r["DY"] ?? r["Yield"] ?? null;
      const dyText = (dy && Number.isFinite(dy)) ? `DY ${formatPercent(dy, 1)}` : "";
      const cotacao = r["Cotação"] ?? null;
      return `<div class="ticker-option" role="option" data-idx="${i}" tabindex="-1">
        <span class="ticker-option-code">${r["Papel"]}</span>
        <span class="ticker-option-detail">${dyText}</span>
        <span class="ticker-option-price">${cotacao ? formatCurrency(cotacao) : ""}</span>
      </div>`;
    }).join("");
    dropdownEl.hidden = false;
    focused = -1;

    dropdownEl.querySelectorAll(".ticker-option").forEach(opt => {
      opt.addEventListener("mousedown", e => {
        e.preventDefault();
        selectItem(items[Number(opt.dataset.idx)]);
      });
    });
  }

  function selectItem(row) {
    inputEl.value = row["Papel"];
    dropdownEl.hidden = true;
    focused = -1;
    onSelect(row);
  }

  function moveFocus(delta) {
    const opts = dropdownEl.querySelectorAll(".ticker-option");
    if (!opts.length) return;
    focused = Math.max(0, Math.min(opts.length - 1, focused + delta));
    opts.forEach((o, i) => o.classList.toggle("focused", i === focused));
    opts[focused].scrollIntoView({ block: "nearest" });
  }

  inputEl.addEventListener("input", () => {
    const items = matchItems(inputEl.value);
    inputEl.value.trim() ? renderDropdown(items) : (dropdownEl.hidden = true);
  });

  inputEl.addEventListener("keydown", e => {
    if (dropdownEl.hidden) return;
    const items = [...dropdownEl.querySelectorAll(".ticker-option")];
    if (e.key === "ArrowDown")  { e.preventDefault(); moveFocus(1); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); moveFocus(-1); }
    else if (e.key === "Enter" && focused >= 0) { e.preventDefault(); items[focused].dispatchEvent(new MouseEvent("mousedown")); }
    else if (e.key === "Escape") { dropdownEl.hidden = true; }
  });

  inputEl.addEventListener("blur", () => { setTimeout(() => { dropdownEl.hidden = true; }, 200); });

  // Read URL param on load to pre-fill
  const paramTicker = new URLSearchParams(location.search).get("ticker");
  if (paramTicker) inputEl.value = paramTicker;

  loadData().then(() => {
    if (paramTicker) {
      const row = allItems.find(r => String(r["Papel"] || "").toUpperCase() === paramTicker.toUpperCase());
      if (row) onSelect(row);
    }
  });
}

// ── Complemento StatusInvest (campos que o Fundamentus não traz) ──────────────
function siFill(id, val) {
  const el = document.querySelector(id);
  if (el && val !== null && val !== undefined && val !== "") {
    el.value = val;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

// Preenche as premissas do DCF/Bazin com valores padrão por ticker (caminho A):
// crescimento do FCL vem do histórico do próprio ativo; crescimento terminal e WACC
// são ancorados aos dados vivos do Banco Central (IPCA de longo prazo e CDI/Selic).
// Cada campo recebe também um texto "Por que este valor?" nomeando a base usada.
async function applyAcaoPremissaDefaults(ticker, d) {
  const ind = await getMarketIndicatorsCached();
  if (!ind) return;
  const pctTxt = (frac) => (frac * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pctVal = (frac) => pctTxt(frac) + "%";

  // Crescimento do FCL ← histórico do próprio ticker, limitado a uma faixa sustentável.
  // O CAGR é projetado por 10 anos no DCF; crescimentos muito altos (recuperação de
  // commodities, base baixa) não se mantêm por uma década e inflariam o preço justo.
  const DCF_GROWTH_CAP = 0.20; // teto de 20% a.a. para a projeção explícita
  if (Number.isFinite(d.cagrLucros5)) {
    const capped = Math.max(0, Math.min(DCF_GROWTH_CAP, d.cagrLucros5));
    siFill("#acoesCrescFcl", pctVal(capped));
    const note = d.cagrLucros5 > DCF_GROWTH_CAP
      ? `O crescimento histórico de ${ticker} foi de ${pctTxt(d.cagrLucros5)}% ao ano, mas limitamos a ${pctTxt(DCF_GROWTH_CAP)}% porque ritmos muito altos não se sustentam por 10 anos no DCF.`
      : (d.cagrLucros5 < 0
          ? `${ticker} teve queda no histórico (${pctTxt(d.cagrLucros5)}% ao ano); por isso usamos 0% como ponto de partida prudente.`
          : `Base: crescimento histórico de lucros de ${ticker} (CAGR de 5 anos = ${pctTxt(d.cagrLucros5)}% ao ano).`);
    FIELD_GUIDES.acoesCrescFcl.valueWhy =
      `Preenchemos o crescimento do caixa a partir do histórico do próprio ativo. ${note} Ajuste se espera um ritmo diferente.`;
  }

  // Crescimento na perpetuidade ← inflação de longo prazo (IPCA, Banco Central)
  if (Number.isFinite(ind.ipcaTwentyYearAverage)) {
    siFill("#acoesCrescTerminal", pctVal(ind.ipcaTwentyYearAverage));
    FIELD_GUIDES.acoesCrescTerminal.valueWhy =
      `Baseado na inflação de longo prazo do Brasil (IPCA médio ≈ ${pctTxt(ind.ipcaTwentyYearAverage)}% ao ano, Banco Central). Uma empresa madura tende a crescer perto da inflação "para sempre" — por isso o valor é baixo.`;
  }

  // WACC ← juro livre de risco (CDI ≈ Selic) + prêmio de risco de ações
  if (Number.isFinite(ind.cdiAnnual)) {
    const wacc = ind.cdiAnnual + EQUITY_RISK_PREMIUM;
    siFill("#acoesWacc", pctVal(wacc));
    FIELD_GUIDES.acoesWacc.valueWhy =
      `Calculado a partir do juro livre de risco atual (CDI ≈ ${pctTxt(ind.cdiAnnual)}% ao ano, Banco Central) mais um prêmio de risco de ações de ${pctTxt(EQUITY_RISK_PREMIUM)} ponto(s) percentuais. Quanto maior a taxa, menor o preço justo no DCF — ajuste conforme o risco que você enxerga.`;
  }
}

async function enrichAcaoFromStatusInvest(ticker, hintEl) {
  try {
    const res = await fetch(`/invest/api/statusinvest/acao?ticker=${encodeURIComponent(ticker)}`);
    const json = await res.json();
    if (!json.ok) return;
    const d = json.data;
    const num2 = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // crescimento de lucro (CAGR Lucros 5a) — usado no PEG, não vem do Fundamentus
    if (Number.isFinite(d.cagrLucros5)) siFill("#acoesCrescLucro", num2(d.cagrLucros5 * 100) + "%");
    // LPA/VPA diretos (mais precisos que derivar de P/L e P/VP arredondados)
    if (Number.isFinite(d.lpa)) siFill("#acoesLpa", formatCurrency(d.lpa));
    if (Number.isFinite(d.vpa)) siFill("#acoesVpa", formatCurrency(d.vpa));
    if (Number.isFinite(d.cotacao) && Number.isFinite(d.dy)) siFill("#acoesDpa", formatCurrency(d.cotacao * d.dy));
    // FCL por ação (derivado do Fluxo de Caixa Livre do StatusInvest) — alimenta o DCF
    if (Number.isFinite(d.fclPorAcao)) siFill("#acoesFcl", formatCurrency(d.fclPorAcao));
    // Premissas (crescimento FCL, terminal, WACC) com padrão por ticker + dados do BCB
    await applyAcaoPremissaDefaults(ticker, d);
    const extras = Number.isFinite(d.fclPorAcao) ? "crescimento, FCL e premissas" : "crescimento e premissas";
    if (hintEl) hintEl.innerHTML = `<span class="ticker-filled-tag">${ticker} preenchido</span> <span class="ticker-si-tag">+ ${extras} (StatusInvest + BCB)</span>`;
  } catch { /* silencioso — o Fundamentus já preencheu o essencial */ }
}

async function enrichFiiFromStatusInvest(ticker, hintEl) {
  try {
    const res = await fetch(`/invest/api/statusinvest/fii?ticker=${encodeURIComponent(ticker)}`);
    const json = await res.json();
    if (!json.ok) return;
    const d = json.data;
    // rendimento mensal real (em vez de estimar pelo DY anual)
    if (Number.isFinite(d.ultimoRendimento)) {
      siFill("#fiiDividend", d.ultimoRendimento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
      if (hintEl) hintEl.innerHTML = `<span class="ticker-filled-tag">${ticker} preenchido</span> <span class="ticker-si-tag">+ rendimento real (StatusInvest)</span>`;
    }
  } catch { /* silencioso */ }
}

// ── Ticker autocomplete: Valuation FII ───────────────────────────────────────
(function setupFiiTickerLookup() {
  const searchInput = document.querySelector("#tickerSearchInput");
  const dropdown = document.querySelector("#tickerDropdown");
  const hint = document.querySelector("#tickerLookupHint");
  if (!searchInput || !dropdown || !hint) return;
  if (!document.querySelector("#fiiForm")) return;

  createTickerAutocomplete({
    apiUrl: "/invest/api/fundamentus/fiis",
    inputEl: searchInput,
    dropdownEl: dropdown,
    hintEl: hint,
    onSelect(row) {
      const ticker = row["Papel"] || "";
      const cotacao = row["Cotação"] ?? null;
      const dy = row["Div.Yield"] ?? row["Dividend Yield"] ?? row["DY"] ?? row["Yield"] ?? null;

      const fill = (id, val) => {
        const el = document.querySelector(id);
        if (el && val !== null && val !== undefined) {
          el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };

      fill("#fiiTicker", ticker);
      if (cotacao) fill("#fiiPrice", formatCurrency(cotacao));

      // Dividendo mensal estimado: DY_anual × cotação / 12 (refinado pelo StatusInvest abaixo)
      if (dy && cotacao) {
        const monthly = (dy * cotacao) / 12;
        fill("#fiiDividend", monthly.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }));
      }

      hint.innerHTML = `<span class="ticker-filled-tag">${ticker} preenchido</span>`;
      enrichFiiFromStatusInvest(ticker, hint);
    },
  });
}());

// ── Ticker autocomplete: Valuation Ações ─────────────────────────────────────
(function setupAcoesTickerLookup() {
  const searchInput = document.querySelector("#tickerSearchInput");
  const dropdown = document.querySelector("#tickerDropdown");
  const hint = document.querySelector("#tickerLookupHint");
  if (!searchInput || !dropdown || !hint) return;
  if (!document.querySelector("#acoesForm")) return;

  createTickerAutocomplete({
    apiUrl: "/invest/api/fundamentus/acoes",
    inputEl: searchInput,
    dropdownEl: dropdown,
    hintEl: hint,
    onSelect(row) {
      const ticker = row["Papel"] || "";
      const cotacao = row["Cotação"] ?? null;
      const pl = row["P/L"] ?? null;
      const pvp = row["P/VP"] ?? null;
      const dy = row["Div.Yield"] ?? null;

      const fill = (id, val) => {
        const el = document.querySelector(id);
        if (el && val !== null && val !== undefined) {
          el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };

      fill("#acoesTicker", ticker);
      if (cotacao) fill("#acoesCotacao", formatCurrency(cotacao));
      if (cotacao && pl && pl > 0) fill("#acoesLpa", formatCurrency(cotacao / pl));
      if (cotacao && pvp && pvp > 0) fill("#acoesVpa", formatCurrency(cotacao / pvp));
      if (cotacao && dy) fill("#acoesDpa", formatCurrency(cotacao * dy));

      hint.innerHTML = `<span class="ticker-filled-tag">${ticker} preenchido</span>`;
      enrichAcaoFromStatusInvest(ticker, hint);
    },
  });
}());

// ── FII Screening ─────────────────────────────────────────────────────────────
(function setupFiiScreening() {
  if (!document.querySelector("#screeningContent")) return;
  if (!document.querySelector("#screeningSegmento")) return;

  const content    = document.querySelector("#screeningContent");
  const searchEl   = document.querySelector("#screeningSearch");
  const sortEl     = document.querySelector("#screeningSort");
  const filterEl   = document.querySelector("#screeningFilter");
  const segmentoEl = document.querySelector("#screeningSegmento");
  const statEl     = document.querySelector("#screeningStat");
  const refreshBtn = document.querySelector("#screeningRefresh");

  let allData = [];
  let sortDir = -1;
  let activeSortCol = null;

  function fmtNum(v) {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "number" && !Number.isFinite(v)) return "—";
    if (typeof v === "string") return v;
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtPct(v) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "—";
    return formatPercent(v, 2);
  }
  function fmtCur(v) {
    if (!v && v !== 0) return "—";
    return formatCurrency(v);
  }
  function fmtLiq(v) {
    if (!v) return "—";
    return v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v);
  }

  // Fundamentus FII result page column names vary — try multiple candidates
  function getCol(row, ...keys) {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    return null;
  }

  function enrichFiiRow(row) {
    return {
      ...row,
      _seg:      String(getCol(row, "Segmento", "Setor", "Tipo") || ""),
      _cotacao:  getCol(row, "Cotação") ?? null,
      _dy:       getCol(row, "Div. Yield", "Div.Yield", "Dividend Yield", "DY", "Yield") ?? null,
      _ffo:      getCol(row, "FFO Yield", "FFOYield", "FFO") ?? null,
      _liq:      getCol(row, "Liquidez", "Liq. 2meses", "Liq.2meses") ?? 0,
      _caprate:  getCol(row, "Cap Rate", "CapRate") ?? null,
      _vacancia: getCol(row, "Vacância Média", "Vacancia", "Vacância") ?? null,
    };
  }

  function applyFilters(data) {
    let rows = data;
    const q = (searchEl.value || "").toUpperCase();
    if (q) rows = rows.filter(r => String(r["Papel"] || "").toUpperCase().includes(q));

    const seg = segmentoEl.value;
    if (seg !== "all") rows = rows.filter(r => r._seg.toUpperCase() === seg);

    switch (filterEl.value) {
      case "dy_8":         rows = rows.filter(r => (r._dy ?? 0) >= 0.08); break;
      case "dy_10":        rows = rows.filter(r => (r._dy ?? 0) >= 0.10); break;
      case "pvp_1":        rows = rows.filter(r => { const v = getCol(r, "P/VP"); return v !== null && v <= 1; }); break;
      case "liq_100k":     rows = rows.filter(r => (r._liq ?? 0) >= 100_000); break;
      case "sem_vacancia": rows = rows.filter(r => r._vacancia === 0 || r._vacancia === null); break;
    }
    return rows;
  }

  function applySort(data) {
    const sortFns = {
      "dy_desc":      (a, b) => (b._dy ?? -Infinity) - (a._dy ?? -Infinity),
      "ffo_desc":     (a, b) => (b._ffo ?? -Infinity) - (a._ffo ?? -Infinity),
      "pvp_asc":      (a, b) => (getCol(a, "P/VP") ?? Infinity) - (getCol(b, "P/VP") ?? Infinity),
      "liq_desc":     (a, b) => (b._liq ?? -Infinity) - (a._liq ?? -Infinity),
      "caprate_desc": (a, b) => (b._caprate ?? -Infinity) - (a._caprate ?? -Infinity),
      "vacancia_asc": (a, b) => (a._vacancia ?? Infinity) - (b._vacancia ?? Infinity),
    };
    const fn = activeSortCol
      ? (a, b) => {
          const av = a[activeSortCol]; const bv = b[activeSortCol];
          if (av == null) return 1; if (bv == null) return -1;
          return (av - bv) * sortDir;
        }
      : sortFns[sortEl.value] || sortFns["dy_desc"];
    return [...data].sort(fn);
  }

  const COLS_FII = [
    { key: "Papel",    label: "Papel",     fmt: v => v },
    { key: "_seg",     label: "Segmento",  fmt: v => v || "—" },
    { key: "_cotacao", label: "Cotação",   fmt: fmtCur },
    { key: "_dy",      label: "DY",        fmt: fmtPct },
    { key: "_ffo",     label: "FFO Yield", fmt: fmtPct },
    { key: "P/VP",     label: "P/VP",      fmt: fmtNum },
    { key: "_liq",     label: "Liquidez",  fmt: fmtLiq },
    { key: "_caprate", label: "Cap Rate",  fmt: fmtPct },
    { key: "_vacancia",label: "Vacância",  fmt: fmtPct },
  ];

  function renderTable(rows) {
    if (rows.length === 0) {
      content.innerHTML = `<div class="screening-loading"><p>Nenhum FII encontrado com os filtros aplicados.</p></div>`;
      return;
    }
    const ths = COLS_FII.map(col => {
      const cls = activeSortCol === col.key ? (sortDir === 1 ? "sort-asc" : "sort-desc") : "";
      return `<th class="${cls}" data-col="${col.key}">${col.label}</th>`;
    }).join("");

    const trs = rows.map(row => {
      const link = row["Papel"] ? `href="valuation-fii.html?ticker=${encodeURIComponent(row["Papel"])}"` : "";
      return `<tr>
        <td><a ${link} style="color:var(--accent);font-weight:800;text-decoration:none">${row["Papel"]}</a></td>
        ${COLS_FII.slice(1).map(col => `<td>${col.fmt(row[col.key])}</td>`).join("")}
      </tr>`;
    }).join("");

    content.innerHTML = `
      <div class="screening-table-wrap">
        <table class="screening-table" aria-label="Screening de FIIs">
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>`;

    content.querySelectorAll(".screening-table thead th[data-col]").forEach(th => {
      th.addEventListener("click", () => {
        const col = th.dataset.col;
        if (activeSortCol === col) sortDir *= -1;
        else { activeSortCol = col; sortDir = -1; }
        renderFiltered();
      });
    });
  }

  function populateSegmentos(data) {
    const segs = [...new Set(data.map(r => r._seg).filter(Boolean))].sort();
    const prev = segmentoEl.value;
    segmentoEl.innerHTML = `<option value="all">Todos os segmentos</option>` +
      segs.map(s => `<option value="${s.toUpperCase()}">${s}</option>`).join("");
    if (prev !== "all") segmentoEl.value = prev;
  }

  function renderFiltered() {
    const filtered = applyFilters(allData);
    const sorted = applySort(filtered);
    statEl.innerHTML = `<strong>${sorted.length}</strong> FIIs`;
    renderTable(sorted);
  }

  async function loadData(forceRefresh = false) {
    content.innerHTML = `<div class="screening-loading"><p>Buscando dados do Fundamentus…</p><p style="font-size:.8rem;margin-top:4px">Isso pode levar alguns segundos na primeira vez.</p></div>`;
    statEl.textContent = "Carregando…";
    try {
      const url = "/invest/api/fundamentus/fiis" + (forceRefresh ? "?refresh=1" : "");
      const res = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Erro");
      allData = json.data.map(enrichFiiRow);
      const age = json.cacheAgeMinutes ?? 0;
      statEl.innerHTML = `<strong>${allData.length}</strong> FIIs · cache ${age}min`;
      populateSegmentos(allData);
      renderFiltered();
    } catch (e) {
      content.innerHTML = `<div class="screening-loading"><p style="color:var(--danger)">Erro ao carregar: ${e.message}</p><p style="font-size:.8rem">O Fundamentus pode estar indisponível. Tente em alguns instantes.</p></div>`;
      statEl.textContent = "Erro";
    }
  }

  searchEl.addEventListener("input", () => renderFiltered());
  sortEl.addEventListener("change", () => { activeSortCol = null; renderFiltered(); });
  filterEl.addEventListener("change", () => renderFiltered());
  segmentoEl.addEventListener("change", () => renderFiltered());
  refreshBtn.addEventListener("click", () => loadData(true));

  window.getAiContext = () => {
    const filtered = applyFilters(allData);
    const top10 = applySort(filtered).slice(0, 10);
    if (top10.length === 0) return "Nenhum FII carregado no screening.";
    const rows = top10.map(r =>
      `${r["Papel"]}: cotação ${fmtCur(r._cotacao)}, DY ${fmtPct(r._dy)}, P/VP ${fmtNum(getCol(r, "P/VP"))}, Segmento: ${r._seg}`
    ).join("\n");
    return `Screening de FIIs (${filtered.length} resultados):\n${rows}`;
  };

  loadData();
}());

// Auto-format R$ and % inputs on blur
(function setupInputAutoFormat() {
  document.querySelectorAll(".input-shell").forEach((shell) => {
    const icon = shell.querySelector(".field-icon");
    const input = shell.querySelector('input[type="text"]');
    if (!icon || !input) return;
    if (input.hasAttribute("data-no-format")) return;
    const iconText = icon.textContent.trim();

    if (iconText === "R$") {
      input.addEventListener("blur", () => {
        if (!input.value.trim()) return;
        const val = parseNumber(input.value);
        input.value = formatCurrency(val);
      });
    } else if (iconText === "%") {
      input.addEventListener("blur", () => {
        if (!input.value.trim()) return;
        const val = parseNumber(input.value);
        if (!Number.isFinite(val)) return;
        const digits = Number.isInteger(val) ? 0 : 2;
        input.value = val.toLocaleString("pt-BR", {
          minimumFractionDigits: digits,
          maximumFractionDigits: 2,
        }) + "%";
      });
    }
  });
}());

// ── Análise de FII (Due Diligence — Tijolo & Papel) ───────────────────────────
(function setupAnaliseFii() {
  const form = document.querySelector("#analiseFiiForm");
  if (!form) return;

  const STORAGE_KEY = "sibainvest-analises-fii";
  const sectionsEl = document.querySelector("#analiseFiiSections");
  const savedListEl = document.querySelector("#afiiSavedList");
  const savedCountEl = document.querySelector("#afiiSavedCount");
  const statusEl = document.querySelector("#afiiSaveStatus");
  const snapshotEl = document.querySelector("#afiiSnapshot");
  const hint = document.querySelector("#tickerLookupHint");

  let tipo = "tijolo";
  let editingId = null;
  let currentFund = null; // {ticker, cotacao, dy, segmento}

  // Selects reutilizáveis
  const SEL = {
    gestao: ["Ativa", "Passiva"],
    ifix: ["Acima do IFIX", "Junto do IFIX", "Abaixo do IFIX"],
    dist: ["Crescente", "Constante", "Em queda", "Em recuperação"],
    cmp: ["Maior", "Igual", "Menor"],
    risco3: ["Baixo", "Médio", "Alto"],
    perfil: ["Oportunidade", "Ancoragem", "Risco"],
    grade: ["High Grade (baixo risco)", "Middle Grade (risco médio)", "High Yield (alto risco)"],
    simnao: ["Sim", "Não", "Parcial"],
  };

  // Roteiro: cada item { k, q, h(elp), t(ipo), o(pções) }
  const COMMON_DIST = [
    { k: "padraoDist", q: "Padrão de distribuição", h: "Crescente é ótimo, constante é ok, em queda acende alerta. Olhe a tendência dos últimos 12 meses.", t: "select", o: SEL.dist },
    { k: "distAnual", q: "Distribuição aumentando ano a ano?", h: "Fundos que sobem o provento ano após ano protegem seu poder de compra contra a inflação.", t: "select", o: SEL.simnao },
    { k: "resultadoMes", q: "Resultado vs. mês anterior", h: "Compare o resultado operacional (não a distribuição) com o mês passado.", t: "select", o: SEL.cmp },
    { k: "motivoResultado", q: "Motivo da variação do resultado", h: "Entenda a causa: vacância, reajuste de aluguel, despesa financeira, receita extraordinária etc.", t: "area" },
    { k: "resultadoVsDist", q: "Resultado por cota vs. distribuição", h: "Se distribui MAIS do que gera de forma recorrente, está consumindo reserva — insustentável no longo prazo.", t: "select", o: SEL.cmp },
    { k: "saldoAcumulado", q: "Saldo acumulado por cota (reserva)", h: "Reserva de lucro é o colchão que sustenta a distribuição em meses fracos. Quanto maior, mais segurança.", t: "text" },
    { k: "saldoConsumo", q: "Saldo está sendo consumido? Duraria quanto?", h: "Se a reserva cai todo mês, calcule por quantos meses ainda dura no ritmo atual.", t: "area" },
    { k: "ffoVsDy", q: "FFO Yield vs. Dividend Yield", h: "FFO é a geração de caixa recorrente. Se o DY está bem acima do FFO, parte do provento é não-recorrente.", t: "text" },
    { k: "ffoExtraord", q: "Se FFO < DY: houve receita extraordinária? Tem saldo?", h: "DY alto sustentado por vendas pontuais cai quando acabarem. Confirme se há reserva por trás.", t: "area" },
  ];
  const COMMON_RISK_TAIL = [
    { k: "liquidez", q: "Liquidez", h: "Liquidez crescente/estável facilita comprar e vender sem afetar o preço. Decrescente é ponto de atenção.", t: "select", o: SEL.dist },
    { k: "perfil", q: "Risco / Oportunidade / Ancoragem", h: "Ancoragem = base sólida da carteira. Oportunidade = descontado com tese. Risco = exige acompanhamento.", t: "select", o: SEL.perfil },
    { k: "nivelRisco", q: "Nível de risco geral", h: "Sua nota de risco do fundo considerando tudo acima.", t: "select", o: SEL.risco3 },
    { k: "atencao", q: "Pontos de atenção / a monitorar", h: "O que pode dar errado e você precisa acompanhar nos próximos relatórios.", t: "area" },
    { k: "comunicados", q: "Comunicados importantes", h: "Aquisições, vendas, emissões, mudanças de inquilino/devedor, problemas relevantes.", t: "area" },
    { k: "conclusao", q: "Conclusão", h: "Resumo: o fundo é bom? Está caro ou barato? Compra, observa ou passa? Justifique.", t: "area" },
  ];

  const ROTEIRO = {
    tijolo: [
      { sec: "Estratégia & Gestão", items: [
        { k: "estrategia", q: "Estratégia / objetivo do fundo", h: "O que o fundo faz para ganhar dinheiro: renda de aluguéis, ganho de capital com compra/venda, ou ambos.", t: "area" },
        { k: "segmento", q: "Segmento", h: "Logística, lajes corporativas, shoppings, renda urbana... 'Híbrido' não é segmento, é mistura.", t: "text" },
        { k: "gestao", q: "Tipo de gestão", h: "Ativa: gestor compra/vende ativamente. Passiva: mantém os imóveis. Nenhuma é melhor — depende da tese.", t: "select", o: SEL.gestao },
        { k: "ifix", q: "Comparação com o IFIX", h: "Como rendeu vs. o índice de FIIs nos últimos anos. Ganhar do IFIX de forma consistente é bom sinal.", t: "select", o: SEL.ifix },
        { k: "taxaAdm", q: "Taxa de administração", h: "Quanto custa o fundo ao ano. Acima de ~1% a.a. para tijolo já é caro; compare com pares.", t: "text" },
        { k: "taxaPerf", q: "Taxa de performance", h: "Cobrança extra sobre ganhos acima de um benchmark. Zero é melhor para o cotista.", t: "text" },
      ]},
      { sec: "Imóveis & Contratos", items: [
        { k: "alocacao", q: "Alocação: % Imóveis, % FIIs, % Caixa", h: "Muito caixa parado rende pouco; muito investido em outros FIIs vira 'fundo de fundos'. Equilíbrio importa.", t: "text" },
        { k: "qtdImoveis", q: "Quantidade de imóveis", h: "Mais imóveis = mais diversificação física, menos dependência de um único ativo.", t: "text" },
        { k: "contratosTipo", q: "% contratos típicos e atípicos", h: "Atípicos são mais longos e seguros (multa alta para sair). Típicos têm mais flexibilidade e risco de saída.", t: "text" },
        { k: "wault", q: "Prazo médio dos contratos (WAULT)", h: "Quanto tempo, em média, até os contratos vencerem. Quanto maior, mais previsível a receita.", t: "text" },
        { k: "contratosVenc", q: "Contratos perto de vencer? Qual %?", h: "Muitos vencimentos próximos = risco de renegociação/saída de inquilino no curto prazo.", t: "area" },
        { k: "qtdInquilinos", q: "Quantos inquilinos", h: "Mais inquilinos = carteira pulverizada, menos dependência de um pagador.", t: "text" },
        { k: "segInquilinos", q: "Segmentos dos inquilinos", h: "Diversificação setorial protege contra crise de um setor específico.", t: "area" },
        { k: "maiorSetor", q: "% da carteira no maior setor", h: "Concentração alta em um setor aumenta o risco caso ele entre em crise.", t: "text" },
        { k: "concentracao", q: "Concentração em algum inquilino?", h: "Qual inquilino, qual % da receita e a saúde financeira dele. Concentração alta em um pagador é risco.", t: "area" },
        { k: "carencia", q: "Inquilino em período de carência?", h: "Carência = aluguel ainda não está sendo pago integralmente; a receita pode subir ou frustrar depois.", t: "text" },
      ]},
      { sec: "Saúde Financeira", items: [
        { k: "vacFinanceira", q: "Vacância financeira", h: "% da receita potencial que NÃO está sendo recebida por área vaga. Mais relevante que a física.", t: "text" },
        { k: "vacFisica", q: "Vacância física", h: "% da área (m²) desocupada. Olhe junto com a financeira para entender o impacto real.", t: "text" },
        { k: "inadimplencia", q: "Inadimplência", h: "Inquilinos que não pagam. Idealmente próxima de zero; tendência de alta é alerta.", t: "text" },
        { k: "alavancagem", q: "Alavancagem", h: "Dívida do fundo. Alavancagem amplia ganhos e perdas; acima de ~30% exige atenção ao custo da dívida.", t: "text" },
        { k: "taxaAlav", q: "Taxa média da dívida", h: "Ex.: IPCA+6%. Se a dívida custa mais do que os imóveis rendem, ela destrói valor.", t: "text" },
        { k: "amortizacao", q: "Plano de amortização", h: "Quanto e quando o fundo precisa pagar de dívida, e se o caixa cobre. Vencimentos pesados sem caixa = risco.", t: "area" },
      ]},
      { sec: "Distribuição & Resultado", items: COMMON_DIST },
      { sec: "Risco & Conclusão", items: COMMON_RISK_TAIL },
    ],
    papel: [
      { sec: "Estratégia & Gestão", items: [
        { k: "estrategia", q: "Estratégia / objetivo do fundo", h: "Como o fundo de crédito ganha: juros dos CRIs/CRAs (high grade x high yield), ganho com marcação, etc.", t: "area" },
        { k: "gestao", q: "Tipo de gestão", h: "Ativa: gestor gira a carteira de crédito. Passiva: carrega até o vencimento.", t: "select", o: SEL.gestao },
        { k: "ifix", q: "Comparação com o IFIX", h: "Desempenho vs. o índice de FIIs. Em fundos de papel, compare também com o CDI/IMA-B.", t: "select", o: SEL.ifix },
        { k: "taxaAdm", q: "Taxa de administração", h: "Custo anual do fundo. Compare com pares de papel; taxas altas comem o retorno do crédito.", t: "text" },
        { k: "taxaPerf", q: "Taxa de performance", h: "Cobrança sobre ganhos acima do benchmark. Zero é melhor para o cotista.", t: "text" },
      ]},
      { sec: "Carteira de Crédito", items: [
        { k: "alocacao", q: "Alocação: % CRI/CRA, % FIIs, % Caixa", h: "Quanto está em crédito vs. caixa/outros FIIs. Caixa alto dilui o retorno; muito FII vira fundo de fundos.", t: "text" },
        { k: "qtdCreditos", q: "Quantidade de créditos (operações)", h: "Mais operações = carteira pulverizada, menos dependência de um único devedor.", t: "text" },
        { k: "indexador", q: "Indexador: % CDI e % IPCA", h: "CDI protege em juros altos; IPCA protege da inflação. O mix define como o fundo reage ao cenário.", t: "text" },
        { k: "taxaCreditos", q: "Taxa média dos créditos", h: "Ex.: CDI+3% / IPCA+8%. É o 'spread' que o fundo ganha. Spread alto pode significar risco maior.", t: "text" },
        { k: "duration", q: "Duration da carteira", h: "Prazo médio ponderado dos créditos. Duration longa oscila mais com juros; curta é mais estável.", t: "text" },
        { k: "garantias", q: "Garantias praticadas", h: "Alienação/cessão fiduciária, hipoteca, fiança, reservas. Boas garantias reduzem a perda em caso de calote.", t: "area" },
        { k: "ltv", q: "LTV médio", h: "Loan-to-Value: valor do crédito ÷ valor da garantia. LTV baixo (ex.: 50%) = mais margem de segurança.", t: "text" },
        { k: "segDevedores", q: "Segmentos dos devedores", h: "Diversificação setorial dos tomadores reduz o risco de uma crise setorial específica.", t: "area" },
        { k: "maiorSetor", q: "% da carteira no maior setor", h: "Concentração alta em um setor aumenta o risco sistêmico da carteira.", t: "text" },
        { k: "concentracao", q: "Concentração em algum devedor?", h: "Qual devedor, qual % e a saúde financeira dele. Concentração alta em um pagador é o maior risco do papel.", t: "area" },
      ]},
      { sec: "Saúde Financeira", items: [
        { k: "inadimplencia", q: "Inadimplência da carteira", h: "Créditos em atraso/default. Em fundos de papel é o indicador-chave de qualidade.", t: "text" },
        { k: "alavancagem", q: "Alavancagem", h: "Uso de dívida/compromissadas para ampliar a carteira. Amplia ganho e risco.", t: "text" },
        { k: "taxaAlav", q: "Taxa média da alavancagem", h: "Custo da alavancagem vs. o que a carteira rende. Se custa mais que rende, destrói valor.", t: "text" },
        { k: "amortizacao", q: "Plano de amortização / compromissos", h: "Obrigações financeiras e se o caixa cobre. Descasamento de prazos é risco de liquidez.", t: "area" },
      ]},
      { sec: "Distribuição & Resultado", items: COMMON_DIST },
      { sec: "Risco & Conclusão", items: [
        { k: "grade", q: "Classificação de crédito", h: "High Grade = devedores sólidos, menor risco/retorno. High Yield = mais retorno e mais risco de calote.", t: "select", o: SEL.grade },
        ...COMMON_RISK_TAIL,
      ]},
    ],
  };

  function fieldId(k) { return "afii_" + k; }

  function renderSections() {
    const roteiro = ROTEIRO[tipo];
    sectionsEl.innerHTML = roteiro.map((group) => {
      const cards = group.items.map((it) => {
        const id = fieldId(it.k);
        let control;
        if (it.t === "select") {
          control = `<select id="${id}" name="${it.k}" class="afii-input">
            <option value="">—</option>
            ${it.o.map((o) => `<option value="${o}">${o}</option>`).join("")}
          </select>`;
        } else if (it.t === "area") {
          control = `<textarea id="${id}" name="${it.k}" class="afii-input afii-area" rows="2" placeholder="Sua análise…"></textarea>`;
        } else {
          control = `<input id="${id}" name="${it.k}" type="text" class="afii-input" placeholder="…" />`;
        }
        return `<div class="afii-q">
          <div class="afii-q-head">
            <label for="${id}">${it.q}</label>
            <span class="afii-help-wrap">
              <button type="button" class="afii-help-btn" aria-label="O que observar" aria-describedby="${id}-h">?</button>
              <span class="afii-help-tip" id="${id}-h" role="tooltip">${it.h}</span>
            </span>
          </div>
          ${control}
        </div>`;
      }).join("");
      return `<section class="afii-section">
        <h2 class="afii-section-title">${group.sec}</h2>
        <div class="afii-q-grid">${cards}</div>
      </section>`;
    }).join("");
  }

  function collectAnswers() {
    const answers = {};
    sectionsEl.querySelectorAll(".afii-input").forEach((el) => {
      if (el.value && el.value.trim()) answers[el.name] = el.value.trim();
    });
    return answers;
  }

  function fillAnswers(answers) {
    if (!answers) return;
    Object.entries(answers).forEach(([k, v]) => {
      const el = document.getElementById(fieldId(k));
      if (el) el.value = v;
    });
  }

  function clearFields() {
    sectionsEl.querySelectorAll(".afii-input").forEach((el) => { el.value = ""; });
  }

  // ── Snapshot do fundo (Fundamentus) ──
  function renderSnapshot() {
    if (!currentFund) { snapshotEl.hidden = true; snapshotEl.innerHTML = ""; return; }
    const f = currentFund;
    snapshotEl.hidden = false;
    snapshotEl.innerHTML = `
      <span class="afii-chip"><strong>${f.ticker}</strong></span>
      ${f.segmento ? `<span class="afii-chip">${f.segmento}</span>` : ""}
      ${Number.isFinite(f.cotacao) ? `<span class="afii-chip">Cotação ${formatCurrency(f.cotacao)}</span>` : ""}
      ${Number.isFinite(f.dy) ? `<span class="afii-chip">DY ${formatPercent(f.dy, 2)}</span>` : ""}
      ${investidor10Link(f.ticker, "fii")}`;
  }

  // ── localStorage ──
  function loadAll() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function saveAll(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  function flash(msg, ok = true) {
    statusEl.textContent = msg;
    statusEl.className = "afii-save-status " + (ok ? "is-ok" : "is-err");
    setTimeout(() => { statusEl.textContent = ""; }, 3200);
  }

  function renderSaved() {
    const list = loadAll();
    savedCountEl.textContent = String(list.length);
    if (list.length === 0) {
      savedListEl.innerHTML = `<p class="afii-saved-empty">Nenhuma análise salva ainda. Preencha o roteiro e clique em <strong>Salvar análise</strong>.</p>`;
      return;
    }
    savedListEl.innerHTML = list.slice().reverse().map((a) => {
      const d = new Date(a.ts);
      const date = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const n = Object.keys(a.answers || {}).length;
      return `<article class="afii-saved-item" data-id="${a.id}">
        <div class="afii-saved-main">
          <span class="afii-saved-ticker">${a.ticker || "FII"}</span>
          <span class="afii-saved-type afii-type-${a.tipo}">${a.tipo === "papel" ? "Papel" : "Tijolo"}</span>
          <span class="afii-saved-meta">${n} campos · ${date}</span>
        </div>
        <div class="afii-saved-actions">
          <button type="button" class="afii-mini-btn" data-act="load">Abrir</button>
          <button type="button" class="afii-mini-btn afii-danger" data-act="del">Apagar</button>
        </div>
      </article>`;
    }).join("");
  }

  function buildText(a) {
    const roteiro = ROTEIRO[a.tipo] || ROTEIRO.tijolo;
    let out = `ANÁLISE DE FII — ${a.tipo === "papel" ? "PAPEL (Crédito)" : "TIJOLO (Imóveis)"}\n`;
    out += `Fundo: ${a.ticker || "—"}\n`;
    if (a.snapshot) {
      const s = a.snapshot;
      out += `Cotação: ${Number.isFinite(s.cotacao) ? formatCurrency(s.cotacao) : "—"} · DY: ${Number.isFinite(s.dy) ? formatPercent(s.dy, 2) : "—"} · Segmento: ${s.segmento || "—"}\n`;
    }
    out += `Data: ${new Date(a.ts).toLocaleString("pt-BR")}\n${"=".repeat(48)}\n`;
    roteiro.forEach((group) => {
      const answered = group.items.filter((it) => a.answers[it.k]);
      if (answered.length === 0) return;
      out += `\n## ${group.sec}\n`;
      answered.forEach((it) => { out += `\n• ${it.q}:\n  ${a.answers[it.k]}\n`; });
    });
    return out;
  }

  // ── Eventos ──
  document.querySelectorAll(".afii-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.type === tipo) return;
      const hasData = Object.keys(collectAnswers()).length > 0;
      if (hasData && !confirm("Trocar de tipo vai limpar os campos atuais (análises salvas não são afetadas). Continuar?")) return;
      tipo = btn.dataset.type;
      document.querySelectorAll(".afii-type-btn").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", String(on));
      });
      editingId = null;
      renderSections();
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const answers = collectAnswers();
    if (Object.keys(answers).length === 0) { flash("Preencha ao menos um campo antes de salvar.", false); return; }
    const list = loadAll();
    if (editingId) {
      const idx = list.findIndex((x) => x.id === editingId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], tipo, ticker: currentFund?.ticker || list[idx].ticker, snapshot: currentFund || list[idx].snapshot, answers, ts: Date.now() };
      }
      flash("Análise atualizada.");
    } else {
      list.push({ id: "a" + Date.now(), tipo, ticker: currentFund?.ticker || "", snapshot: currentFund, answers, ts: Date.now() });
      flash("Análise salva neste navegador.");
      editingId = list[list.length - 1].id;
    }
    saveAll(list);
    renderSaved();
  });

  document.querySelector("#afiiClearBtn").addEventListener("click", () => {
    clearFields(); editingId = null; flash("Campos limpos.");
  });

  document.querySelector("#afiiCopyBtn").addEventListener("click", async () => {
    const text = buildText({ tipo, ticker: currentFund?.ticker, snapshot: currentFund, answers: collectAnswers(), ts: Date.now() });
    try { await navigator.clipboard.writeText(text); flash("Texto copiado."); }
    catch { flash("Não foi possível copiar.", false); }
  });

  document.querySelector("#afiiExportBtn").addEventListener("click", () => {
    const a = { tipo, ticker: currentFund?.ticker, snapshot: currentFund, answers: collectAnswers(), ts: Date.now() };
    if (Object.keys(a.answers).length === 0) { flash("Nada para exportar.", false); return; }
    const blob = new Blob([buildText(a)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analise-fii-${(a.ticker || "fundo").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    flash("Arquivo exportado.");
  });

  savedListEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".afii-mini-btn");
    if (!btn) return;
    const id = btn.closest(".afii-saved-item").dataset.id;
    const list = loadAll();
    const item = list.find((x) => x.id === id);
    if (!item) return;
    if (btn.dataset.act === "del") {
      if (!confirm(`Apagar a análise de ${item.ticker || "FII"}?`)) return;
      saveAll(list.filter((x) => x.id !== id));
      if (editingId === id) editingId = null;
      renderSaved();
      flash("Análise apagada.");
    } else if (btn.dataset.act === "load") {
      if (item.tipo !== tipo) {
        tipo = item.tipo;
        document.querySelectorAll(".afii-type-btn").forEach((b) => {
          const on = b.dataset.type === tipo;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", String(on));
        });
        renderSections();
      } else {
        clearFields();
      }
      fillAnswers(item.answers);
      currentFund = item.snapshot || (item.ticker ? { ticker: item.ticker } : null);
      renderSnapshot();
      editingId = item.id;
      flash(`Análise de ${item.ticker || "FII"} carregada para edição.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // ── Autocomplete (Fundamentus) ──
  const searchInput = document.querySelector("#tickerSearchInput");
  const dropdown = document.querySelector("#tickerDropdown");
  if (searchInput && dropdown && hint) {
    createTickerAutocomplete({
      apiUrl: "/invest/api/fundamentus/fiis",
      inputEl: searchInput,
      dropdownEl: dropdown,
      hintEl: hint,
      onSelect(row) {
        currentFund = {
          ticker: row["Papel"] || "",
          cotacao: row["Cotação"] ?? null,
          dy: row["Div.Yield"] ?? row["Dividend Yield"] ?? row["DY"] ?? null,
          segmento: row["Segmento"] || row["Setor"] || "",
        };
        renderSnapshot();
        hint.innerHTML = `<span class="ticker-filled-tag">${currentFund.ticker} selecionado</span>`;
      },
    });
  }

  window.getAiContext = () => {
    const a = collectAnswers();
    const lines = Object.entries(a).map(([k, v]) => `${k}: ${v}`).join("\n");
    const head = currentFund ? `Analisando ${currentFund.ticker} (${currentFund.segmento || "?"}), tipo ${tipo}.` : `Análise de FII (${tipo}).`;
    return `${head}\nRespostas preenchidas:\n${lines || "(nenhuma ainda)"}`;
  };

  renderSections();
  renderSaved();
}());

// ── Carteira de FII (Rentabilidade) ───────────────────────────────────────────
(function setupCarteiraFii() {
  const addForm = document.querySelector("#cartAddForm");
  if (!addForm) return;

  const STORAGE_KEY = "sibainvest-carteira-fii";
  const summaryEl = document.querySelector("#carteiraSummary");
  const tableRegion = document.querySelector("#carteiraTableRegion");
  const allocEl = document.querySelector("#carteiraAllocation");
  const hint = document.querySelector("#tickerLookupHint");
  const qtdInput = document.querySelector("#cartQtd");
  const pmInput = document.querySelector("#cartPm");
  const riscoInput = document.querySelector("#cartRisco");

  let fundMap = {};        // ticker -> {cotacao, dy, segmento}
  let positions = [];      // {id, ticker, qtd, pm, proventos, risco}
  let pendingTicker = null;

  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); }

  function fcur(v) { return Number.isFinite(v) ? formatCurrency(v) : "—"; }
  function fpct(v) { return Number.isFinite(v) ? formatPercent(v, 2) : "—"; }
  function fnum(v) { return Number.isFinite(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "—"; }

  // Métricas de uma posição com a cotação/DY atuais do Fundamentus
  function metrics(p) {
    const snap = fundMap[p.ticker] || {};
    const cotacao = Number.isFinite(snap.cotacao) ? snap.cotacao : null;
    const dy = Number.isFinite(snap.dy) ? snap.dy : null;
    const qtd = p.qtd || 0;
    const pm = p.pm || 0;
    const investido = qtd * pm;
    const saldo = cotacao != null ? qtd * cotacao : null;
    const valor = saldo != null ? saldo - investido : null;
    const valorPct = (saldo != null && investido > 0) ? saldo / investido - 1 : null;
    const divAnualCota = (dy != null && cotacao != null) ? dy * cotacao : null;
    const rendaMes = divAnualCota != null ? (divAnualCota * qtd) / 12 : null;
    const yoc = (divAnualCota != null && pm > 0) ? divAnualCota / pm : null;
    const proventos = p.proventos || 0;
    const rentabPct = investido > 0 && saldo != null ? (saldo - investido + proventos) / investido : null;
    return { cotacao, dy, segmento: snap.segmento || "—", investido, saldo, valor, valorPct, rendaMes, yoc, proventos, rentabPct };
  }

  function totals() {
    let investido = 0, patrimonio = 0, rendaMes = 0, proventos = 0, comCotacao = 0;
    positions.forEach((p) => {
      const m = metrics(p);
      investido += m.investido;
      if (m.saldo != null) { patrimonio += m.saldo; comCotacao++; }
      if (m.rendaMes != null) rendaMes += m.rendaMes;
      proventos += m.proventos;
    });
    const valor = patrimonio - investido;
    const valorPct = investido > 0 ? patrimonio / investido - 1 : null;
    const yocMedio = investido > 0 ? (rendaMes * 12) / investido : null;
    const dyMedio = patrimonio > 0 ? (rendaMes * 12) / patrimonio : null;
    const rentabPct = investido > 0 ? (patrimonio - investido + proventos) / investido : null;
    return { investido, patrimonio, valor, valorPct, rendaMes, proventos, yocMedio, dyMedio, rentabPct };
  }

  function renderSummary() {
    if (positions.length === 0) { summaryEl.innerHTML = ""; return; }
    const t = totals();
    const valClass = t.valor > 0 ? "is-pos" : t.valor < 0 ? "is-neg" : "";
    const cards = [
      { label: "Patrimônio atual", value: fcur(t.patrimonio), sub: `Investido ${fcur(t.investido)}` },
      { label: "Valorização", value: fcur(t.valor), sub: fpct(t.valorPct), cls: valClass },
      { label: "Renda mensal estimada", value: fcur(t.rendaMes), sub: `${fcur(t.rendaMes * 12)} / ano` },
      { label: "YoC médio", value: fpct(t.yocMedio), sub: `DY atual ${fpct(t.dyMedio)}` },
      { label: "Rentabilidade total", value: fpct(t.rentabPct), sub: t.proventos > 0 ? `Proventos ${fcur(t.proventos)}` : "valorização (sem proventos)", cls: (t.rentabPct ?? 0) >= 0 ? "is-pos" : "is-neg" },
    ];
    summaryEl.innerHTML = cards.map((c) => `
      <div class="cart-card ${c.cls || ""}">
        <span class="cart-card-label">${c.label}</span>
        <strong class="cart-card-value">${c.value}</strong>
        <span class="cart-card-sub">${c.sub}</span>
      </div>`).join("");
  }

  const RISCOS = ["Ancoragem", "Oportunidade", "Risco"];

  function renderTable() {
    if (positions.length === 0) {
      tableRegion.innerHTML = `<div class="cart-empty"><p>Sua carteira está vazia.</p><p class="cart-empty-sub">Adicione um fundo acima para começar a acompanhar.</p></div>`;
      return;
    }
    const t = totals();
    const rows = positions.map((p) => {
      const m = metrics(p);
      const peso = (m.saldo != null && t.patrimonio > 0) ? m.saldo / t.patrimonio : null;
      const valCls = m.valor > 0 ? "cart-pos" : m.valor < 0 ? "cart-neg" : "";
      const riscoOpts = RISCOS.map((r) => `<option value="${r}"${r === p.risco ? " selected" : ""}>${r}</option>`).join("");
      return `<tr data-id="${p.id}">
        <td><a class="cart-ticker" href="https://investidor10.com.br/fiis/${p.ticker.toLowerCase()}/" target="_blank" rel="noopener noreferrer" title="Ver ${p.ticker} no Investidor10">${p.ticker}</a></td>
        <td class="cart-muted">${m.segmento}</td>
        <td><select class="cart-cell-input cart-risco-sel" data-field="risco" aria-label="Classificação">${riscoOpts}</select></td>
        <td><input class="cart-cell-input cart-num" data-field="qtd" inputmode="numeric" value="${p.qtd || ""}" aria-label="Quantidade" /></td>
        <td><input class="cart-cell-input cart-num" data-field="pm" inputmode="decimal" value="${p.pm ? formatCurrency(p.pm) : ""}" aria-label="Preço médio" /></td>
        <td class="cart-strong">${fcur(m.cotacao)}</td>
        <td class="cart-strong">${fcur(m.saldo)}</td>
        <td class="${valCls}">${fcur(m.valor)}<span class="cart-sub-pct">${fpct(m.valorPct)}</span></td>
        <td>${fpct(m.yoc)}</td>
        <td>${fcur(m.rendaMes)}</td>
        <td><input class="cart-cell-input cart-num" data-field="proventos" inputmode="decimal" value="${p.proventos ? formatCurrency(p.proventos) : ""}" aria-label="Proventos recebidos" /></td>
        <td class="cart-peso"><span class="cart-peso-bar" style="--w:${peso != null ? (peso * 100).toFixed(1) : 0}%"></span><span class="cart-peso-num">${fpct(peso)}</span></td>
        <td><button type="button" class="cart-del" data-act="del" aria-label="Remover ${p.ticker}">✕</button></td>
      </tr>`;
    }).join("");

    tableRegion.innerHTML = `
      <div class="cart-table-head">
        <h2>Posições <span class="cart-count">${positions.length}</span></h2>
        <button type="button" class="afii-ghost-btn afii-danger" id="cartClearAll">Limpar carteira</button>
      </div>
      <div class="screening-table-wrap">
        <table class="screening-table cart-table" aria-label="Posições da carteira">
          <thead><tr>
            <th>Fundo</th><th>Segmento</th><th>Classif.</th><th>Qtd</th><th>Preço médio</th>
            <th>Cotação</th><th>Saldo atual</th><th>Valorização</th><th>YoC</th><th>Renda/mês</th>
            <th>Proventos receb.</th><th>Peso</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function renderAllocation() {
    if (positions.length === 0) { allocEl.innerHTML = ""; return; }
    const t = totals();
    if (t.patrimonio <= 0) { allocEl.innerHTML = ""; return; }
    const bySeg = {}, byRisco = {};
    positions.forEach((p) => {
      const m = metrics(p);
      if (m.saldo == null) return;
      bySeg[m.segmento] = (bySeg[m.segmento] || 0) + m.saldo;
      byRisco[p.risco] = (byRisco[p.risco] || 0) + m.saldo;
    });
    const bar = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
      const pct = v / t.patrimonio;
      return `<div class="cart-alloc-row">
        <span class="cart-alloc-label">${k}</span>
        <span class="cart-alloc-track"><span class="cart-alloc-fill" style="width:${(pct * 100).toFixed(1)}%"></span></span>
        <span class="cart-alloc-val">${formatPercent(pct, 1)}</span>
      </div>`;
    }).join("");
    allocEl.innerHTML = `
      <div class="cart-alloc-block">
        <h2>Alocação por segmento</h2>
        ${bar(bySeg)}
      </div>
      <div class="cart-alloc-block">
        <h2>Alocação por classificação</h2>
        ${bar(byRisco)}
      </div>`;
  }

  function renderAll() { renderSummary(); renderTable(); renderAllocation(); }

  // ── Eventos da tabela (edição inline + remoção) ──
  tableRegion.addEventListener("input", (e) => {
    const input = e.target.closest(".cart-cell-input");
    if (!input) return;
    const id = input.closest("tr").dataset.id;
    const p = positions.find((x) => x.id === id);
    if (!p) return;
    const field = input.dataset.field;
    if (field === "qtd") p.qtd = parseNumber(input.value) || 0;
    else if (field === "pm") p.pm = parseNumber(input.value) || 0;
    else if (field === "proventos") p.proventos = parseNumber(input.value) || 0;
    else if (field === "risco") p.risco = input.value;
    save();
    renderSummary();
    // atualiza apenas células derivadas, sem recriar inputs (mantém foco)
    updateDerivedCells();
    renderAllocation();
  });

  tableRegion.addEventListener("blur", (e) => {
    const input = e.target.closest(".cart-cell-input.cart-num");
    if (!input) return;
    const id = input.closest("tr").dataset.id;
    const p = positions.find((x) => x.id === id);
    if (!p) return;
    const field = input.dataset.field;
    const val = field === "qtd" ? (p.qtd ? fnum(p.qtd) : "") : ((p[field]) ? formatCurrency(p[field]) : "");
    input.value = val;
  }, true);

  function updateDerivedCells() {
    const t = totals();
    positions.forEach((p) => {
      const tr = tableRegion.querySelector(`tr[data-id="${p.id}"]`);
      if (!tr) return;
      const m = metrics(p);
      const peso = (m.saldo != null && t.patrimonio > 0) ? m.saldo / t.patrimonio : null;
      const tds = tr.querySelectorAll("td");
      // índices: 5 cotação, 6 saldo, 7 valoriz, 8 yoc, 9 renda, 11 peso
      tds[5].textContent = fcur(m.cotacao);
      tds[6].textContent = fcur(m.saldo);
      tds[7].className = m.valor > 0 ? "cart-pos" : m.valor < 0 ? "cart-neg" : "";
      tds[7].innerHTML = `${fcur(m.valor)}<span class="cart-sub-pct">${fpct(m.valorPct)}</span>`;
      tds[8].textContent = fpct(m.yoc);
      tds[9].textContent = fcur(m.rendaMes);
      tds[11].innerHTML = `<span class="cart-peso-bar" style="--w:${peso != null ? (peso * 100).toFixed(1) : 0}%"></span><span class="cart-peso-num">${fpct(peso)}</span>`;
    });
  }

  tableRegion.addEventListener("click", (e) => {
    if (e.target.closest("#cartClearAll")) {
      if (!confirm("Remover todos os fundos da carteira?")) return;
      positions = []; save(); renderAll(); return;
    }
    const del = e.target.closest('[data-act="del"]');
    if (del) {
      const id = del.closest("tr").dataset.id;
      positions = positions.filter((x) => x.id !== id);
      save(); renderAll();
    }
  });

  // ── Adicionar posição ──
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const ticker = (pendingTicker || document.querySelector("#tickerSearchInput").value || "").trim().toUpperCase();
    if (!ticker) { hint.innerHTML = `<span style="color:var(--danger)">Digite um ticker.</span>`; return; }
    if (positions.some((p) => p.ticker === ticker)) {
      hint.innerHTML = `<span style="color:var(--danger)">${ticker} já está na carteira.</span>`;
      return;
    }
    const qtd = parseNumber(qtdInput.value) || 0;
    const pm = parseNumber(pmInput.value) || 0;
    positions.push({ id: "p" + Date.now(), ticker, qtd, pm, proventos: 0, risco: riscoInput.value });
    save();
    renderAll();
    // reset add bar
    document.querySelector("#tickerSearchInput").value = "";
    qtdInput.value = ""; pmInput.value = ""; pendingTicker = null;
    hint.innerHTML = `<span class="ticker-filled-tag">${ticker} adicionado</span>`;
  });

  // ── Autocomplete + carregamento do mapa de fundos ──
  const searchInput = document.querySelector("#tickerSearchInput");
  const dropdown = document.querySelector("#tickerDropdown");
  createTickerAutocomplete({
    apiUrl: "/invest/api/fundamentus/fiis",
    inputEl: searchInput,
    dropdownEl: dropdown,
    hintEl: hint,
    onSelect(row) {
      pendingTicker = (row["Papel"] || "").trim().toUpperCase();
      // se cotação ainda não veio do mapa, usa a do row
      if (!fundMap[pendingTicker]) {
        fundMap[pendingTicker] = {
          cotacao: row["Cotação"] ?? null,
          dy: row["Div.Yield"] ?? row["Dividend Yield"] ?? null,
          segmento: row["Segmento"] || row["Setor"] || "—",
        };
      }
      // sugere preço médio = cotação atual, se vazio
      if (!pmInput.value && Number.isFinite(fundMap[pendingTicker].cotacao)) {
        pmInput.value = formatCurrency(fundMap[pendingTicker].cotacao);
      }
      qtdInput.focus();
    },
  });

  // Carrega o mapa completo (cotação/DY/segmento de todos os FIIs) para recalcular a carteira
  async function loadFundMap() {
    try {
      const res = await fetch("/invest/api/fundamentus/fiis");
      const json = await res.json();
      if (!json.ok) return;
      json.data.forEach((row) => {
        const t = (row["Papel"] || "").trim().toUpperCase();
        if (!t) return;
        fundMap[t] = {
          cotacao: row["Cotação"] ?? null,
          dy: row["Div.Yield"] ?? row["Dividend Yield"] ?? null,
          segmento: row["Segmento"] || row["Setor"] || "—",
        };
      });
      renderAll(); // recalcula com cotações reais
    } catch { /* mantém o que tiver */ }
  }

  window.getAiContext = () => {
    if (positions.length === 0) return "Carteira de FII vazia.";
    const t = totals();
    const lines = positions.map((p) => {
      const m = metrics(p);
      return `${p.ticker} (${m.segmento}, ${p.risco}): ${p.qtd} cotas, PM ${fcur(p.pm)}, cotação ${fcur(m.cotacao)}, saldo ${fcur(m.saldo)}, valoriz ${fpct(m.valorPct)}, YoC ${fpct(m.yoc)}`;
    }).join("\n");
    return `Carteira de FII — patrimônio ${fcur(t.patrimonio)}, investido ${fcur(t.investido)}, valorização ${fpct(t.valorPct)}, renda mensal estimada ${fcur(t.rendaMes)}.\n${lines}`;
  };

  positions = load();
  renderAll();
  loadFundMap();
}());

// ── Steppers numéricos (seta ↑↓ do teclado + botões ▲▼) ──────────────────────
// Aplica em todo input numérico (inputmode decimal/numeric) do site, incluindo
// os gerados dinamicamente (ex.: tabela da Carteira). O passo é derivado das
// casas decimais já exibidas no campo (ex.: "8,17" → passo 0,01; "15%" → passo 1).
(function setupNumericSteppers() {
  const SELECTOR = 'input[inputmode="decimal"], input[inputmode="numeric"]';

  function decimalsOf(numStr) {
    const m = String(numStr || "").match(/[.,](\d{1,4})(?:\D*)$/);
    return m ? m[1].length : 0;
  }

  function step(input, dir) {
    const raw = input.value || input.placeholder || "0";
    const m = raw.match(/^(\D*)([\d.,]+)(\D*)$/);
    if (!m) return;
    const [, prefix, numStr, suffix] = m;
    const decimals = decimalsOf(numStr);
    const current = input.value ? (parseNumber(input.value) || 0) : 0;
    const unit = decimals > 0 ? 1 / Math.pow(10, decimals) : 1;
    let next = current + dir * unit;
    if (next < 0) next = 0;
    const nextStr = next.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    input.value = prefix + nextStr + suffix;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Setas do teclado via delegação — funciona também em inputs criados depois
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const input = e.target.closest && e.target.closest(SELECTOR);
    if (!input) return;
    e.preventDefault();
    step(input, e.key === "ArrowUp" ? 1 : -1);
  });

  // Roda do mouse: ajusta o valor só quando o input está focado (evita rolagem acidental)
  document.addEventListener("wheel", (e) => {
    const input = e.target.closest && e.target.closest(SELECTOR);
    if (!input || document.activeElement !== input) return;
    e.preventDefault();
    step(input, e.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  // Botões visuais ▲▼ ao lado de cada input
  function wireButtons(input) {
    if (input.dataset.stepperWrapped || input.closest(".num-stepper-wrap")) return;
    input.dataset.stepperWrapped = "1";
    const wrap = document.createElement("span");
    wrap.className = "num-stepper-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const stepper = document.createElement("span");
    stepper.className = "num-stepper";
    stepper.innerHTML =
      '<button type="button" class="num-step-btn num-step-up" tabindex="-1" aria-label="Aumentar valor">▲</button>' +
      '<button type="button" class="num-step-btn num-step-down" tabindex="-1" aria-label="Diminuir valor">▼</button>';
    wrap.appendChild(stepper);
    stepper.querySelector(".num-step-up").addEventListener("click", () => { input.focus(); step(input, 1); });
    stepper.querySelector(".num-step-down").addEventListener("click", () => { input.focus(); step(input, -1); });
  }

  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches && node.matches(SELECTOR)) wireButtons(node);
    if (node.querySelectorAll) node.querySelectorAll(SELECTOR).forEach(wireButtons);
  }

  scan(document.body);
  new MutationObserver((mutations) => {
    mutations.forEach((m) => m.addedNodes.forEach(scan));
  }).observe(document.body, { childList: true, subtree: true });
}());

// ── Página dedicada: Raio-X IA (ações + FIIs) ─────────────────────────────────
(function setupRaioXPage() {
  const root = document.querySelector("#raioxPage");
  if (!root) return;

  const input = document.querySelector("#raioxSearchInput");
  const dropdown = document.querySelector("#raioxDropdown");
  const hint = document.querySelector("#raioxHint");
  const snapshot = document.querySelector("#raioxSnapshot");
  const genBtn = document.querySelector("#raioxGenBtn");
  const output = document.querySelector("#raioxOutput");
  const typeBtns = [...document.querySelectorAll(".raiox-type-btn")];

  let tipo = "acao";
  const lists = { acao: [], fii: [] };
  const loaded = { acao: false, fii: false };
  let selected = null;
  let focused = -1;

  const dyOf = (r) => r["Div.Yield"] ?? r["Div. Yield"] ?? r["Dividend Yield"] ?? r["DY"] ?? r["Yield"] ?? null;
  const n2 = (v) => (v != null && Number.isFinite(v)) ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

  async function loadList(t) {
    if (loaded[t]) return;
    const url = t === "fii" ? "/invest/api/fundamentus/fiis" : "/invest/api/fundamentus/acoes";
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) { lists[t] = json.data; loaded[t] = true; }
    } catch { /* mantém */ }
    updateHint();
  }

  function updateHint() {
    if (selected) return;
    const n = lists[tipo].length;
    hint.textContent = n ? `${n} ${tipo === "fii" ? "FIIs" : "ações"} — comece a digitar` : "Carregando lista do Fundamentus…";
  }

  function match(q) {
    if (!q) return [];
    const u = q.toUpperCase();
    return lists[tipo].filter((r) => String(r["Papel"] || "").toUpperCase().startsWith(u)).slice(0, 12);
  }

  function renderDrop(items) {
    if (!items.length) {
      dropdown.innerHTML = `<div class="ticker-no-results">Nenhum resultado</div>`;
      dropdown.hidden = false; focused = -1; return;
    }
    dropdown.innerHTML = items.map((r, i) => {
      const dy = dyOf(r);
      const dyText = (dy && Number.isFinite(dy)) ? `DY ${formatPercent(dy, 1)}` : "";
      const cot = r["Cotação"] ?? null;
      return `<div class="ticker-option" role="option" data-idx="${i}" tabindex="-1">
        <span class="ticker-option-code">${r["Papel"]}</span>
        <span class="ticker-option-detail">${dyText}</span>
        <span class="ticker-option-price">${cot ? formatCurrency(cot) : ""}</span>
      </div>`;
    }).join("");
    dropdown.hidden = false; focused = -1;
    dropdown.querySelectorAll(".ticker-option").forEach((opt) => {
      opt.addEventListener("mousedown", (e) => { e.preventDefault(); choose(items[Number(opt.dataset.idx)]); });
    });
  }

  function moveFocus(d) {
    const o = dropdown.querySelectorAll(".ticker-option");
    if (!o.length) return;
    focused = Math.max(0, Math.min(o.length - 1, focused + d));
    o.forEach((x, i) => x.classList.toggle("focused", i === focused));
    o[focused].scrollIntoView({ block: "nearest" });
  }

  function renderSnapshot(row, t) {
    const chips = [];
    const cot = row["Cotação"]; if (cot) chips.push(["Cotação", formatCurrency(cot)]);
    const dy = dyOf(row); if (dy != null) chips.push(["DY", formatPercent(dy, 2)]);
    const pvp = row["P/VP"]; if (pvp != null) chips.push(["P/VP", n2(pvp)]);
    if (t === "fii") {
      const seg = row["Segmento"] || row["Setor"]; if (seg) chips.push(["Segmento", seg]);
    } else {
      const pl = row["P/L"]; if (pl != null) chips.push(["P/L", n2(pl)]);
      const roe = row["ROE"]; if (roe != null) chips.push(["ROE", formatPercent(roe, 1)]);
    }
    const ticker = row["Papel"];
    snapshot.innerHTML = chips.map(([k, v]) => `<span class="raiox-chip"><span>${k}</span><strong>${v}</strong></span>`).join("")
      + (ticker ? investidor10Link(ticker, t) : "");
    snapshot.hidden = chips.length === 0;
  }

  function choose(row) {
    selected = { row, tipo };
    input.value = row["Papel"];
    dropdown.hidden = true;
    renderSnapshot(row, tipo);
    genBtn.disabled = false;
    hint.innerHTML = `<span class="ticker-filled-tag">${row["Papel"]} selecionado</span>`;
    output.hidden = true; output.innerHTML = "";
  }

  function buildPayload() {
    if (!selected) return null;
    const { row, tipo: t } = selected;
    const ticker = row["Papel"];
    const cot = row["Cotação"] ?? null;
    const dy = dyOf(row);

    if (t === "fii") {
      return {
        tipo: "fii", ticker,
        contexto: [
          `Cotação: ${cot ? formatCurrency(cot) : "—"}`,
          `Dividend Yield: ${dy != null ? formatPercent(dy, 2) : "—"}`,
          `P/VP: ${n2(row["P/VP"])}`,
          `FFO Yield: ${row["FFO Yield"] ?? row["FFO"] ?? "—"}`,
          `Segmento: ${row["Segmento"] || row["Setor"] || "—"}`,
          `Vacância Média: ${row["Vacância Média"] ?? row["Vacância"] ?? "—"}`,
          `Cap Rate: ${row["Cap Rate"] ?? "—"}`,
          `Liquidez: ${row["Liquidez"] ?? row["Liq.2meses"] ?? "—"}`,
        ].join("\n"),
      };
    }
    const pl = row["P/L"], pvp = row["P/VP"];
    const lpa = (cot && pl && pl > 0) ? cot / pl : null;
    const vpa = (cot && pvp && pvp > 0) ? cot / pvp : null;
    const dpa = (cot && dy) ? cot * dy : null;
    const bazin = dpa ? dpa / 0.06 : null;
    const graham = (lpa && vpa && lpa > 0 && vpa > 0) ? Math.sqrt(22.5 * lpa * vpa) : null;
    return {
      tipo: "acao", ticker,
      contexto: [
        `Cotação: ${cot ? formatCurrency(cot) : "—"}`,
        `P/L: ${n2(pl)} | P/VP: ${n2(pvp)} | DY: ${dy != null ? formatPercent(dy, 2) : "—"}`,
        `ROE: ${row["ROE"] != null ? formatPercent(row["ROE"], 2) : "—"} | ROIC: ${row["ROIC"] != null ? formatPercent(row["ROIC"], 2) : "—"}`,
        `Mrg. Líq.: ${row["Mrg. Líq."] != null ? formatPercent(row["Mrg. Líq."], 2) : "—"} | Dív.Líq/Patrim.: ${n2(row["Dív.Líq/ Patrim."])}`,
        `Cresc. Rec. 5a: ${row["Cresc. Rec.5a"] != null ? formatPercent(row["Cresc. Rec.5a"], 2) : "—"}`,
        `LPA estimado: ${n2(lpa)} | VPA estimado: ${n2(vpa)} | DPA estimado: ${dpa ? formatCurrency(dpa) : "—"}`,
        `Preço Bazin (DY 6%): ${bazin ? formatCurrency(bazin) : "—"} → ${(cot && bazin && cot <= bazin) ? "BARATO" : "caro"}`,
        `Preço Graham: ${graham ? formatCurrency(graham) : "—"} → ${(cot && graham && cot <= graham) ? "BARATO" : "caro"}`,
      ].join("\n"),
    };
  }

  input.addEventListener("input", () => {
    const items = match(input.value);
    input.value.trim() ? renderDrop(items) : (dropdown.hidden = true);
  });
  input.addEventListener("keydown", (e) => {
    if (dropdown.hidden) return;
    const items = [...dropdown.querySelectorAll(".ticker-option")];
    if (e.key === "ArrowDown") { e.preventDefault(); moveFocus(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveFocus(-1); }
    else if (e.key === "Enter" && focused >= 0) { e.preventDefault(); items[focused].dispatchEvent(new MouseEvent("mousedown")); }
    else if (e.key === "Escape") { dropdown.hidden = true; }
  });
  input.addEventListener("blur", () => setTimeout(() => { dropdown.hidden = true; }, 200));

  typeBtns.forEach((b) => b.addEventListener("click", () => {
    typeBtns.forEach((x) => { x.classList.toggle("active", x === b); x.setAttribute("aria-selected", x === b ? "true" : "false"); });
    tipo = b.dataset.tipo;
    selected = null; genBtn.disabled = true; snapshot.hidden = true; snapshot.innerHTML = "";
    input.value = ""; dropdown.hidden = true; output.hidden = true; output.innerHTML = "";
    input.placeholder = tipo === "fii" ? "Digite o ticker do FII (ex: HGLG11)…" : "Digite o ticker da ação (ex: WEGE3)…";
    loadList(tipo);
    updateHint();
  }));

  genBtn.addEventListener("click", (e) => { gerarRaioX(buildPayload(), output, e.currentTarget); });

  loadList("acao");
  loadList("fii");

  // Pré-preenche via ?ticker= e ?tipo=
  const params = new URLSearchParams(location.search);
  const pTicker = params.get("ticker");
  if (params.get("tipo") === "fii") document.querySelector('.raiox-type-btn[data-tipo="fii"]')?.click();
  if (pTicker) {
    input.value = pTicker.toUpperCase();
    const poll = setInterval(() => {
      if (loaded[tipo]) {
        clearInterval(poll);
        const row = lists[tipo].find((r) => String(r["Papel"] || "").toUpperCase() === pTicker.toUpperCase());
        if (row) choose(row);
      }
    }, 200);
    setTimeout(() => clearInterval(poll), 6000);
  }
}());

// ── Modo embutido (iframe dentro do hub Ações/FIIs) ───────────────────────────
// Quando a página é carregada com ?embed=1 dentro do hub, esconde o "chrome"
// (header/sidebar/breadcrumb) e informa a altura ao hub pai para auto-redimensionar.
(function setupEmbedMode() {
  const params = new URLSearchParams(location.search);
  if (params.get("embed") !== "1") return;
  document.body.classList.add("embed-mode");

  const frameName = location.pathname.split("/").pop();
  let lastH = 0;
  function postHeight() {
    // Só body.scrollHeight: documentElement.scrollHeight inclui a altura atual do
    // viewport do iframe quando o conteúdo é mais curto que ela — como o pai ajusta
    // a altura do iframe a partir desse valor, isso criava um loop de crescimento
    // infinito (o viewport inflado virava a "altura do conteúdo" do próximo ciclo).
    const h = document.body.scrollHeight;
    if (Math.abs(h - lastH) < 4) return;
    lastH = h;
    try { parent.postMessage({ type: "siEmbedHeight", h, name: frameName }, "*"); } catch (e) {}
  }
  window.addEventListener("load", postHeight);
  document.addEventListener("DOMContentLoaded", postHeight);
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(postHeight).observe(document.body);
  }
  // Conteúdo assíncrono (screening, valuation ao vivo, raio-x) pode crescer depois.
  setInterval(postHeight, 1000);

  // Navegação guiada: links internos para outros módulos viram troca de aba no hub.
  const moduleMap = {
    "analise-avancada.html": "analise",
    "valuation-acoes.html": "valuation",
    "stock-screening.html": "screening",
    "valuation-fii.html": "valuation",
    "fii-screening.html": "screening",
    "analise-fii.html": "analise",
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    const file = href.split("?")[0].split("#")[0];
    if (!(file in moduleMap)) return;
    const ticker = (href.split("ticker=")[1] || "").split("&")[0];
    e.preventDefault();
    try {
      parent.postMessage({ type: "siNavigate", to: moduleMap[file], ticker: decodeURIComponent(ticker || "") }, "*");
    } catch (err) { location.href = href; }
  });
}());

// ── Ajuda contextual nos campos do Valuation (ícone ⓘ + selos automático/subjetivo) ──
// Enriquece cada campo do formulário com: ícone de ajuda em linguagem simples,
// selo "🟢 automático" ou "🟡 ajuste recomendado" e, nos subjetivos, "Por que este valor?".
const FIELD_GUIDES = {
  // ---- Ações ----
  acoesCotacao: { auto: true, title: "Cotação atual", simple: "É o preço pelo qual a ação está sendo negociada agora na bolsa.", importa: "É a referência para saber se o preço justo calculado está acima (barata) ou abaixo (cara) do mercado.", onde: "Fundamentus, Status Invest, Investidor10 ou seu home broker." },
  acoesLpa: { auto: true, title: "Lucro por Ação (LPA)", simple: "Mostra quanto lucro a empresa gerou para cada ação nos últimos 12 meses.", importa: "Quanto maior o lucro por ação, maior tende a ser a capacidade da empresa de gerar valor ao acionista.", onde: "Fundamentus, Status Invest, Investidor10 ou os relatórios da empresa." },
  acoesVpa: { auto: true, title: "Valor Patrimonial por Ação (VPA)", simple: "É quanto do patrimônio (bens menos dívidas) da empresa cabe a cada ação.", importa: "Serve de base no método de Graham e ajuda a perceber se você está pagando muito acima do patrimônio.", onde: "Fundamentus, Status Invest ou o balanço da empresa." },
  acoesDpa: { auto: true, title: "Dividendo por Ação (DPA)", simple: "É o total de proventos (dividendos + JCP) pagos por cada ação nos últimos 12 meses.", importa: "É a base do método de Bazin: quanto a ação paga de renda define o preço-teto que vale a pena pagar.", onde: "Fundamentus, Status Invest, Investidor10 ou os comunicados de proventos." },
  acoesCrescLucro: { auto: false, title: "Crescimento esperado do lucro", simple: "É quanto você espera que o lucro da empresa cresça por ano, em média.", importa: "Empresas que crescem mais podem justificar um preço maior — é o que o método PEG mede.", onde: "Histórico no Status Invest/Investidor10 ou projeções de analistas (consenso).", valueWhy: "Estimativa inicial baseada no histórico recente da empresa. Não é uma previsão garantida — ajuste conforme sua própria expectativa." },
  acoesFcl: { auto: true, title: "Fluxo de Caixa Livre por Ação (FCL)", simple: "É o dinheiro que sobra no caixa, por ação, depois de pagar custos e investimentos.", importa: "É a base do método de Fluxo de Caixa Descontado (DCF), o mais completo dos quatro.", onde: "Status Invest (fluxo de caixa) ou os relatórios financeiros (DFC) da empresa." },
  acoesWacc: { auto: false, title: "WACC — Taxa de desconto", simple: "É a taxa usada para trazer o dinheiro do futuro para o valor de hoje (exigência de retorno).", importa: "Quanto maior a taxa, menor o preço justo no DCF — reflete o risco de investir na empresa.", onde: "Calculada a partir do custo de capital; para ações grandes use 10% a 14%.", valueWhy: "Usamos 12% por ser uma taxa frequentemente aplicada a empresas brasileiras de grande porte. Altere se tiver uma estimativa mais adequada." },
  acoesCrescFcl: { auto: false, title: "Crescimento do Fluxo de Caixa (FCL)", simple: "É quanto você espera que o caixa livre da empresa cresça por ano no período projetado.", importa: "Define o quanto os fluxos futuros aumentam no DCF — influencia bastante o preço justo.", onde: "Histórico de FCL no Status Invest ou sua própria projeção.", valueWhy: "Valor inicial baseado em referências de mercado. Investidores mais conservadores costumam usar números menores." },
  acoesCrescTerminal: { auto: false, title: "Crescimento na perpetuidade", simple: "É o crescimento que a empresa terá 'para sempre' depois do período projetado.", importa: "Costuma ser baixo e próximo da inflação de longo prazo; valores altos inflam o preço justo.", onde: "Referência comum: IPCA de longo prazo (em torno de 3% a 4%).", valueWhy: "Usamos 3% por ser próximo da inflação de longo prazo esperada no Brasil. É uma premissa conservadora e padrão." },
  acoesPrazoDcf: { auto: false, title: "Prazo de projeção do DCF", simple: "É por quantos anos você projeta o caixa da empresa de forma detalhada.", importa: "Períodos maiores capturam mais crescimento, mas aumentam a incerteza da estimativa.", onde: "Convenção de mercado: entre 5 e 10 anos.", valueWhy: "10 anos é um horizonte padrão para empresas consolidadas. Use 5 anos se preferir uma projeção mais curta e segura." },
  acoesDyMinBazin: { auto: false, title: "DY mínimo exigido (Bazin)", simple: "É o dividend yield mínimo que você exige para se interessar pela ação.", importa: "Define o preço-teto de Bazin: quanto maior a exigência, menor o preço justo de compra.", onde: "Critério pessoal; Décio Bazin usava 6% ao ano como referência.", valueWhy: "6% é a referência clássica de Bazin para boas pagadoras de dividendos. Suba a exigência se quiser mais margem." },
  acoesMargemSeg: { auto: false, title: "Margem de segurança", simple: "É um desconto que você aplica sobre o preço justo antes de comprar, por precaução.", importa: "Protege contra erros nas premissas: só compra com um 'colchão' abaixo do valor calculado.", onde: "Critério pessoal; Graham recomendava em torno de 33%.", valueWhy: "30% é um colchão prudente e próximo do recomendado por Graham. Aumente para ser mais conservador." },
  // ---- FIIs ----
  fiiPrice: { auto: true, title: "Preço atual da cota", simple: "É quanto custa hoje uma cota do fundo imobiliário na bolsa.", importa: "É a referência para comparar com o preço-teto e saber se o FII está barato ou caro.", onde: "Fundamentus, Status Invest ou seu home broker." },
  fiiDividend: { auto: true, title: "Dividendo mensal", simple: "É quanto o fundo paga de rendimento por cota a cada mês.", importa: "É a base do cálculo: define a renda que você recebe e o preço-teto do fundo.", onde: "Fundamentus, Status Invest ou os comunicados mensais do fundo." },
  fiiGrowth: { auto: false, title: "Crescimento do dividendo", simple: "É quanto você espera que o rendimento por cota aumente por ano.", importa: "Campo informativo: ajuda a registrar sua expectativa de aumento da renda.", onde: "Histórico de rendimentos no Status Invest/Funds Explorer.", valueWhy: "Deixamos 0% por padrão, uma postura conservadora. Ajuste se espera reajustes de aluguéis ou novos contratos." },
  fiiNtnbReal: { auto: true, title: "Taxa NTN-B real", simple: "É o juro real (acima da inflação) que o Tesouro IPCA+ paga hoje — o 'retorno sem risco'.", importa: "É a base de comparação: um FII precisa pagar mais que isso para compensar o risco.", onde: "Tesouro Direto ou sites como Status Invest (Tesouro IPCA+)." },
  fiiIpca: { auto: true, title: "Inflação esperada (IPCA)", simple: "É quanto se espera que os preços subam no ano (inflação).", importa: "Soma-se ao juro real para chegar ao retorno total exigido de referência.", onde: "Relatório Focus do Banco Central (carregado automaticamente)." },
  fiiIrNtnb: { auto: false, title: "IR sobre a NTN-B", simple: "É o imposto de renda que incide sobre o rendimento do Tesouro IPCA+.", importa: "Deixa a comparação justa: o FII é isento, então comparamos com a NTN-B já líquida de IR.", onde: "Tabela regressiva: 22,5% a 15% conforme o prazo.", valueWhy: "Usamos 15%, a menor alíquota da tabela regressiva (aplicações acima de 2 anos), porque a comparação com um FII é de longo prazo. Assim descontamos o IR da NTN-B e a disputa fica justa, já que o FII é isento para pessoa física." },
  fiiDesiredPremium: { auto: false, title: "Prêmio desejado", simple: "É quanto de retorno a mais, acima do Tesouro, você exige para comprar o FII.", importa: "Quanto maior o prêmio exigido, menor o preço-teto — você fica mais seletivo.", onde: "Critério pessoal, conforme seu apetite a risco.", valueWhy: "É a sua exigência de retorno, não um dado do fundo — por isso vale para qualquer FII. Usamos 2 pontos percentuais acima da NTN-B líquida como prêmio moderado pelo risco extra (vacância, gestão, mercado). Quanto maior o prêmio, menor o preço-teto — você fica mais seletivo." },
  fiiSafetyMargin: { auto: false, title: "Margem de segurança", simple: "É um desconto aplicado sobre o preço-teto antes de comprar, por precaução.", importa: "Cria um 'colchão' contra erros de premissa: você só compra abaixo do teto.", onde: "Critério pessoal.", valueWhy: "Começa em 0%; aumente se quiser exigir um desconto extra sobre o preço justo." },
  fiiTax: { auto: false, title: "Tributação dos rendimentos", simple: "É o imposto sobre os rendimentos que o FII te paga.", importa: "Hoje pessoas físicas são isentas (0%) na maioria dos casos — por isso o padrão é 0%.", onde: "Regra atual da Receita para FIIs negociados em bolsa.", valueWhy: "0% reflete a isenção atual para pessoa física. Só altere se houver mudança na legislação." },
};

(function setupFieldGuides() {
  const ids = Object.keys(FIELD_GUIDES).filter((id) => document.getElementById(id));
  if (!ids.length) return;

  // Popover compartilhado
  let pop = document.getElementById("fieldGuidePop");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "fieldGuidePop";
    pop.className = "field-pop";
    pop.hidden = true;
    document.body.appendChild(pop);
  }
  let popAnchor = null;
  let pinned = false;
  let hideTimer = null;
  function closePop() { pop.hidden = true; popAnchor = null; pinned = false; }
  function scheduleHide() { if (pinned) return; clearTimeout(hideTimer); hideTimer = setTimeout(closePop, 140); }
  function cancelHide() { clearTimeout(hideTimer); }
  function openPop(anchor, html) {
    cancelHide();
    pop.innerHTML = html;
    pop.hidden = false;
    popAnchor = anchor;
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const left = Math.max(12, Math.min(r.left, window.innerWidth - pw - 12));
    let top = r.bottom + 8;                        // abaixo do ícone
    if (top + ph > window.innerHeight - 12) {      // sem espaço embaixo → tenta acima
      const above = r.top - ph - 8;
      if (above >= 12) top = above;
    }
    top = Math.max(12, Math.min(top, window.innerHeight - ph - 12)); // garante dentro da viewport
    pop.style.top = top + "px";
    pop.style.left = left + "px";
  }
  pop.addEventListener("mouseenter", cancelHide);
  pop.addEventListener("mouseleave", scheduleHide);
  document.addEventListener("click", (e) => {
    if (pop.hidden) return;
    if (e.target.closest("#fieldGuidePop") || e.target.closest(".field-help") || e.target.closest(".field-why")) return;
    closePop();
  });
  window.addEventListener("resize", closePop);
  window.addEventListener("scroll", () => { if (!pop.hidden) closePop(); }, true);

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function helpHtml(g) {
    return `<div class="field-pop-head">${esc(g.title)}</div>
      <p class="field-pop-line"><strong>O que é:</strong> ${esc(g.simple)}</p>
      <p class="field-pop-line"><strong>Por que importa:</strong> ${esc(g.importa)}</p>
      <p class="field-pop-line"><strong>Onde encontrar:</strong> ${esc(g.onde)}</p>`;
  }
  function whyHtml(g) {
    return `<div class="field-pop-head">Por que este valor?</div>
      <p class="field-pop-line">${esc(g.valueWhy)}</p>`;
  }

  ids.forEach((id) => {
    const input = document.getElementById(id);
    const card = input.closest(".input-card");
    if (!card) return;
    const label = card.querySelector("label");
    if (!label || label.dataset.guided) return;
    label.dataset.guided = "1";
    const g = FIELD_GUIDES[id];

    // Ícone de ajuda ⓘ no label
    const help = document.createElement("button");
    help.type = "button";
    help.className = "field-help";
    help.setAttribute("aria-label", "Ajuda sobre " + g.title);
    help.innerHTML = "<span aria-hidden='true'>i</span>";
    const openHelp = () => openPop(help, helpHtml(g));
    help.addEventListener("mouseenter", openHelp);
    help.addEventListener("focus", openHelp);
    help.addEventListener("mouseleave", scheduleHide);
    help.addEventListener("blur", scheduleHide);
    help.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (pinned && popAnchor === help) { closePop(); }
      else { openPop(help, helpHtml(g)); pinned = true; }
    });
    label.appendChild(help);

    // Selo automático / subjetivo
    const badge = document.createElement("span");
    badge.className = "data-badge " + (g.auto ? "is-auto" : "is-subj");
    badge.dataset.role = g.auto ? "auto" : "subj";
    badge.textContent = g.auto ? "🟢 Preenchido automaticamente" : "🟡 Ajuste recomendado";
    badge.title = g.auto
      ? "Este valor foi obtido automaticamente a partir dos dados financeiros mais recentes."
      : "Preenchemos um valor inicial com base em referências de mercado, mas você pode usar premissas diferentes.";
    label.insertAdjacentElement("afterend", badge);

    // Campos subjetivos: link "Por que este valor?"
    if (!g.auto && g.valueWhy) {
      const why = document.createElement("button");
      why.type = "button";
      why.className = "field-why";
      why.textContent = "Por que este valor?";
      const openWhy = () => openPop(why, whyHtml(g));
      why.addEventListener("mouseenter", openWhy);
      why.addEventListener("focus", openWhy);
      why.addEventListener("mouseleave", scheduleHide);
      why.addEventListener("blur", scheduleHide);
      why.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (pinned && popAnchor === why) { closePop(); }
        else { openPop(why, whyHtml(g)); pinned = true; }
      });
      const helper = card.querySelector(".helper-text");
      if (helper) helper.insertAdjacentElement("afterend", why);
      else card.appendChild(why);
    }

    // Campos automáticos: se o usuário editar, o selo passa a indicar edição manual.
    if (g.auto) {
      input.addEventListener("input", function onFirstEdit(ev) {
        if (badge.dataset.role === "auto" && ev.isTrusted) {
          badge.className = "data-badge is-edited";
          badge.textContent = "✎ Editado por você";
          badge.dataset.role = "edited";
        }
      });
    }
  });
}());

// ── Hub Ações / FIIs (abas horizontais + passo a passo) ───────────────────────
(function setupHub() {
  const hub = document.querySelector(".hub");
  if (!hub) return;
  const steps = [...hub.querySelectorAll(".wiz-step")];
  const frames = [...hub.querySelectorAll(".hub-frame")];

  function frameMatches(frame, name) {
    const src = frame.getAttribute("data-src") || frame.src || "";
    return name && src.indexOf(name) > -1;
  }

  function loadFrame(frame, extraTicker) {
    let base = frame.getAttribute("data-src");
    if (!base) return;
    if (extraTicker) {
      base += (base.indexOf("?") > -1 ? "&" : "?") + "ticker=" + encodeURIComponent(extraTicker);
    }
    if (frame.getAttribute("src") !== base) frame.setAttribute("src", base);
  }

  function activate(i, ticker) {
    if (i < 0 || i >= steps.length) i = 0;
    steps.forEach((s, j) => {
      s.classList.toggle("active", j === i);
      s.classList.toggle("done", j < i);
      s.setAttribute("aria-selected", j === i ? "true" : "false");
    });
    frames.forEach((f, j) => {
      f.hidden = j !== i;
      if (j === i) loadFrame(f, ticker);
    });
    if (steps[i].dataset.key) {
      try { history.replaceState(null, "", "#" + steps[i].dataset.key); } catch (e) {}
    }
  }

  steps.forEach((s, i) => s.addEventListener("click", () => activate(i)));

  // Auto-redimensiona iframes conforme a altura do conteúdo embutido
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || typeof d !== "object") return;
    if (d.type === "siEmbedHeight") {
      const f = frames.find((fr) => frameMatches(fr, d.name));
      if (f && f.dataset.autosize !== "false" && d.h) f.style.height = (d.h + 16) + "px";
    } else if (d.type === "siNavigate") {
      const idx = steps.findIndex((s) => s.dataset.key === d.to);
      if (idx > -1) activate(idx, d.ticker || "");
    }
  });

  const startKey = location.hash.replace("#", "");
  const startIdx = steps.findIndex((s) => s.dataset.key === startKey);
  activate(startIdx > -1 ? startIdx : 0);
}());
