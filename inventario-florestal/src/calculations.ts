// Funções dendrométricas e estatísticas para o Inventário Florestal ESALQ/USP — CMQ
import {
  Plot,
  Tree,
  PlotStatistics,
  SpeciesPlotSummary,
  InventorySummary,
} from './types';

export const PI = Math.PI;

/**
 * Calcula o Diâmetro à Altura do Peito (DAP) a partir da CAP.
 * DAP (cm) = CAP (cm) / π
 */
export function calcularDAP(capCm: number | null | undefined): number | null {
  if (capCm === null || capCm === undefined || isNaN(capCm) || capCm <= 0) {
    return null;
  }
  return capCm / PI;
}

/**
 * Calcula a área transversal individual g em metros quadrados.
 * g (m²) = π × DAP² / 40.000 = CAP² / (40.000 × π)
 * Utiliza o cálculo direto de alta precisão sem arredondamento intermediário.
 */
export function calcularAreaTransversal(capCm: number | null | undefined): number | null {
  if (capCm === null || capCm === undefined || isNaN(capCm) || capCm <= 0) {
    return null;
  }
  return Math.pow(capCm, 2) / (40000 * PI);
}

/**
 * Calcula a área de parcela circular em m².
 * Se informado raio: Área = π × raio²
 * Se informado diâmetro: Área = π × diâmetro² / 4
 */
export function calcularAreaCircular(tipo: 'raio' | 'diametro', valor: number): number {
  if (isNaN(valor) || valor <= 0) return 0;
  if (tipo === 'raio') {
    return PI * Math.pow(valor, 2);
  } else {
    return (PI * Math.pow(valor, 2)) / 4;
  }
}

/**
 * Calcula a área de parcela retangular em m².
 * Área = Comprimento × Largura
 */
export function calcularAreaRetangular(comprimento: number, largura: number): number {
  if (isNaN(comprimento) || comprimento <= 0 || isNaN(largura) || largura <= 0) {
    return 0;
  }
  return comprimento * largura;
}

/**
 * Converte m² para hectares (1 ha = 10.000 m²).
 */
export function converterM2ParaHectares(areaM2: number): number {
  if (isNaN(areaM2) || areaM2 <= 0) return 0;
  return areaM2 / 10000;
}

/**
 * Valida os dados de uma medição de árvore.
 */
export function validarMedicaoArvore(tree: Partial<Tree>): {
  status: 'valida' | 'incompleta' | 'invalida';
  motivo?: string;
  cap: number | null;
  dap: number | null;
  g: number | null;
} {
  const cap = tree.cap;
  if (cap === null || cap === undefined || cap === ('' as unknown as number)) {
    return {
      status: 'incompleta',
      motivo: 'CAP não informado (árvore registrada para identificação posterior)',
      cap: null,
      dap: null,
      g: null,
    };
  }

  const numCap = Number(cap);
  if (isNaN(numCap)) {
    return {
      status: 'invalida',
      motivo: 'Valor de CAP não é um número válido',
      cap: null,
      dap: null,
      g: null,
    };
  }

  if (numCap <= 0) {
    return {
      status: 'invalida',
      motivo: 'CAP deve ser estritamente maior que zero',
      cap: null,
      dap: null,
      g: null,
    };
  }

  // Medição válida
  const dap = calcularDAP(numCap);
  const g = calcularAreaTransversal(numCap);

  return {
    status: 'valida',
    cap: numCap,
    dap,
    g,
  };
}

/**
 * Calcula a mediana de um array de números ordenados ou não.
 */
