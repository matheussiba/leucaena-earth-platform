import {
  Workstation,
  Reservation,
  FairUseRules,
  LabMember,
  normalizeLab,
  ensureLabPrefixedName,
  CEPE_GEO_LAB,
} from '../types';

export const DEFAULT_RULES: FairUseRules = {
  maxContinuousHoursWeekday: 12,
  maxContinuousHoursWeekend: 36,
  maxAdvanceDays: 14,
  maxWeeklyHoursPerUser: 40,
  maxActiveBookingsPerUser: 4,
  toleranceCheckInMinutes: 20,
};

export const INITIAL_MEMBERS: LabMember[] = [
  { id: 'mem-1', name: 'CMQ - Francisca Pereira', role: 'Pós-Doc' },
  { id: 'mem-2', name: 'CMQ - Gabriel Ferraz', role: 'Mestrado' },
  { id: 'mem-3', name: 'CMQ - Gabriel Souza', role: 'TT' },
  { id: 'mem-4', name: 'CMQ - Jefferson', role: 'Técnico do Lab' },
  { id: 'mem-5', name: 'CMQ - Jomil Costa', role: 'Pós-Doc' },
  { id: 'mem-6', name: 'CMQ - Matheus Barros', role: 'Doutorado' },
  { id: 'mem-7', name: 'CMQ - Matheus Ferreira', role: 'Professor' },
  { id: 'mem-8', name: 'CMQ - Monique', role: 'TT' },
  { id: 'mem-9', name: 'CMQ - Pedro Emidio', role: 'TT' },
  { id: 'mem-10', name: 'CMQ - Rodrigo Costa', role: 'Pós-Doc' },
  // CePE-Geo
  { id: 'mem-cepe-01', name: 'CePE-Geo - Angélica Resende', role: 'Pós-Doc' },
  { id: 'mem-cepe-02', name: 'CePE-Geo - Bianca Jacobe', role: 'Mestrado' },
  { id: 'mem-cepe-03', name: 'CePE-Geo - Delano', role: 'Pós-Doc' },
  { id: 'mem-cepe-04', name: 'CePE-Geo - Eduardo', role: 'Iniciação Científica' },
  { id: 'mem-cepe-05', name: 'CePE-Geo - Herbert Lincon', role: 'Mestrado' },
  { id: 'mem-cepe-06', name: 'CePE-Geo - Ítalo Campanharo', role: 'Doutorado' },
  { id: 'mem-cepe-07', name: 'CePE-Geo - Jose Matheus', role: 'Mestrado' },
  { id: 'mem-cepe-08', name: 'CePE-Geo - Luana Ariel', role: 'Mestrado' },
  { id: 'mem-cepe-09', name: 'CePE-Geo - Matheus Fuza', role: 'Mestrado' },
  { id: 'mem-cepe-10', name: 'CePE-Geo - Vinicius Costa', role: 'Doutorado' },
  { id: 'mem-cepe-11', name: 'CePE-Geo - Arnaldo', role: 'Doutorado' },
  { id: 'mem-cepe-12', name: 'CePE-Geo - Franciel Rex', role: 'Mestrado' },
  { id: 'mem-cepe-13', name: 'CePE-Geo - Giovanna', role: 'Mestrado' },
  { id: 'mem-cepe-14', name: 'CePE-Geo - Isa Nery', role: 'Mestrado' },
  { id: 'mem-cepe-15', name: 'CePE-Geo - Julia Okada', role: 'Mestrado' },
  { id: 'mem-cepe-16', name: 'CePE-Geo - Leo Mrly', role: 'Mestrado' },
  { id: 'mem-cepe-17', name: 'CePE-Geo - Liliane Moreira', role: 'Mestrado' },
  { id: 'mem-cepe-18', name: 'CePE-Geo - Maria Barbosa', role: 'Mestrado' },
  { id: 'mem-cepe-19', name: 'CePE-Geo - Mel Kern', role: 'Pós-Doc' },
  { id: 'mem-cepe-20', name: 'CePE-Geo - Thiago', role: 'Mestrado' },
  { id: 'mem-cepe-21', name: 'CePE-Geo - Vitor Albano', role: 'Mestrado' },
];

/** Legacy id → canonical `lab-baia-code` id */
export const WORKSTATION_ID_ALIASES: Record<string, string> = {
  'ws-baia-04': 'cmq-baia-04',
  'ws-baia-07': 'cmq-baia-07',
  'ws-dados-igc': 'cmq-baia-igc',
};

export const DEFAULT_BAY_IPS: Record<string, string> = {
  '4': '143.107.215.230',
  '04': '143.107.215.230',
  '7': '143.107.215.152',
  '07': '143.107.215.152',
  'cmq-baia-04': '143.107.215.230',
  'cmq-baia-07': '143.107.215.152',
  'cmq-baia-igc': '143.107.215.175',
  // legacy keys
  'ws-baia-04': '143.107.215.230',
  'ws-baia-07': '143.107.215.152',
  'ws-dados-igc': '143.107.215.175',
  IGC: '143.107.215.175',
};

export function defaultIpForBay(ws: Pick<Workstation, 'id' | 'bayNumber'>): string {
  const byId = DEFAULT_BAY_IPS[String(ws.id || '')];
  if (byId) return byId;
  const bay = String(ws.bayNumber ?? '').trim();
  return DEFAULT_BAY_IPS[bay] || DEFAULT_BAY_IPS[bay.padStart(2, '0')] || '';
}

