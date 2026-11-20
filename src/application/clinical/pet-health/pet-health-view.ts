import { PetAllergyRecord, PetDewormingRecord, PetHealthVersionRow } from '@/src/domain/repositories/pet-health.repository';
import { isActiveAllergy } from './allergy-rules';
import { DewormingKind } from './deworming-rules';
import { currentValues, lastVersionWhere, sortVersions, VersionRecord } from './current-version';

// Forma que ve el cliente: fila original + correcciones aplicadas, con autoría y fecha.

export interface Author {
  userId: string;
  veterinaryId: string | null;
  at: string;
}

export interface AllergyView {
  id: string;
  petId: string;
  allergen: string;
  category: string;
  reaction: string | null;
  severity: string;
  status: string;
  notes: string | null;
  source: 'OWNER' | 'CLINIC';
  recordedBy: Author;
  /** Quién la confirmó: la clínica que la registró, o la clínica que confirmó la declaración del dueño. */
  confirmedBy: Author | null;
  isActive: boolean;
  /** Número de correcciones aplicadas (0 si nunca se corrigió). */
  correctionCount: number;
}

export function toAllergyView(row: PetAllergyRecord, versions: VersionRecord[]): AllergyView {
  const current = currentValues(
    {
      allergen: row.allergen,
      category: row.category,
      reaction: row.reaction,
      severity: row.severity,
      status: row.status,
      notes: row.notes,
    },
    versions
  );

  let confirmedBy: Author | null = null;
  if (row.source === 'CLINIC') {
    // Una clínica la registró ya confirmada: confirma ella misma
    confirmedBy = { userId: row.createdByUserId, veterinaryId: row.veterinaryId, at: row.createdAt };
  } else {
    const confirmation = lastVersionWhere(versions, (v) => v.values.status === 'CONFIRMED');
    if (confirmation) {
      confirmedBy = { userId: confirmation.authorUserId, veterinaryId: confirmation.veterinaryId, at: confirmation.createdAt };
    }
  }

  return {
    id: row.id,
    petId: row.petId,
    allergen: String(current.allergen),
    category: String(current.category),
    reaction: (current.reaction as string | null) ?? null,
    severity: String(current.severity),
    status: String(current.status),
    notes: (current.notes as string | null) ?? null,
    source: row.source,
    recordedBy: { userId: row.createdByUserId, veterinaryId: row.veterinaryId, at: row.createdAt },
    confirmedBy,
    isActive: isActiveAllergy(String(current.status)),
    correctionCount: versions.length,
  };
}

export interface DewormingView {
  id: string;
  petId: string;
  kind: DewormingKind;
  product: string;
  activeIngredient: string | null;
  dose: string | null;
  weightKg: number | null;
  applicationDate: string;
  notes: string | null;
  status: 'ACTIVE' | 'ENTERED_IN_ERROR';
  source: 'OWNER' | 'CLINIC';
  recordedBy: Author;
  correctionCount: number;
}

export function toDewormingView(row: PetDewormingRecord, versions: VersionRecord[]): DewormingView {
  const current = currentValues(
    {
      kind: row.kind,
      product: row.product,
      activeIngredient: row.activeIngredient,
      dose: row.dose,
      weightKg: row.weightKg,
      applicationDate: row.applicationDate,
      notes: row.notes,
      status: row.status,
    },
    versions
  );

  return {
    id: row.id,
    petId: row.petId,
    kind: current.kind as DewormingKind,
    product: String(current.product),
    activeIngredient: (current.activeIngredient as string | null) ?? null,
    dose: (current.dose as string | null) ?? null,
    weightKg: (current.weightKg as number | null) ?? null,
    applicationDate: String(current.applicationDate),
    notes: (current.notes as string | null) ?? null,
    status: current.status as 'ACTIVE' | 'ENTERED_IN_ERROR',
    source: row.source,
    recordedBy: { userId: row.createdByUserId, veterinaryId: row.veterinaryId, at: row.createdAt },
    correctionCount: versions.length,
  };
}

export interface KindSummary {
  /** true si hay al menos una dosis activa de este tipo. */
  registered: boolean;
  /** Fecha de la última dosis activa de este tipo, o null. */
  lastApplicationDate: string | null;
}

/** Resumen por tipo (interna y externa): la dosis activa más reciente. */
export function summarizeDewormings(views: DewormingView[]): Record<DewormingKind, KindSummary> {
  const summarize = (kind: DewormingKind): KindSummary => {
    const latest = views
      .filter((v) => v.kind === kind && v.status === 'ACTIVE')
      .sort((a, b) => (a.applicationDate < b.applicationDate ? 1 : -1))[0];

    return latest
      ? { registered: true, lastApplicationDate: latest.applicationDate }
      : { registered: false, lastApplicationDate: null };
  };
  return { INTERNAL: summarize('INTERNAL'), EXTERNAL: summarize('EXTERNAL') };
}

/** Agrupa las versiones por fila, en orden de versión. */
export function groupVersions(rows: PetHealthVersionRow[]): Map<string, VersionRecord[]> {
  const grouped = new Map<string, VersionRecord[]>();
  for (const row of rows) {
    const list = grouped.get(row.recordId) ?? [];
    list.push({
      version: row.version,
      values: row.values,
      authorUserId: row.authorUserId,
      veterinaryId: row.veterinaryId,
      authorRole: row.authorRole,
      createdAt: row.createdAt,
    });
    grouped.set(row.recordId, list);
  }
  for (const [key, list] of grouped) {
    grouped.set(key, sortVersions(list));
  }
  return grouped;
}
