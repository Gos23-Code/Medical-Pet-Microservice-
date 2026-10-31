// Caché en memoria con vencimiento. Lo usan los clientes de Pets y Veterinary:
// CONTRATOS_COMPARTIDOS.md §3 permite cachear `access` 60 s por (clínica, mascota, usuario).

export const ACCESS_CACHE_TTL_MS = 60_000;

export class TtlCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number = ACCESS_CACHE_TTL_MS,
    private readonly now: () => number = () => Date.now()
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  clear(): void {
    this.entries.clear();
  }
}