export const INITIAL_WORKSTATIONS: Workstation[] = [
  {
    id: 'cmq-baia-04',
    name: 'Workstation Alpha',
    bayNumber: 4,
    lab: 'CMQ',
    location: 'Baia 04 - Laboratório CMQ',
    imageUrl: '',
    ip: '143.107.215.230',
    gpu: '1x NVIDIA RTX 16GB',
    cpu: 'Intel Core i9',
    ram: '128 GB RAM',
    internalStorage: '5 TB',
    os: 'Ubuntu 24.04 LTS',
    status: 'in_use',
    notes: 'Prioritária para pesquisa e computação.',
    isCustom: false,
  },
  {
    id: 'cmq-baia-07',
    name: 'Workstation Beta',
    bayNumber: 7,
    lab: 'CMQ',
    location: 'Baia 07 - Laboratório CMQ',
    imageUrl: '',
    ip: '143.107.215.152',
    gpu: '1x NVIDIA RTX 16GB',
    cpu: 'Intel Core i9',
    ram: '128 GB RAM',
    internalStorage: '5 TB',
    os: 'Ubuntu 22.04 LTS',
    status: 'in_use',
    notes: 'Prioritária para pesquisa e computação.',
    isCustom: false,
  },
  {
    id: 'cmq-baia-igc',
    name: 'Dados IGC',
    bayNumber: 'IGC',
    lab: 'CMQ',
    location: 'Data Storage - Laboratório CMQ / IGC',
    imageUrl: '',
    ip: '143.107.215.175',
    gpu: 'Sem GPU dedicada',
    cpu: '—',
    ram: '32 GB RAM',
    internalStorage: '28 TB + 28 TB',
    os: undefined,
    status: 'available',
    notes: 'Servidor de armazenamento de dados.',
    isCustom: false,
  },
  // CePE-Geo — placeholders (edit real specs in the site)
  {
    id: 'cepe-geo-baia-01',
    name: 'CePE-Geo Baia 01',
    bayNumber: 1,
    lab: CEPE_GEO_LAB,
    location: 'Baia 01 - Laboratório CePE-Geo',
    imageUrl: '',
    gpu: 'A definir',
    cpu: 'A definir',
    ram: 'A definir',
    internalStorage: 'A definir',
    status: 'available',
    notes: 'Placeholder — editar no site.',
    isCustom: true,
  },
  {
    id: 'cepe-geo-baia-02',
    name: 'CePE-Geo Baia 02',
    bayNumber: 2,
    lab: CEPE_GEO_LAB,
    location: 'Baia 02 - Laboratório CePE-Geo',
    imageUrl: '',
    gpu: 'A definir',
    cpu: 'A definir',
    ram: 'A definir',
    internalStorage: 'A definir',
    status: 'available',
    notes: 'Placeholder — editar no site.',
    isCustom: true,
  },
  {
    id: 'cepe-geo-baia-03',
    name: 'CePE-Geo Baia 03',
    bayNumber: 3,
    lab: CEPE_GEO_LAB,
    location: 'Baia 03 - Laboratório CePE-Geo',
    imageUrl: '',
    gpu: 'A definir',
    cpu: 'A definir',
    ram: 'A definir',
    internalStorage: 'A definir',
    status: 'available',
    notes: 'Placeholder — editar no site.',
    isCustom: true,
  },
  {
    id: 'cepe-geo-baia-04',
    name: 'CePE-Geo Baia 04',
    bayNumber: 4,
    lab: CEPE_GEO_LAB,
    location: 'Baia 04 - Laboratório CePE-Geo',
    imageUrl: '',
    gpu: 'A definir',
    cpu: 'A definir',
    ram: 'A definir',
    internalStorage: 'A definir',
    status: 'available',
    notes: 'Placeholder — editar no site.',
    isCustom: true,
  },
  {
    id: 'cepe-geo-baia-05',
    name: 'CePE-Geo Baia 05',
    bayNumber: 5,
    lab: CEPE_GEO_LAB,
    location: 'Baia 05 - Laboratório CePE-Geo',
    imageUrl: '',
    gpu: 'A definir',
    cpu: 'A definir',
    ram: 'A definir',
    internalStorage: 'A definir',
    status: 'available',
    notes: 'Placeholder — editar no site.',
    isCustom: true,
  },
];

/** Temporary Extra test machines — strip from persisted state. */
export function isRetiredTestWorkstation(ws: Pick<Workstation, 'id' | 'lab'>): boolean {
  const id = String(ws.id || '');
  if (id.startsWith('ws-extra-')) return true;
  return normalizeLab(ws.lab) === 'Extra' && id.includes('extra');
}

export function isRetiredTestMember(m: Pick<LabMember, 'id' | 'name'>): boolean {
  if (String(m.id || '').startsWith('mem-extra-')) return true;
  return /^Extra\s*-/i.test(m.name || '');
}

export function withDefaultLab(ws: Workstation): Workstation {
  return { ...ws, lab: normalizeLab(ws.lab) };
}

export function withLabPrefixedMember(m: LabMember): LabMember {
  return { ...m, name: ensureLabPrefixedName(m.name, 'CMQ') };
}

export const createSampleReservations = (): Reservation[] => {
  const now = new Date();

  const getISOForToday = (hours: number, minutes = 0) => {
    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  const getISOForDayOffset = (dayOffset: number, hours: number, minutes = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  return [];
};
