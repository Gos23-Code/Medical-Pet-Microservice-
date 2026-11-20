import { PetHealthRepository, PetDewormingRecord, PetAllergyRecord } from '@/src/domain/repositories/pet-health.repository';
import { groupVersions, toAllergyView, toDewormingView, AllergyView, DewormingView } from '@/src/application/clinical/pet-health/pet-health-view';

// Piezas compartidas por los casos de uso de datos clínicos de la mascota.

/** Quién escribe. Sale del token y de la autorización (authorizePet), nunca del body. */
export interface PetHealthWriter {
  source: 'OWNER' | 'CLINIC';
  veterinaryId: string | null;
  employeeId: string | null;
  userId: string;
}

/** Puerto de auditoría (MED-05). SupabaseClinicalAuditRepository lo cumple. */
export interface PetHealthAuditPort {
  record(entry: {
    tableName: string;
    recordId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    actorUserId: string;
    veterinaryId: string | null;
    changes?: Record<string, { from: unknown; to: unknown }> | null;
  }): Promise<void>;
}

export async function loadAllergyViews(repository: PetHealthRepository, petId: string): Promise<AllergyView[]> {
  const rows: PetAllergyRecord[] = await repository.findAllergiesByPet(petId);
  if (rows.length === 0) return [];
  const versions = groupVersions(await repository.listVersions('pet_allergies', rows.map((r) => r.id)));
  return rows.map((row) => toAllergyView(row, versions.get(row.id) ?? []));
}

export async function loadDewormingViews(repository: PetHealthRepository, petId: string): Promise<DewormingView[]> {
  const rows: PetDewormingRecord[] = await repository.findDewormingsByPet(petId);
  if (rows.length === 0) return [];
  const versions = groupVersions(await repository.listVersions('pet_dewormings', rows.map((r) => r.id)));
  return rows.map((row) => toDewormingView(row, versions.get(row.id) ?? []));
}