export function calcularMediana(valores: number[]): number | null {
  const n = valores.length;
  if (n === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  if (n % 2 !== 0) {
    return ordenados[Math.floor(n / 2)];
  } else {
    const mid = n / 2;
    return (ordenados[mid - 1] + ordenados[mid]) / 2;
  }
}

/**
 * Calcula estatísticas descritivas completas para uma parcela.
 * Segue estritamente as regras:
 * - n = 0: média, mediana, variância e desvio padrão não calculáveis.
 * - n = 1: média e mediana válidos; variância e desvio padrão amostrais indisponíveis (graus de liberdade n - 1 = 0).
 * - n >= 2: cálculo completo com variância amostral dividida por (n - 1).
 */
export function calcularEstatisticasParcela(plot: Plot, trees: Tree[]): PlotStatistics {
  const totalArvores = trees.length;
  const arvoresValidasList = trees.filter((t) => t.status === 'valida' && t.dap !== null && t.g !== null);
  const n = arvoresValidasList.length;
  const arvoresIncompletas = totalArvores - n;

  // Espécies únicas identificadas
  const especiesSet = new Set<string>();
  trees.forEach((t) => {
    const esp = t.especie?.trim();
    if (esp) especiesSet.add(esp);
  });
  const totalEspecies = especiesSet.size;

  const areaM2 = plot.areaM2 || 0;
  const areaHa = plot.areaHa || converterM2ParaHectares(areaM2);

  if (n === 0) {
    return {
      totalArvores,
      arvoresValidas: 0,
      arvoresIncompletas,
      totalEspecies,
      capMedio: null,
      dapMedio: null,
      dapMediano: null,
      dapVariancia: null,
      dapDesvioPadrao: null,
      dapMinimo: null,
      dapMaximo: null,
      areaBasalTotal: 0,
      areaBasalPorHectare: 0,
      areaM2,
      areaHa,
    };
  }

  // Valores não arredondados
  const caps = arvoresValidasList.map((t) => t.cap as number);
  const daps = arvoresValidasList.map((t) => t.dap as number);
  const gs = arvoresValidasList.map((t) => t.g as number);

  const somaCap = caps.reduce((acc, v) => acc + v, 0);
  const somaDap = daps.reduce((acc, v) => acc + v, 0);
  const capMedio = somaCap / n;
  const dapMedio = somaDap / n;

  const dapMediano = calcularMediana(daps);

  let dapVariancia: number | null = null;
  let dapDesvioPadrao: number | null = null;

  if (n >= 2) {
    // Variância amostral s² = Σ(DAP_i - média)² / (n - 1)
    const somaQuadradosDesvios = daps.reduce((acc, v) => acc + Math.pow(v - dapMedio, 2), 0);
    dapVariancia = somaQuadradosDesvios / (n - 1);
    dapDesvioPadrao = Math.sqrt(dapVariancia);
  }

  const dapMinimo = Math.min(...daps);
  const dapMaximo = Math.max(...daps);

  // G_parcela = Σ g_i
  const areaBasalTotal = gs.reduce((acc, v) => acc + v, 0);

  // G_ha = G_parcela / A_ha
  const areaBasalPorHectare = areaHa > 0 ? areaBasalTotal / areaHa : null;

  return {
    totalArvores,
    arvoresValidas: n,
    arvoresIncompletas,
    totalEspecies,
    capMedio,
    dapMedio,
    dapMediano,
    dapVariancia,
    dapDesvioPadrao,
    dapMinimo,
    dapMaximo,
    areaBasalTotal,
    areaBasalPorHectare,
    areaM2,
    areaHa,
  };
}

/**
 * Calcula o resumo por espécie para uma parcela.
 * Importante: A área basal por hectare de cada espécie utiliza a área total da parcela como denominador.
 */
export function calcularResumoEspecies(plot: Plot, trees: Tree[]): SpeciesPlotSummary[] {
  const arvoresValidas = trees.filter((t) => t.status === 'valida' && t.dap !== null && t.g !== null);
  const areaHa = plot.areaHa || converterM2ParaHectares(plot.areaM2 || 0);

  // Agrupar por espécie (normalizando espaços mas preservando nome legível)
  const grupos: { [especieKey: string]: { nomeOriginal: string; daps: number[]; gs: number[] } } = {};

  arvoresValidas.forEach((t) => {
    const nome = t.especie && t.especie.trim() !== '' ? t.especie.trim() : 'Não identificada';
    const key = nome.toLowerCase();
    if (!grupos[key]) {
      grupos[key] = { nomeOriginal: nome, daps: [], gs: [] };
    }
    grupos[key].daps.push(t.dap as number);
    grupos[key].gs.push(t.g as number);
  });

  const areaBasalTotalParcela = arvoresValidas.reduce((acc, t) => acc + (t.g as number), 0);

  const resumos: SpeciesPlotSummary[] = Object.keys(grupos).map((k) => {
    const g = grupos[k];
    const n = g.daps.length;
    const somaDap = g.daps.reduce((acc, v) => acc + v, 0);
    const dapMedio = somaDap / n;
    const dapMediano = calcularMediana(g.daps);

    let dapVariancia: number | null = null;
    let dapDesvioPadrao: number | null = null;
    if (n >= 2) {
      const somaQuadrados = g.daps.reduce((acc, v) => acc + Math.pow(v - dapMedio, 2), 0);
      dapVariancia = somaQuadrados / (n - 1);
      dapDesvioPadrao = Math.sqrt(dapVariancia);
    }

    const areaBasalTotal = g.gs.reduce((acc, v) => acc + v, 0);
    const areaBasalPorHectare = areaHa > 0 ? areaBasalTotal / areaHa : null;
    const proporcaoAreaBasal = areaBasalTotalParcela > 0 ? (areaBasalTotal / areaBasalTotalParcela) * 100 : 0;

    return {
      especie: g.nomeOriginal,
      arvoresValidas: n,
      dapMedio,
      dapMediano,
      dapVariancia,
      dapDesvioPadrao,
      areaBasalTotal,
      areaBasalPorHectare,
      proporcaoAreaBasal,
    };
  });

  // Ordenar decrescente por área basal total
  return resumos.sort((a, b) => b.areaBasalTotal - a.areaBasalTotal);
}

/**
 * Calcula a síntese geral de um inventário florestal.
 */
export function calcularSinteseInventario(
  plots: Plot[],
  treesByPlot: { [plotId: string]: Tree[] }
): InventorySummary {
  let totalArvores = 0;
  let totalArvoresValidas = 0;
  let areaTotalAmostradaM2 = 0;
  let somaAreasBasais = 0;
  const especiesGlobais = new Set<string>();
  const todosDapsValidos: number[] = [];

  const parcelasResumo: InventorySummary['parcelasResumo'] = [];
  const especieAcumulada: { [nomeKey: string]: { nomeOriginal: string; validas: number; gTotal: number } } = {};

  plots.forEach((p) => {
    const pTrees = treesByPlot[p.id] || [];
    const stats = calcularEstatisticasParcela(p, pTrees);

    totalArvores += stats.totalArvores;
    totalArvoresValidas += stats.arvoresValidas;
    areaTotalAmostradaM2 += p.areaM2 || 0;
    somaAreasBasais += stats.areaBasalTotal;

    pTrees.forEach((t) => {
      const esp = t.especie?.trim();
      if (esp) {
        especiesGlobais.add(esp);
        const k = esp.toLowerCase();
        if (!especieAcumulada[k]) {
          especieAcumulada[k] = { nomeOriginal: esp, validas: 0, gTotal: 0 };
        }
        if (t.status === 'valida' && t.g !== null) {
          especieAcumulada[k].validas += 1;
          especieAcumulada[k].gTotal += t.g;
          todosDapsValidos.push(t.dap as number);
        }
      } else if (t.status === 'valida' && t.dap !== null) {
        todosDapsValidos.push(t.dap as number);
      }
    });

    parcelasResumo.push({
      parcelaId: p.id,
      codigo: p.codigo,
      nome: p.nome,
      inventariante: p.inventariante,
      formato: p.formato,
      areaM2: p.areaM2,
      areaHa: p.areaHa,
      totalArvores: stats.totalArvores,
      arvoresValidas: stats.arvoresValidas,
      dapMedio: stats.dapMedio,
      areaBasalTotal: stats.areaBasalTotal,
      areaBasalPorHectare: stats.areaBasalPorHectare,
      status: p.status,
    });
  });

  const areaTotalAmostradaHa = converterM2ParaHectares(areaTotalAmostradaM2);

  // DAP médio geral entre todas as árvores
  const dapMedioGeral =
    todosDapsValidos.length > 0
      ? todosDapsValidos.reduce((acc, v) => acc + v, 0) / todosDapsValidos.length
      : null;

  // Médias de G/ha
  const parcelasComGha = parcelasResumo.filter((pr) => pr.areaBasalPorHectare !== null);
  const mediaAritmeticaGha =
    parcelasComGha.length > 0
      ? parcelasComGha.reduce((acc, pr) => acc + (pr.areaBasalPorHectare as number), 0) /
        parcelasComGha.length
      : null;

  const mediaPonderadaGha =
    areaTotalAmostradaHa > 0 ? somaAreasBasais / areaTotalAmostradaHa : null;

  const distribuicaoEspecies = Object.keys(especieAcumulada).map((k) => {
    const item = especieAcumulada[k];
    const proporcao =
      somaAreasBasais > 0 ? (item.gTotal / somaAreasBasais) * 100 : 0;
    return {
      especie: item.nomeOriginal,
      arvoresValidas: item.validas,
      areaBasalTotal: item.gTotal,
      proporcao,
    };
  }).sort((a, b) => b.areaBasalTotal - a.areaBasalTotal);

  return {
    totalParcelas: plots.length,
    totalArvores,
    totalArvoresValidas,
    totalEspecies: especiesGlobais.size,
    areaTotalAmostradaM2,
    areaTotalAmostradaHa,
    somaAreasBasais,
    dapMedioGeral,
    mediaAritmeticaGha,
    mediaPonderadaGha,
    parcelasResumo,
    distribuicaoEspecies,
  };
}

/**
 * Formatador auxiliar para exibição numérica segura e profissional.
 */
export function formatarNumero(
  valor: number | null | undefined,
  casasDecimais = 2,
  sufixo = ''
): string {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return '—';
  }
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  }) + sufixo;
}
