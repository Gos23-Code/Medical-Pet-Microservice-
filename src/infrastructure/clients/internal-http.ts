import { ServiceUnavailableError } from '@/src/infrastructure/http/api-error';

// CONTRATOS_COMPARTIDOS.md §2: timeout de 3 s y, si el servicio no responde, 503. Nunca "dejar pasar".

export const INTERNAL_TIMEOUT_MS = 3_000;

/** Pide JSON a otro microservicio con la API key interna. Cualquier fallo se convierte en 503. */
export async function internalGet<T>(url: string): Promise<T> {
  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey) {
    throw new ServiceUnavailableError('Falta INTERNAL_API_KEY para llamar a otro servicio');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'X-Internal-Api-Key': apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(INTERNAL_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch {
    throw new ServiceUnavailableError();
  }

  if (!response.ok) {
    throw new ServiceUnavailableError(`Servicio interno respondió ${response.status}`);
  }
  return (await response.json()) as T;
}

export function requireServiceUrl(name: 'PETS_SERVICE_URL' | 'VETERINARY_SERVICE_URL'): string {
  const value = process.env[name];
  if (!value) {
    throw new ServiceUnavailableError(`Falta la variable ${name}`);
  }
  return value.replace(/\/$/, '');
}
