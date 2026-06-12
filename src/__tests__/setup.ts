// src/__tests__/setup.ts
import '@testing-library/jest-dom';

// Mock de console para pruebas silenciosas
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  configurable: true,
  writable: true,
});

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock de crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    ...global.crypto,
    randomUUID: () => 'test-uuid-1234-5678-90ab-cdef',
  },
  configurable: true,
  writable: true,
});

// Timeout global para pruebas
jest.setTimeout(10000);