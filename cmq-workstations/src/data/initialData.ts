import { Workstation, Reservation, FairUseRules, LabMember } from '../types';

export const DEFAULT_RULES: FairUseRules = {
  maxContinuousHoursWeekday: 12,
  maxContinuousHoursWeekend: 36,
  maxAdvanceDays: 14,
  maxWeeklyHoursPerUser: 28,
  maxActiveBookingsPerUser: 4,
  toleranceCheckInMinutes: 20,
};

export const INITIAL_MEMBERS: LabMember[] = [
  { id: 'mem-1', name: 'Francisca Pereira', role: 'Pós-Doc' },
  { id: 'mem-2', name: 'Gabriel Ferraz', role: 'Mestrado' },
  { id: 'mem-3', name: 'Gabriel Souza', role: 'TT' },
  { id: 'mem-4', name: 'Jefferson', role: 'Técnico do Lab' },
  { id: 'mem-5', name: 'Jomil Costa', role: 'Pós-Doc' },
  { id: 'mem-6', name: 'Matheus Barros', role: 'Doutorado' },
  { id: 'mem-7', name: 'Matheus Ferreira', role: 'Professor' },
  { id: 'mem-8', name: 'Monique', role: 'TT' },
  { id: 'mem-9', name: 'Pedro Emidio', role: 'TT' },
  { id: 'mem-10', name: 'Rodrigo Costa', role: 'Pós-Doc' },
];

export const DEFAULT_BAY_IPS: Record<string, string> = {
  '4': '143.107.215.230',
  '04': '143.107.215.230',
  '7': '143.107.215.152',
  '07': '143.107.215.152',
  'ws-baia-04': '143.107.215.230',
  'ws-baia-07': '143.107.215.152',
};

export function defaultIpForBay(ws: Pick<Workstation, 'id' | 'bayNumber'>): string {
  const byId = DEFAULT_BAY_IPS[String(ws.id || '')];
  if (byId) return byId;
  const bay = String(ws.bayNumber ?? '').trim();
  return DEFAULT_BAY_IPS[bay] || DEFAULT_BAY_IPS[bay.padStart(2, '0')] || '';
}

