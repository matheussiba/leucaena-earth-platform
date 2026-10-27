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

export interface AzimuthCaptureResult {
  sucesso: boolean;
  azimute?: number;
  mensagemErro?: string;
}

/**
 * Lê o azimute (0–360°, do Norte, sentido horário) para onde o aparelho está apontando.
 * Usa DeviceOrientation / bússola nativa (requer permissão no iOS).
 */
export async function capturarAzimuteBussola(): Promise<AzimuthCaptureResult> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
    return {
      sucesso: false,
      mensagemErro: 'Bússola/orientação não disponível neste dispositivo ou navegador.',
    };
  }

  const DOE = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
  };
  if (typeof DOE.requestPermission === 'function') {
    try {
      const perm = await DOE.requestPermission();
      if (perm !== 'granted') {
        return {
          sucesso: false,
          mensagemErro: 'Permissão de orientação/bússola negada. Ative nas configurações do navegador.',
        };
      }
    } catch {
      return {
        sucesso: false,
        mensagemErro: 'Não foi possível solicitar permissão da bússola.',
      };
    }
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: AzimuthCaptureResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('deviceorientationabsolute', onOrient as EventListener);
      window.removeEventListener('deviceorientation', onOrient as EventListener);
      resolve(result);
    };

    const onOrient = (event: Event) => {
      const e = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
      let heading: number | null = null;

      if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) {
        heading = e.webkitCompassHeading;
      } else if (e.alpha != null && !isNaN(e.alpha)) {
        // alpha absoluto: 0 ≈ Norte; conversão para heading de bússola
        heading = e.absolute ? (360 - e.alpha) % 360 : (360 - e.alpha) % 360;
      }

      if (heading == null) return;
      if (heading < 0) heading = (heading + 360) % 360;
      finish({
        sucesso: true,
        azimute: Math.round(heading * 10) / 10,
      });
    };

    window.addEventListener('deviceorientationabsolute', onOrient as EventListener);
    window.addEventListener('deviceorientation', onOrient as EventListener);

    setTimeout(() => {
      finish({
        sucesso: false,
        mensagemErro:
          'Não foi possível ler a bússola a tempo. Aponte o aparelho na horizontal e tente de novo.',
      });
    }, 6000);
  });
}
