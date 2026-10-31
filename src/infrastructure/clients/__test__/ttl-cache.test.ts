import { describe, it, expect } from '@jest/globals';
import { TtlCache } from '../ttl-cache';

describe('TtlCache (CONTRATOS §3: caché de access 60 s)', () => {
  it('devuelve el valor dentro del TTL y lo olvida al vencer', () => {
    let now = 0;
    const cache = new TtlCache<string>(60_000, () => now);

    cache.set('k', 'v');
    now = 59_999;
    expect(cache.get('k')).toBe('v');

    now = 60_000;
    expect(cache.get('k')).toBeUndefined();
  });

  it('clear vacía todas las entradas', () => {
    const cache = new TtlCache<number>();
    cache.set('a', 1);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
  });
});