export const INITIAL_WORKSTATIONS: Workstation[] = [
  {
    id: 'ws-baia-04',
    name: 'Workstation Alpha',
    bayNumber: 4,
    location: 'Baia 04 - Laboratório CMQ',
    imageUrl: '',
    ip: '143.107.215.230',
    gpu: '1x NVIDIA RTX 16GB',
    cpu: 'Intel Core i9',
    ram: '128 GB RAM',
    internalStorage: '5 TB',
    additionalStorage: undefined,
    os: 'Ubuntu 24.04 LTS',
    status: 'in_use',
    notes: 'Prioritária para pesquisa e computação.',
    isCustom: false,
  },
  {
    id: 'ws-baia-07',
    name: 'Workstation Beta',
    bayNumber: 7,
    location: 'Baia 07 - Laboratório CMQ',
    imageUrl: '',
    ip: '143.107.215.152',
    gpu: '1x NVIDIA RTX 16GB',
    cpu: 'Intel Core i9',
    ram: '128 GB RAM',
    internalStorage: '5 TB',
    additionalStorage: undefined,
    os: 'Ubuntu 22.04 LTS',
    status: 'in_use',
    notes: 'Prioritária para pesquisa e computação.',
    isCustom: false,
  },
];

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

  const currentHour = now.getHours();

  // 1. Matheus Barros on Baia 04:
  // Normal usage! Total 4 hours (e.g. started 1h ago, ending in 3h).
  // 100% within the 12h fair-use limit!
  const mbStartHour = Math.max(0, currentHour - 1);
  const mbEndHour = Math.min(23, mbStartHour + 4);

  // 2. Jomil Costa on Baia 07:
  // Realistic simulation of EXCEEDING Fair-Use!
  // Started at 06:00, booked for 18h continuous until 24:00 (limit is 12h).
  // The threshold occurs at 18:00 (06:00 + 12h).
  // From 06:00 to 18:00 is normal usage; from 18:00 to 24:00 is the visual excess portion.
  const jcStartHour = 6;
  const jcThresholdHour = 18;
  const jcEndHour = 24;

  return [
    // Baia 04: Matheus Barros (NORMAL)
    {
      id: 'res-live-baia4-matheus',
      workstationId: 'ws-baia-04',
      researcherName: 'Matheus Barros',
      researcherRole: 'Doutorado',
      startTime: getISOForToday(mbStartHour, 0),
      endTime: getISOForToday(mbEndHour, 0),
      type: 'instant_checkin',
      status: 'active',
      checkedInAt: getISOForToday(mbStartHour, 0),
      isNonFairUse: false, // Normal, within fair use!
      notes: 'Execução de experimentos e visualização de dados.',
      createdAt: getISOForToday(mbStartHour, 0),
    },

    // Baia 04: Gabriel Ferraz (Scheduled tonight)
    {
      id: 'res-today-baia4-evening',
      workstationId: 'ws-baia-04',
      researcherName: 'Gabriel Ferraz',
      researcherRole: 'Mestrado',
      startTime: getISOForToday(Math.min(20, mbEndHour + 1), 0),
      endTime: getISOForToday(Math.min(23, mbEndHour + 4), 0),
      type: 'scheduled',
      status: 'active',
      notes: 'Análise de métricas de acurácia.',
      createdAt: getISOForDayOffset(-1, 10, 0),
    },

    // Baia 07: Jomil Costa (18h continuous run - EXCEEDS Fair-Use after 12h threshold)
    {
      id: 'res-live-baia7-jomil',
      workstationId: 'ws-baia-07',
      researcherName: 'Jomil Costa',
      researcherRole: 'Pós-Doc',
      startTime: getISOForToday(jcStartHour, 0),
      endTime: getISOForToday(jcEndHour === 24 ? 23 : jcEndHour, jcEndHour === 24 ? 59 : 0),
      type: 'scheduled',
      status: 'active',
      checkedInAt: getISOForToday(jcStartHour, 0),
      isNonFairUse: true,
      nonFairUseThreshold: getISOForToday(jcThresholdHour, 0),
      nonFairUseReasons: [
        `Duração de 18h contínuas ultrapassa o limite diário de 12h do laboratório. O trecho a partir das ${jcThresholdHour}:00 é excedente.`,
      ],
      notes: 'Pipeline de simulação pesada. A partir das 18h posso pausar e ceder caso outro colega precise no WhatsApp.',
      createdAt: getISOForToday(jcStartHour, 0),
    },

    // Baia 07: Francisca Pereira (Tomorrow morning)
    {
      id: 'res-tomorrow-baia7-francisca',
      workstationId: 'ws-baia-07',
      researcherName: 'Francisca Pereira',
      researcherRole: 'Pós-Doc',
      startTime: getISOForDayOffset(1, 8, 30),
      endTime: getISOForDayOffset(1, 12, 30),
      type: 'scheduled',
      status: 'active',
      notes: 'Simulação numérica de dinâmica de fluidos.',
      createdAt: getISOForDayOffset(-1, 14, 0),
    },

    // Baia 07: Matheus Ferreira (Day after tomorrow)
    {
      id: 'res-dayafter-baia7-matheus-prof',
      workstationId: 'ws-baia-07',
      researcherName: 'Matheus Ferreira',
      researcherRole: 'Professor',
      startTime: getISOForDayOffset(2, 9, 0),
      endTime: getISOForDayOffset(2, 14, 0),
      type: 'scheduled',
      status: 'active',
      notes: 'Processamento de dados de bancada.',
      createdAt: getISOForDayOffset(-1, 16, 0),
    },
  ];
};
