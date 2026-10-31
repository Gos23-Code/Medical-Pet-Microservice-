import { createClient } from '@/src/infrastructure/database/supabase/client';

// MED-05: toda escritura clínica deja rastro en `clinical_audit_log` (ver db/scripts/002_*.sql).

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditEntry {
  tableName: string;
  recordId: string;
  action: AuditAction;
  actorUserId: string;
  veterinaryId: string | null;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
}

/**
 * Antes/después de los campos que cambiaron en un UPDATE. Solo entra lo que de verdad cambió,
 * para que el log sea legible y no guarde la historia completa dos veces.
 */
export function buildChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (after[key] === undefined) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { from: before[key] ?? null, to: after[key] };
    }
  }
  return changes;
}

export class SupabaseClinicalAuditRepository {
  constructor(private readonly supabase = createClient()) {}

  /**
   * Escribe el rastro. Si falla, se registra en log y NO se revierte la escritura:
   * supabase-js no ofrece transacciones entre tablas (limitación documentada en AGENTS.md).
   */
  async record(entry: AuditEntry): Promise<void> {
    const { error } = await this.supabase.from('clinical_audit_log').insert([
      {
        table_name: entry.tableName,
        record_id: entry.recordId,
        action: entry.action,
        actor_user_id: entry.actorUserId,
        veterinary_id: entry.veterinaryId,
        changes: entry.changes ?? null,
      },
    ]);

    if (error) {
      console.error('❌ No se pudo escribir clinical_audit_log:', error, entry);
    }
  }
}
