import { describe, it, expect, afterEach } from '@jest/globals';
import { serverSupabaseKey } from '../server-key';

describe('serverSupabaseKey', () => {
  const originalService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalService;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
  });

  it('prefiere la service role key cuando existe', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    expect(serverSupabaseKey()).toBe('service-key');
  });

  it('usa la anon key como respaldo si falta la service role key', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    expect(serverSupabaseKey()).toBe('anon-key');
  });

  it('falla de forma explícita si no hay ninguna de las dos', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => serverSupabaseKey()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
