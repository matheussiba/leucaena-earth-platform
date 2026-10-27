// Tipos de dados para o Inventário Florestal ESALQ/USP — CMQ

export type PlotFormat = 'circular' | 'retangular';
export type PlotStatus = 'nao_iniciada' | 'em_andamento' | 'concluida';
export type TreeStatus = 'valida' | 'incompleta' | 'invalida';

export interface CircularDimensions {
  tipo: 'circular';
  tipoEntrada: 'raio' | 'diametro';
  valorOriginal: number; // em metros
  unidade: 'm';
}

export interface RectangularDimensions {
  tipo: 'retangular';
  comprimento: number; // em metros
  largura: number; // em metros
  unidade: 'm';
}

export type PlotDimensions = CircularDimensions | RectangularDimensions;

export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null; // Altitude elipsoidal/ortométrica H em metros fornecida pelo sensor
  manualAltitude?: number | null; // Altitude manual informada se sensor indisponível
  precisao?: number | null; // Precisão horizontal em metros
  dataHora: string; // ISO 8601
  rotulo?: string; // e.g. "Centro da Parcela", "Canto 1", etc.
}

export interface PlotCoordinates {
  tipo: 'nenhum' | 'centro' | 'cantos' | 'manual';
  centro?: GeoPoint | null;
  cantos?: GeoPoint[] | null; // 4 cantos para parcelas retangulares
  observacoes?: string;
}

export interface Inventory {
  id: string;
  nome: string; // Nome do Inventário
  disciplina?: string; // e.g. "LCF0510 - Inventário Florestal"
  professores?: string; // e.g. "Matheus Pinheiro Ferreira e Jonathan Trautenmüller"
  monitor?: string; // e.g. "Matheus Siqueira Barros"
  turma: string; // Identificação da turma
  data: string; // Data da atividade de campo
  responsavel: string; // Responsável pela coleta / orientador
  metodoAmostragem: string; // Amostragem Aleatória Simples, Sistemática, etc. (informativo)
  observacoes: string;
  isDemo?: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Group {
  id: string;
  inventarioId: string;
  nome: string; // Ex: "Grupo 1", "Grupo 2 — Talhão Norte"
  integrantes: string; // Ex: "Aluno A, Aluno B, Aluno C"
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Plot {
  id: string;
  inventarioId: string;
  grupoId?: string; // Associado ao Grupo
  codigo: string; // ex: P01, P02
  nome?: string; // Nome da parcela (ex: Talhão de Eucalipto A, Restauração Ripária)
  inventariante?: string; // Quem está inventariando a parcela (estudantes, equipe, monitor)
  formato: PlotFormat;
  dimensoes: PlotDimensions;
  areaM2: number;
  areaHa: number;
  observacoes: string;
  data: string;
  status: PlotStatus;
  coordenadas: PlotCoordinates;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Tree {
  id: string;
  parcelaId: string;
  inventarioId: string;
  grupoId?: string;
  numero: number | string;
  especie: string; // Opcional - se vazio ou trim() == '', exibido como "Não identificada"
  cap: number | null; // Circunferência à Altura do Peito em cm
  dap: number | null; // Diâmetro à Altura do Peito em cm = CAP / π
  g: number | null; // Área transversal individual em m² = CAP² / (40000 × π)
  alturaH?: number | null; // Altura total H em metros (opcional)
  azimute?: number | null; // Azimute do centro em graus (0–360), parcelas circulares
  distanciaCentro?: number | null; // Distância do centro em metros, parcelas circulares
  observacoes: string;
  status: TreeStatus;
  motivoInvalido?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PlotStatistics {
  totalArvores: number;
  arvoresValidas: number;
  arvoresIncompletas: number;
  totalEspecies: number;
  capMedio: number | null;
  dapMedio: number | null;
  dapMediano: number | null;
  dapVariancia: number | null; // Variância amostral s² com (n-1)
  dapDesvioPadrao: number | null; // Desvio padrão amostral s
  dapMinimo: number | null;
  dapMaximo: number | null;
  areaBasalTotal: number; // Gparcela = Σ g_i em m²
  areaBasalPorHectare: number | null; // Gha = Gparcela / A_ha em m²/ha
  areaM2: number;
  areaHa: number;
}

export interface SpeciesPlotSummary {
  especie: string;
  arvoresValidas: number;
  dapMedio: number | null;
  dapMediano: number | null;
  dapVariancia: number | null;
  dapDesvioPadrao: number | null;
  areaBasalTotal: number; // m²
  areaBasalPorHectare: number | null; // m²/ha baseado na área TOTAL da parcela
  proporcaoAreaBasal: number; // % da área basal da parcela
}

export interface InventorySummary {
  totalParcelas: number;
  totalArvores: number;
  totalArvoresValidas: number;
  totalEspecies: number;
  areaTotalAmostradaM2: number;
  areaTotalAmostradaHa: number;
  somaAreasBasais: number; // m²
  dapMedioGeral: number | null;
  mediaAritmeticaGha: number | null; // Média aritmética simples entre parcelas
  mediaPonderadaGha: number | null; // Média ponderada pela área (Soma G / Soma Area Ha)
  parcelasResumo: Array<{
    parcelaId: string;
    codigo: string;
    nome?: string;
    inventariante?: string;
    formato: PlotFormat;
    areaM2: number;
    areaHa: number;
    totalArvores: number;
    arvoresValidas: number;
    dapMedio: number | null;
    areaBasalTotal: number;
    areaBasalPorHectare: number | null;
    status: PlotStatus;
  }>;
  distribuicaoEspecies: Array<{
    especie: string;
    arvoresValidas: number;
    areaBasalTotal: number;
    proporcao: number;
  }>;
}

export interface BackupData {
  versao: string;
  geradoEm: string;
  instituicao: string;
  inventarios: Inventory[];
  grupos?: Group[];
  parcelas: Plot[];
  arvores: Tree[];
}
