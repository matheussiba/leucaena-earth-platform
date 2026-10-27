import { Inventory, Group, Plot, Tree, BackupData } from './types';
import {
  calcularEstatisticasParcela,
  calcularResumoEspecies,
} from './calculations';
import { destinoPorAzimuteDistancia } from './geo';

/** Lat/lng da árvore só quando há centro GPS + azimute + distância; senão em branco. */
function coordsArvoreExport(
  parc: Plot | undefined,
  arv: Tree
): { lat: number | null; lng: number | null; tipo: string } {
  const centro = parc?.coordenadas?.centro;
  if (
    !parc ||
    !centro ||
    arv.azimute == null ||
    arv.distanciaCentro == null ||
    isNaN(Number(arv.azimute)) ||
    isNaN(Number(arv.distanciaCentro))
  ) {
    return { lat: null, lng: null, tipo: '' };
  }

  const dest = destinoPorAzimuteDistancia(
    centro.latitude,
    centro.longitude,
    Number(arv.azimute),
    Number(arv.distanciaCentro)
  );
  return { lat: dest.latitude, lng: dest.longitude, tipo: 'calculada_azimute_distancia' };
}

export type DelimitadorCSV = ';' | ',';

/**
 * Escapa células CSV para respeitar campos com quebras de linha, delimitadores e aspas.
 */
