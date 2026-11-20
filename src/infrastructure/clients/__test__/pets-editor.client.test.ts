import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { isPetEditor, clearPetsCache } from '../pets.client';

// Pets aún no publica GET /internal/pets/{id}/access/{userId}: un 404 debe denegar, nunca abrir.
const originalFetch = global.fetch;
const originalUrl = process.env.PETS_SERVICE_URL;
const originalKey = process.env.INTERNAL_API_KEY;

describe('isPetEditor', () => {
  beforeEach(() => {
    clearPetsCache();
    process.env.PETS_SERVICE_URL = 'https://pets.test';
    process.env.INTERNAL_API_KEY = 'clave-test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.PETS_SERVICE_URL = originalUrl;
    process.env.INTERNAL_API_KEY = originalKey;
  });

  it('positivo: con hasAccess true en la respuesta, es editor', async () => {
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ hasAccess: true }), { status: 200 })) as typeof fetch;
    await expect(isPetEditor('pet-1', 'editor-1')).resolves.toBe(true);
  });

  it('negativo: si la ruta responde 404 (no publicada), se deniega', async () => {
    global.fetch = jest.fn(async () => new Response('{"error":"Ruta no encontrada"}', { status: 404 })) as typeof fetch;
    await expect(isPetEditor('pet-1', 'stranger-1')).resolves.toBe(false);
  });

  it('negativo: un error real de Pets (500) responde 503, nunca abre el acceso', async () => {
    global.fetch = jest.fn(async () => new Response('{}', { status: 500 })) as typeof fetch;
    await expect(isPetEditor('pet-1', 'editor-1')).rejects.toMatchObject({ status: 503 });
  });

  it('negativo: sin respuesta de Pets (red caída) responde 503', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as typeof fetch;
    await expect(isPetEditor('pet-1', 'editor-1')).rejects.toMatchObject({ status: 503 });
  });
});
