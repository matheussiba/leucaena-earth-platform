// Módulo de Geolocalização nativa para o Inventário Florestal ESALQ/USP — CMQ
import { GeoPoint, PlotCoordinates } from './types';

export interface GpsCaptureResult {
  sucesso: boolean;
  ponto?: GeoPoint;
  mensagemErro?: string;
  codigoErro?: number;
}

/**
 * Captura um ponto geográfico utilizando a API nativa navigator.geolocation.
 * Utiliza enableHighAccuracy para maximizar a precisão sob dossel florestal.
 */
export async function capturarPontoGPS(rotulo = 'Ponto de Coleta'): Promise<GpsCaptureResult> {
  if (!navigator.geolocation) {
    return {
      sucesso: false,
      mensagemErro:
        'A API de Geolocalização não é suportada por este navegador. Você pode inserir as coordenadas manualmente.',
    };
  }

  // Verifica se o contexto é seguro (HTTPS ou localhost)
  if (window.isSecureContext === false) {
    return {
      sucesso: false,
      mensagemErro:
        'Acesso ao GPS requer contexto seguro (HTTPS). No campo, certifique-se de acessar via HTTPS ou informe as coordenadas manualmente.',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords;
        const ponto: GeoPoint = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude: coords.altitude !== null ? coords.altitude : null,
          precisao: coords.accuracy !== null ? coords.accuracy : null,
          dataHora: new Date(position.timestamp).toISOString(),
          rotulo,
        };
        resolve({
          sucesso: true,
          ponto,
        });
      },
      (error) => {
        let msg = 'Erro ao obter sinal de satélite.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Permissão de localização negada pelo usuário. Conceda permissão no navegador ou insira manualmente.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Sinal de GPS indisponível no momento. Sob dossel florestal denso, aguarde alguns instantes a céu aberto ou insira manualmente.';
            break;
          case error.TIMEOUT:
            msg = 'Tempo limite esgotado ao buscar sinal de GPS. Tente novamente em área mais aberta.';
            break;
        }
        resolve({
          sucesso: false,
          mensagemErro: msg,
          codigoErro: error.code,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      }
    );
  });
}

/**
 * Converte coordenadas decimais para formato legível (Graus Minutos Segundos e Decimal).
 */
export function formatarCoordenada(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
}

/**
 * Helper para validar se o objeto de coordenadas possui ao menos um ponto registrado.
 */
export function temCoordenadasRegistradas(coords: PlotCoordinates | undefined | null): boolean {
  if (!coords) return false;
  if (coords.tipo === 'centro' && coords.centro) return true;
  if (coords.tipo === 'cantos' && coords.cantos && coords.cantos.length > 0) return true;
  if (coords.tipo === 'manual' && (coords.centro || (coords.cantos && coords.cantos.length > 0))) return true;
  return false;
}

/**
 * Destino geodésico a partir de um ponto, azimute (graus a partir do Norte, horário) e distância (m).
 * Adequado a distâncias curtas dentro de parcelas amostrais.
 */
export function destinoPorAzimuteDistancia(
  latDeg: number,
  lngDeg: number,
  azimuteDeg: number,
  distanciaM: number
): { latitude: number; longitude: number } {
  const R = 6378137; // raio WGS84 aproximado (m)
  const δ = distanciaM / R;
  const θ = (azimuteDeg * Math.PI) / 180;
  const φ1 = (latDeg * Math.PI) / 180;
  const λ1 = (lngDeg * Math.PI) / 180;

  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return {
    latitude: (φ2 * 180) / Math.PI,
    longitude: (((λ2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  return navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches;
}