function escaparCSV(valor: unknown, delimitador: DelimitadorCSV): string {
  if (valor === null || valor === undefined) return '';
  let str = String(valor);
  if (
    str.includes(delimitador) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Formata número para exportação CSV de acordo com o delimitador:
 * - Se ';' (Excel pt-BR): número com vírgula como separador decimal.
 * - Se ',' (R/Python/Excel en-US): número com ponto como separador decimal.
 */
function formatarNumeroExport(num: number | null | undefined, delimitador: DelimitadorCSV, casas = 6): string {
  if (num === null || num === undefined || isNaN(num)) return '';
  const numStr = Number(num.toFixed(casas)).toString();
  if (delimitador === ';') {
    return numStr.replace('.', ',');
  }
  return numStr;
}

/**
 * Dispara o download de um arquivo no navegador.
 */
export function baixarArquivo(conteudo: string, nomeArquivo: string, mimeType: string): void {
  const blob = new Blob([conteudo], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ---------------- 20.1 Dados individuais por árvore ----------------

export function gerarCSVArvoresIndividuais(
  inventarios: Inventory[],
  parcelas: Plot[],
  arvores: Tree[],
  delimitador: DelimitadorCSV = ';'
): string {
  const invMap = new Map<string, Inventory>();
  inventarios.forEach((inv) => invMap.set(inv.id, inv));

  const parcMap = new Map<string, Plot>();
  parcelas.forEach((p) => parcMap.set(p.id, p));

  const headers = [
    'ID_Inventario',
    'Nome_Inventario',
    'Disciplina',
    'Professores',
    'Monitor',
    'Turma_Grupo',
    'Data_Inventario',
    'ID_Parcela',
    'Codigo_Parcela',
    'Nome_Parcela',
    'Inventariante_Parcela',
    'Formato_Parcela',
    'Dimensoes_Descricao',
    'Area_Parcela_m2',
    'Area_Parcela_ha',
    'Status_Parcela',
    'ID_Arvore',
    'Numero_Arvore',
    'Especie',
    'CAP_cm',
    'DAP_cm',
    'Altura_H_m',
    'Azimute_graus',
    'Distancia_Centro_m',
    'Area_Transversal_g_m2',
    'Status_Medicao',
    'Motivo_Invalido',
    'Observacoes_Arvore',
    'Coord_Tipo',
    'Latitude',
    'Longitude',
    'Altitude_H_m',
    'Precisao_GPS_m',
    'DataHora_GPS',
  ];

  const linhas: string[] = [headers.join(delimitador)];

  arvores.forEach((arv) => {
    const parc = parcMap.get(arv.parcelaId);
    const inv = invMap.get(arv.inventarioId);

    let dimDesc = '';
    if (parc) {
      if (parc.dimensoes.tipo === 'circular') {
        dimDesc = `${parc.dimensoes.tipoEntrada}=${parc.dimensoes.valorOriginal}m`;
      } else {
        dimDesc = `${parc.dimensoes.comprimento}x${parc.dimensoes.largura}m`;
      }
    }

    const treeCoord = coordsArvoreExport(parc, arv);
    const centro = parc?.coordenadas?.centro;
    const alt =
      treeCoord.lat != null && centro
        ? formatarNumeroExport(centro.manualAltitude ?? centro.altitude, delimitador, 2)
        : '';
    const prec =
      treeCoord.lat != null && centro
        ? formatarNumeroExport(centro.precisao, delimitador, 1)
        : '';
    const dh = treeCoord.lat != null && centro ? centro.dataHora || '' : '';

    const linha = [
      escaparCSV(inv?.id || arv.inventarioId, delimitador),
      escaparCSV(inv?.nome || '', delimitador),
      escaparCSV(inv?.disciplina || 'LCF0510 - Inventário Florestal', delimitador),
      escaparCSV(inv?.professores || 'Matheus Pinheiro Ferreira e Jonathan Trautenmüller', delimitador),
      escaparCSV(inv?.monitor || 'Matheus Siqueira Barros', delimitador),
      escaparCSV(inv?.turma || '', delimitador),
      escaparCSV(inv?.data || '', delimitador),
      escaparCSV(parc?.id || arv.parcelaId, delimitador),
      escaparCSV(parc?.codigo || '', delimitador),
      escaparCSV(parc?.nome || '', delimitador),
      escaparCSV(parc?.inventariante || '', delimitador),
      escaparCSV(parc?.formato || '', delimitador),
      escaparCSV(dimDesc, delimitador),
      formatarNumeroExport(parc?.areaM2, delimitador, 2),
      formatarNumeroExport(parc?.areaHa, delimitador, 4),
      escaparCSV(parc?.status || '', delimitador),
      escaparCSV(arv.id, delimitador),
      escaparCSV(arv.numero, delimitador),
      escaparCSV(arv.especie || 'Não identificada', delimitador),
      formatarNumeroExport(arv.cap, delimitador, 2),
      formatarNumeroExport(arv.dap, delimitador, 4),
      formatarNumeroExport(arv.alturaH ?? null, delimitador, 2),
      formatarNumeroExport(arv.azimute ?? null, delimitador, 2),
      formatarNumeroExport(arv.distanciaCentro ?? null, delimitador, 3),
      formatarNumeroExport(arv.g, delimitador, 6),
      escaparCSV(arv.status, delimitador),
      escaparCSV(arv.motivoInvalido || '', delimitador),
      escaparCSV(arv.observacoes || '', delimitador),
      escaparCSV(treeCoord.tipo, delimitador),
      formatarNumeroExport(treeCoord.lat, delimitador, 7),
      formatarNumeroExport(treeCoord.lng, delimitador, 7),
      alt,
      prec,
      escaparCSV(dh, delimitador),
    ];

    linhas.push(linha.join(delimitador));
  });

  // UTF-8 BOM para garantir acentuação correta no Excel
  return '\uFEFF' + linhas.join('\r\n');
}

// ---------------- 20.2 Resumo por parcela ----------------

export function gerarCSVResumoParcelas(
  inventarios: Inventory[],
  parcelas: Plot[],
  todasArvores: Tree[],
  delimitador: DelimitadorCSV = ';'
): string {
  const invMap = new Map<string, Inventory>();
  inventarios.forEach((inv) => invMap.set(inv.id, inv));

  const headers = [
    'ID_Inventario',
    'Nome_Inventario',
    'Disciplina',
    'Professores',
    'Monitor',
    'Turma_Grupo',
    'ID_Parcela',
    'Codigo_Parcela',
    'Nome_Parcela',
    'Inventariante_Parcela',
    'Formato',
    'Dimensoes',
    'Area_m2',
    'Area_ha',
    'Total_Arvores_Cadastradas',
    'Arvores_Validas_n',
    'Arvores_Incompletas',
    'Total_Especies',
    'CAP_Medio_cm',
    'DAP_Medio_cm',
    'DAP_Mediano_cm',
    'DAP_Variancia_Amostral_cm2',
    'DAP_Desvio_Padrao_Amostral_cm',
    'DAP_Minimo_cm',
    'DAP_Maximo_cm',
    'Area_Basal_Total_G_m2',
    'Area_Basal_Por_Hectare_Gha_m2_ha',
    'Status_Parcela',
    'Data_Coleta',
  ];

  const linhas: string[] = [headers.join(delimitador)];

  parcelas.forEach((p) => {
    const inv = invMap.get(p.inventarioId);
    const pTrees = todasArvores.filter((t) => t.parcelaId === p.id);
    const stats = calcularEstatisticasParcela(p, pTrees);

    let dimDesc = '';
    if (p.dimensoes.tipo === 'circular') {
      dimDesc = `${p.dimensoes.tipoEntrada}=${p.dimensoes.valorOriginal}m`;
    } else {
      dimDesc = `${p.dimensoes.comprimento}x${p.dimensoes.largura}m`;
    }

    const linha = [
      escaparCSV(inv?.id || p.inventarioId, delimitador),
      escaparCSV(inv?.nome || '', delimitador),
      escaparCSV(inv?.disciplina || 'LCF0510 - Inventário Florestal', delimitador),
      escaparCSV(inv?.professores || 'Matheus Pinheiro Ferreira e Jonathan Trautenmüller', delimitador),
      escaparCSV(inv?.monitor || 'Matheus Siqueira Barros', delimitador),
      escaparCSV(inv?.turma || '', delimitador),
      escaparCSV(p.id, delimitador),
      escaparCSV(p.codigo, delimitador),
      escaparCSV(p.nome || '', delimitador),
      escaparCSV(p.inventariante || '', delimitador),
      escaparCSV(p.formato, delimitador),
      escaparCSV(dimDesc, delimitador),
      formatarNumeroExport(stats.areaM2, delimitador, 2),
      formatarNumeroExport(stats.areaHa, delimitador, 4),
      stats.totalArvores.toString(),
      stats.arvoresValidas.toString(),
      stats.arvoresIncompletas.toString(),
      stats.totalEspecies.toString(),
      formatarNumeroExport(stats.capMedio, delimitador, 2),
      formatarNumeroExport(stats.dapMedio, delimitador, 3),
      formatarNumeroExport(stats.dapMediano, delimitador, 3),
      formatarNumeroExport(stats.dapVariancia, delimitador, 4),
      formatarNumeroExport(stats.dapDesvioPadrao, delimitador, 3),
      formatarNumeroExport(stats.dapMinimo, delimitador, 2),
      formatarNumeroExport(stats.dapMaximo, delimitador, 2),
      formatarNumeroExport(stats.areaBasalTotal, delimitador, 6),
      formatarNumeroExport(stats.areaBasalPorHectare, delimitador, 4),
      escaparCSV(p.status, delimitador),
      escaparCSV(p.data || '', delimitador),
    ];

    linhas.push(linha.join(delimitador));
  });

  return '\uFEFF' + linhas.join('\r\n');
}

// ---------------- 20.3 Resumo por espécie ----------------

export function gerarCSVResumoEspecies(
  parcelas: Plot[],
  todasArvores: Tree[],
  delimitador: DelimitadorCSV = ';'
): string {
  const headers = [
    'ID_Parcela',
    'Codigo_Parcela',
    'Nome_Parcela',
    'Inventariante_Parcela',
    'Area_Parcela_ha',
    'Especie',
    'Arvores_Validas_n',
    'DAP_Medio_cm',
    'DAP_Mediano_cm',
    'DAP_Variancia_Amostral_cm2',
    'DAP_Desvio_Padrao_Amostral_cm',
    'Area_Basal_Especie_G_m2',
    'Area_Basal_Por_Hectare_Gha_m2_ha',
    'Proporcao_Area_Basal_Pct',
  ];

  const linhas: string[] = [headers.join(delimitador)];

  parcelas.forEach((p) => {
    const pTrees = todasArvores.filter((t) => t.parcelaId === p.id);
    const espResumos = calcularResumoEspecies(p, pTrees);

    espResumos.forEach((esp) => {
      const linha = [
        escaparCSV(p.id, delimitador),
        escaparCSV(p.codigo, delimitador),
        escaparCSV(p.nome || '', delimitador),
        escaparCSV(p.inventariante || '', delimitador),
        formatarNumeroExport(p.areaHa, delimitador, 4),
        escaparCSV(esp.especie, delimitador),
        esp.arvoresValidas.toString(),
        formatarNumeroExport(esp.dapMedio, delimitador, 3),
        formatarNumeroExport(esp.dapMediano, delimitador, 3),
        formatarNumeroExport(esp.dapVariancia, delimitador, 4),
        formatarNumeroExport(esp.dapDesvioPadrao, delimitador, 3),
        formatarNumeroExport(esp.areaBasalTotal, delimitador, 6),
        formatarNumeroExport(esp.areaBasalPorHectare, delimitador, 4),
        formatarNumeroExport(esp.proporcaoAreaBasal, delimitador, 2),
      ];
      linhas.push(linha.join(delimitador));
    });
  });

  return '\uFEFF' + linhas.join('\r\n');
}

// ---------------- 20.4 Dados conjuntos do Grupo (todas as parcelas e árvores) ----------------

export function gerarCSVGrupoCompleto(
  inventario: Inventory,
  grupo: Group,
  parcelasDoGrupo: Plot[],
  todasArvores: Tree[],
  delimitador: DelimitadorCSV = ';'
): string {
  const parcMap = new Map<string, Plot>();
  parcelasDoGrupo.forEach((p) => parcMap.set(p.id, p));

  const headers = [
    'ID_Inventario',
    'Nome_Inventario',
    'Disciplina',
    'Professores',
    'Monitor',
    'Turma',
    'ID_Grupo',
    'Nome_Grupo',
    'Integrantes_Grupo',
    'ID_Parcela',
    'Codigo_Parcela',
    'Nome_Parcela',
    'Inventariante_Parcela',
    'Formato_Parcela',
    'Dimensoes_Descricao',
    'Area_Parcela_m2',
    'Area_Parcela_ha',
    'Status_Parcela',
    'ID_Arvore',
    'Numero_Arvore',
    'Especie',
    'CAP_cm',
    'DAP_cm',
    'Altura_H_m',
    'Azimute_graus',
    'Distancia_Centro_m',
    'Area_Transversal_g_m2',
    'Status_Medicao',
    'Motivo_Invalido',
    'Observacoes_Arvore',
    'Coord_Tipo',
    'Latitude',
    'Longitude',
    'Altitude_H_m',
    'Precisao_GPS_m',
    'DataHora_GPS',
  ];

  const linhas: string[] = [headers.join(delimitador)];

  // Filtra as árvores pertencentes às parcelas deste grupo
  const arvoresGrupo = todasArvores.filter((arv) => parcMap.has(arv.parcelaId));

  arvoresGrupo.forEach((arv) => {
    const parc = parcMap.get(arv.parcelaId);

    let dimDesc = '';
    if (parc) {
      if (parc.dimensoes.tipo === 'circular') {
        dimDesc = `${parc.dimensoes.tipoEntrada}=${parc.dimensoes.valorOriginal}m`;
      } else {
        dimDesc = `${parc.dimensoes.comprimento}x${parc.dimensoes.largura}m`;
      }
    }

    const treeCoord = coordsArvoreExport(parc, arv);
    const centro = parc?.coordenadas?.centro;
    const alt =
      treeCoord.lat != null && centro
        ? formatarNumeroExport(centro.manualAltitude ?? centro.altitude, delimitador, 2)
        : '';
    const prec =
      treeCoord.lat != null && centro
        ? formatarNumeroExport(centro.precisao, delimitador, 1)
        : '';
    const dh = treeCoord.lat != null && centro ? centro.dataHora || '' : '';

    const linha = [
      escaparCSV(inventario.id, delimitador),
      escaparCSV(inventario.nome, delimitador),
      escaparCSV(inventario.disciplina || 'LCF0510 - Inventário Florestal', delimitador),
      escaparCSV(inventario.professores || 'Matheus Pinheiro Ferreira e Jonathan Trautenmüller', delimitador),
      escaparCSV(inventario.monitor || 'Matheus Siqueira Barros', delimitador),
      escaparCSV(inventario.turma || '', delimitador),
      escaparCSV(grupo.id, delimitador),
      escaparCSV(grupo.nome, delimitador),
      escaparCSV(grupo.integrantes, delimitador),
      escaparCSV(parc?.id || arv.parcelaId, delimitador),
      escaparCSV(parc?.codigo || '', delimitador),
      escaparCSV(parc?.nome || '', delimitador),
      escaparCSV(parc?.inventariante || grupo.integrantes || '', delimitador),
      escaparCSV(parc?.formato || '', delimitador),
      escaparCSV(dimDesc, delimitador),
      formatarNumeroExport(parc?.areaM2, delimitador, 2),
      formatarNumeroExport(parc?.areaHa, delimitador, 4),
      escaparCSV(parc?.status || '', delimitador),
      escaparCSV(arv.id, delimitador),
      escaparCSV(arv.numero, delimitador),
      escaparCSV(arv.especie || 'Não identificada', delimitador),
      formatarNumeroExport(arv.cap, delimitador, 2),
      formatarNumeroExport(arv.dap, delimitador, 4),
      formatarNumeroExport(arv.alturaH ?? null, delimitador, 2),
      formatarNumeroExport(arv.azimute ?? null, delimitador, 2),
      formatarNumeroExport(arv.distanciaCentro ?? null, delimitador, 3),
      formatarNumeroExport(arv.g, delimitador, 6),
      escaparCSV(arv.status, delimitador),
      escaparCSV(arv.motivoInvalido || '', delimitador),
      escaparCSV(arv.observacoes || '', delimitador),
      escaparCSV(treeCoord.tipo, delimitador),
      formatarNumeroExport(treeCoord.lat, delimitador, 7),
      formatarNumeroExport(treeCoord.lng, delimitador, 7),
      alt,
      prec,
      escaparCSV(dh, delimitador),
    ];

    linhas.push(linha.join(delimitador));
  });

  return '\uFEFF' + linhas.join('\r\n');
}
