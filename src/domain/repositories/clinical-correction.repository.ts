import { ActRef } from '@/src/application/clinical/act-integrity';

// Puerto de correcciones. No tiene método de UPDATE: un acto nunca se sobrescribe.
// La implementación escribe la versión y la auditoría en una sola transacción (función SQL).

/** Tablas de actos clínicos que admiten correcciones (db/scripts/005_integridad_actos.sql). */
export const CORRECTABLE_TABLES = [
  'vaccines',
  'veterinary_visits',
  'treatments',
  'medications',
  'lab_tests',
  'pet_surgeries',
  'WeightRecord',
  'pet_allergies',
  'pet_dewormings',
] as const;
export type CorrectableTable = (typeof CORRECTABLE_TABLES)[number];

export interface ClinicalVersion {
  version: number;
  kind: 'CORRECTION' | 'ANNULMENT';
  values: Record<string, unknown>;
  reason: string;
  authorUserId: string;
  authorEmployeeId: string | null;
  veterinaryId: string | null;
  authorRole: 'OWNER' | 'CLINIC';
  createdAt: string;
}

export interface ApplyCorrectionInput {
  table: CorrectableTable;
  recordId: string;
  reason: string;
  values: Record<string, unknown>;
  authorUserId: string;
  authorEmployeeId: string | null;
  veterinaryId: string | null;
  authorRole: 'OWNER' | 'CLINIC';
}

export interface ClinicalCorrectionRepository {
  /** Datos de integridad de la fila original (quién la registró y de qué clínica). */
  getActRef(table: CorrectableTable, recordId: string): Promise<ActRef | null>;
  /** Crea la versión y la auditoría en una transacción. Devuelve el número de versión. */
  applyCorrection(input: ApplyCorrectionInput): Promise<number>;
  /** Versiones de un acto, de la más antigua a la más nueva. */
  listVersions(table: CorrectableTable, recordId: string): Promise<ClinicalVersion[]>;
}
