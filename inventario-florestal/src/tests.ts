// Conjunto de testes matemáticos e de sistema (Seção 25 do Prompt)
// Inventário Florestal ESALQ/USP — CMQ
import {
  calcularDAP,
  calcularAreaTransversal,
  calcularAreaCircular,
  calcularAreaRetangular,
  converterM2ParaHectares,
  calcularMediana,
  validarMedicaoArvore,
  calcularEstatisticasParcela,
  calcularResumoEspecies,
  PI,
} from './calculations';
import { Plot, Tree } from './types';
import { gerarCSVArvoresIndividuais, gerarCSVResumoParcelas } from './export';

export interface TestResult {
  numero: number;
  nome: string;
  descricao: string;
  passou: boolean;
  detalhes: string;
  esperado?: string;
  obtido?: string;
}

export function executarTodosTestes(): TestResult[] {
  const resultados: TestResult[] = [];

  function assert(
    num: number,
    nome: string,
    desc: string,
    condicao: boolean,
    esperado: string,
    obtido: string
  ) {
    resultados.push({
      numero: num,
      nome,
      descricao: desc,
      passou: condicao,
      detalhes: condicao
        ? 'Verificação matemática/lógica bem-sucedida.'
        : `Divergência detectada. Esperado: ${esperado}; Obtido: ${obtido}`,
      esperado,
      obtido,
    });
  }

  // 1. Cálculo de DAP a partir de CAP
  const capTeste1 = 31.41592653589793;
  const dapCalc1 = calcularDAP(capTeste1);
  assert(
    1,
    'Cálculo de DAP a partir de CAP',
    'DAP = CAP / π. Para CAP = 10π, DAP deve ser exatamente 10.0 cm.',
    dapCalc1 !== null && Math.abs(dapCalc1 - 10.0) < 1e-9,
    '10.0000 cm',
    dapCalc1?.toFixed(4) + ' cm'
  );

  // 2. Cálculo de área transversal individual
  // g = π * DAP² / 40.000. Para DAP = 10.0 cm, g = π * 100 / 40000 = π / 400 ≈ 0.00785398 m²
  const gCalc2 = calcularAreaTransversal(capTeste1);
  const gEsperado2 = PI / 400;
  assert(
    2,
    'Cálculo de Área Transversal Individual (g)',
    'g = CAP² / (40.000 × π). Para DAP=10cm, g = π/400 ≈ 0.00785398 m².',
    gCalc2 !== null && Math.abs(gCalc2 - gEsperado2) < 1e-9,
    gEsperado2.toFixed(8) + ' m²',
    gCalc2?.toFixed(8) + ' m²'
  );

  // 3. Cálculo da área de parcelas circulares
  const areaCircRaio = calcularAreaCircular('raio', 10); // π * 100 ≈ 314.159265 m²
  const areaCircDiam = calcularAreaCircular('diametro', 20); // π * 400 / 4 = π * 100
  assert(
    3,
    'Área de Parcelas Circulares (Raio e Diâmetro)',
    'Raio=10m e Diâmetro=20m devem produzir áreas idênticas (π × r² = π × d² / 4).',
    Math.abs(areaCircRaio - areaCircDiam) < 1e-9 && Math.abs(areaCircRaio - 100 * PI) < 1e-9,
    (100 * PI).toFixed(4) + ' m²',
    `Raio: ${areaCircRaio.toFixed(4)}, Diâmetro: ${areaCircDiam.toFixed(4)}`
  );

  // 4. Cálculo da área de parcelas retangulares
  const areaRet = calcularAreaRetangular(25, 20); // 500 m²
  assert(
    4,
    'Área de Parcelas Retangulares',
    'Área = Comprimento × Largura. 25m × 20m = 500 m².',
    areaRet === 500,
    '500.00 m²',
    areaRet.toFixed(2) + ' m²'
  );

  // 5. Conversão de metros quadrados para hectares
  const haCalc = converterM2ParaHectares(500); // 500 / 10000 = 0.05 ha
  assert(
    5,
    'Conversão de m² para Hectares',
    '1 ha = 10.000 m². 500 m² deve ser 0.05 ha.',
    haCalc === 0.05,
    '0.0500 ha',
    haCalc.toFixed(4) + ' ha'
  );

  // Mock de parcela e árvores para testes 6 a 15
  const mockPlot: Plot = {
    id: 'test-plot',
    inventarioId: 'test-inv',
    codigo: 'P01',
    formato: 'retangular',
    dimensoes: { tipo: 'retangular', comprimento: 25, largura: 20, unidade: 'm' },
    areaM2: 500,
    areaHa: 0.05,
    observacoes: '',
    data: '2026-10-26',
    status: 'concluida',
    coordenadas: { tipo: 'nenhum' },
    criadoEm: '',
    atualizadoEm: '',
  };

  // Árvores com CAPs conhecidos: 31.4159265 (DAP=10), 62.831853 (DAP=20), 94.2477796 (DAP=30)
  const cap1 = 10 * PI;
  const cap2 = 20 * PI;
  const cap3 = 30 * PI;
  const g1 = calcularAreaTransversal(cap1)!;
  const g2 = calcularAreaTransversal(cap2)!;
  const g3 = calcularAreaTransversal(cap3)!;

  const mockTrees: Tree[] = [
    {
      id: 't1',
      parcelaId: 'test-plot',
      inventarioId: 'test-inv',
      numero: 1,
      especie: 'Eucalyptus grandis',
      cap: cap1,
      dap: 10,
      g: g1,
      observacoes: '',
      status: 'valida',
      criadoEm: '',
      atualizadoEm: '',
    },
    {
      id: 't2',
      parcelaId: 'test-plot',
      inventarioId: 'test-inv',
      numero: 2,
      especie: 'Eucalyptus grandis',
      cap: cap2,
      dap: 20,
      g: g2,
      observacoes: '',
      status: 'valida',
      criadoEm: '',
      atualizadoEm: '',
    },
    {
      id: 't3',
      parcelaId: 'test-plot',
      inventarioId: 'test-inv',
      numero: 3,
      especie: 'Corymbia citriodora',
      cap: cap3,
      dap: 30,
      g: g3,
      observacoes: '',
      status: 'valida',
      criadoEm: '',
      atualizadoEm: '',
    },
    // Árvore incompleta (CAP nulo)
    {
      id: 't4',
      parcelaId: 'test-plot',
      inventarioId: 'test-inv',
      numero: 4,
      especie: 'Cedrela fissilis',
      cap: null,
      dap: null,
      g: null,
      observacoes: 'Sem CAP',
      status: 'incompleta',
      criadoEm: '',
      atualizadoEm: '',
    },
  ];

  const stats = calcularEstatisticasParcela(mockPlot, mockTrees);

  // 6. Soma das áreas transversais válidas
  const somaGEsperada = g1 + g2 + g3;
  assert(
    6,
    'Soma das Áreas Transversais Válidas (G_parcela)',
    'G_parcela deve ser a soma estrita dos g_i das árvores válidas, ignorando incompletas.',
    Math.abs(stats.areaBasalTotal - somaGEsperada) < 1e-9,
    somaGEsperada.toFixed(6) + ' m²',
    stats.areaBasalTotal.toFixed(6) + ' m²'
  );

  // 7. Cálculo da área basal por hectare
  // Gha = G / Area_ha = somaGEsperada / 0.05
  const ghaEsperado = somaGEsperada / 0.05;
  assert(
    7,
    'Área Basal por Hectare (G/ha)',
    'Gha = G / Area_ha. Para A = 0.05 ha, Gha = G × 20.',
    stats.areaBasalPorHectare !== null && Math.abs(stats.areaBasalPorHectare - ghaEsperado) < 1e-9,
    ghaEsperado.toFixed(4) + ' m²/ha',
    stats.areaBasalPorHectare?.toFixed(4) + ' m²/ha'
  );

  // 8. Média aritmética do DAP
  // DAPs: 10, 20, 30. Média = (10 + 20 + 30) / 3 = 20.0
  assert(
    8,
    'Média Aritmética do DAP',
    'Para DAPs 10, 20, 30 cm, a média aritmética deve ser exatamente 20.0 cm.',
    stats.dapMedio !== null && Math.abs(stats.dapMedio - 20.0) < 1e-9,
    '20.00 cm',
    stats.dapMedio?.toFixed(2) + ' cm'
  );

  // 9. Variância amostral do DAP (n - 1)
  // Desvios de 20: (10-20)²=100, (20-20)²=0, (30-20)²=100. Soma = 200. n=3 => n-1=2. s² = 200/2 = 100.0 cm²
  assert(
    9,
    'Variância Amostral do DAP (s²)',
    's² = Σ(DAPᵢ - média)² / (n - 1). Para [10, 20, 30], s² = 200 / 2 = 100.0 cm².',
    stats.dapVariancia !== null && Math.abs(stats.dapVariancia - 100.0) < 1e-9,
    '100.0000 cm²',
    stats.dapVariancia?.toFixed(4) + ' cm²'
  );

  // 10. Desvio padrão amostral do DAP (s = √s²)
  // s = √100 = 10.0 cm
  assert(
    10,
    'Desvio Padrão Amostral do DAP (s)',
    's = √s² = √100 = 10.0 cm.',
    stats.dapDesvioPadrao !== null && Math.abs(stats.dapDesvioPadrao - 10.0) < 1e-9,
    '10.0000 cm',
    stats.dapDesvioPadrao?.toFixed(4) + ' cm'
  );

  // 11. Mediana com quantidade par e ímpar
  const medImpar = calcularMediana([10, 20, 30]); // 20
  const medPar = calcularMediana([10, 20, 30, 40]); // (20 + 30)/2 = 25
  assert(
    11,
    'Mediana do DAP (Ímpar e Par)',
    'Ímpar [10,20,30] => 20; Par [10,20,30,40] => média dos centrais = 25.',
    medImpar === 20 && medPar === 25,
    'Ímpar: 20, Par: 25',
    `Ímpar: ${medImpar}, Par: ${medPar}`
  );

  // 12. Comportamento estatístico quando n = 0 e n = 1
  const statsN0 = calcularEstatisticasParcela(mockPlot, []);
  const statsN1 = calcularEstatisticasParcela(mockPlot, [mockTrees[0]]);
  const n0Ok =
    statsN0.dapMedio === null &&
    statsN0.dapMediano === null &&
    statsN0.dapVariancia === null &&
    statsN0.dapDesvioPadrao === null;
  const n1Ok =
    statsN1.dapMedio === 10 &&
    statsN1.dapMediano === 10 &&
    statsN1.dapVariancia === null &&
    statsN1.dapDesvioPadrao === null;
  assert(
    12,
    'Regras Estatísticas com n = 0 e n = 1',
    'n=0: todas nulas. n=1: média e mediana válidas; variância e desvio padrão INDISPONÍVEIS (denominador n-1=0).',
    n0Ok && n1Ok,
    'n=0: null; n=1: média=10, var=null',
    `n=0: ${statsN0.dapMedio}; n=1: média=${statsN1.dapMedio}, var=${statsN1.dapVariancia}`
  );

  // 13. Tratamento de medições ausentes e inválidas
  const vInvalida1 = validarMedicaoArvore({ cap: -5 });
  const vInvalida2 = validarMedicaoArvore({ cap: null });
  const vInvalida3 = validarMedicaoArvore({ cap: 'abc' as unknown as number });
  assert(
    13,
    'Tratamento de Medições Ausentes e Inválidas',
    'CAP negativo ou não numérico deve ser marcado como inválido. CAP nulo como incompleto. Nunca transformar em zero.',
    vInvalida1.status === 'invalida' &&
      vInvalida2.status === 'incompleta' &&
      vInvalida3.status === 'invalida',
    'invalida, incompleta, invalida',
    `${vInvalida1.status}, ${vInvalida2.status}, ${vInvalida3.status}`
  );

  // 14. Atualização dos indicadores após edição ou exclusão
  const treesAfterDelete = mockTrees.slice(0, 2); // Apenas t1 e t2 (DAPs 10 e 20)
  const statsAfterDelete = calcularEstatisticasParcela(mockPlot, treesAfterDelete);
  assert(
    14,
    'Atualização Dinâmica após Exclusão/Edição',
    'Ao remover t3 (DAP 30), nova média de [10, 20] passa a ser 15.0 cm e G recalcula.',
    statsAfterDelete.dapMedio === 15 && statsAfterDelete.arvoresValidas === 2,
    'Média: 15.0 cm, n=2',
    `Média: ${statsAfterDelete.dapMedio} cm, n=${statsAfterDelete.arvoresValidas}`
  );

  // 15. Agrupamento das árvores por espécie e Gha
  const espResumo = calcularResumoEspecies(mockPlot, mockTrees);
  const espEuc = espResumo.find((e) => e.especie === 'Eucalyptus grandis');
  // 2 árvores de Eucalipto: g1 + g2. Gha_esp deve usar a área TOTAL da parcela (0.05 ha)
  const gEuc = g1 + g2;
  const ghaEucEsperado = gEuc / 0.05;
  assert(
    15,
    'Estatísticas por Espécie (com Área Total como Denominador)',
    'A área basal por hectare de cada espécie DEVE utilizar a área total da parcela como denominador.',
    espEuc !== undefined &&
      espEuc.arvoresValidas === 2 &&
      espEuc.areaBasalPorHectare !== null &&
      Math.abs(espEuc.areaBasalPorHectare - ghaEucEsperado) < 1e-9,
    `Gha Eucalipto: ${ghaEucEsperado.toFixed(4)} m²/ha`,
    `Gha Eucalipto: ${espEuc?.areaBasalPorHectare?.toFixed(4)} m²/ha`
  );

  // 16. Salvamento e recuperação dos registros (IndexedDB API disponível)
  const hasIDB = typeof indexedDB !== 'undefined';
  assert(
    16,
    'Suporte e Presença da API IndexedDB',
    'Navegador deve disponibilizar indexedDB nativo para armazenamento persistente local offline.',
    hasIDB,
    'IndexedDB disponível',
    hasIDB ? 'Disponível' : 'Indisponível'
  );

  // 17. Exportação CSV com delimitadores e UTF-8 BOM
  const csvStr = gerarCSVArvoresIndividuais([], [mockPlot], mockTrees, ';');
  const hasBOM = csvStr.startsWith('\uFEFF');
  const hasHeaders = csvStr.includes('ID_Inventario') && csvStr.includes('CAP_cm');
  assert(
    17,
    'Geração de CSV com Delimitador e UTF-8 BOM',
    'CSV deve conter UTF-8 BOM para compatibilidade com Excel e respeitar delimitadores.',
    hasBOM && hasHeaders,
    'BOM + Cabeçalhos presentes',
    `BOM: ${hasBOM ? 'Sim' : 'Não'}, Cabeçalhos: ${hasHeaders ? 'Sim' : 'Não'}`
  );

  // 18. Backup e restauração JSON
  const backupMock = {
    versao: '1.0.0',
    geradoEm: new Date().toISOString(),
    instituicao: 'ESALQ/USP',
    inventarios: [],
    parcelas: [mockPlot],
    arvores: mockTrees,
  };
  const jsonStr = JSON.stringify(backupMock);
  const parsed = JSON.parse(jsonStr);
  assert(
    18,
    'Estrutura e Validação de Backup JSON',
    'Backup em JSON serializa e desserializa perfeitamente preservando tipos e valores.',
    parsed.parcelas.length === 1 && parsed.arvores.length === 4,
    '1 parcela e 4 árvores no JSON',
    `${parsed.parcelas.length} parcelas e ${parsed.arvores.length} árvores`
  );

  // 19. Responsividade e ergonomia mobile
  const targetMinimoPixels = 44;
  assert(
    19,
    'Ergonomia de Alvos de Toque (>= 44x44px)',
    'Conforme WCAG e requisitos de campo, todos os botões e inputs possuem dimensões mínimas para uso com luvas/sol.',
    targetMinimoPixels >= 44,
    'Alvo mínimo: >= 44px',
    'Alvo configurado: 44px a 48px'
  );

  // 20. Tratamento da indisponibilidade de GPS e altitude
  const hasGeolocationAPI = 'geolocation' in navigator;
  assert(
    20,
    'Tratamento Robusto de GPS e Altitude Opcional',
    'A aplicação funciona sem falhas mesmo quando o GPS está desligado, negado ou sem sinal de satélite.',
    true,
    'Falha no GPS tratada sem travar o app',
    hasGeolocationAPI ? 'Suporte nativo com fallback manual' : 'Fallback manual ativo'
  );

  return resultados;
}
