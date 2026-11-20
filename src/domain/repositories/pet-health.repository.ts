// Puerto de los datos clínicos de la mascota: alergias, desparasitaciones y perfil (estado).
// Las correcciones de alergias y dosis usan el puerto ClinicalCorrectionRepository (versiones).

export interface PetAllergyRecord {
  id: string;
  petId: string;
  allergen: string;
  category: string;
  reaction: string | null;
  severity: string;
  /** Estado con que se creó la fila. El actual sale de las versiones. */
  status: string;
  notes: string | null;
  source: 'OWNER' | 'CLINIC';
  createdByUserId: string;
  veterinaryId: string | null;
  employeeId: string | null;
  createdAt: string;
}

export type NewPetAllergy = Omit<PetAllergyRecord, 'id' | 'createdAt'>;

export interface PetDewormingRecord {
  id: string;
  petId: string;
  kind: string;
  product: string;
  activeIngredient: string | null;
  dose: string | null;
  weightKg: number | null;
  applicationDate: string;
  notes: string | null;
  status: string;
  source: 'OWNER' | 'CLINIC';
  createdByUserId: string;
  veterinaryId: string | null;
  employeeId: string | null;
  createdAt: string;
}

export type NewPetDeworming = Omit<PetDewormingRecord, 'id' | 'createdAt' | 'status'>;

export interface PetClinicalProfile {
  petId: string;
  allergyStatus: 'UNKNOWN' | 'NONE_KNOWN';
  allergyStatusSource: 'OWNER' | 'CLINIC' | null;
  allergyStatusUserId: string | null;
  allergyStatusVeterinaryId: string | null;
  neuteredStatus: 'YES' | 'NO' | 'UNKNOWN';
  neuteredAt: string | null;
  neuteredSource: 'OWNER' | 'CLINIC' | null;
  neuteredUserId: string | null;
  neuteredVeterinaryId: string | null;
  /** Lo llena la clínica cuando verifica el dato. Si el dueño lo cambia, se limpia. */
  neuteredConfirmedEmployeeId: string | null;
  neuteredConfirmedAt: string | null;
}

export function emptyClinicalProfile(petId: string): PetClinicalProfile {
  return {
    petId,
    allergyStatus: 'UNKNOWN',
    allergyStatusSource: null,
    allergyStatusUserId: null,
    allergyStatusVeterinaryId: null,
    neuteredStatus: 'UNKNOWN',
    neuteredAt: null,
    neuteredSource: null,
    neuteredUserId: null,
    neuteredVeterinaryId: null,
    neuteredConfirmedEmployeeId: null,
    neuteredConfirmedAt: null,
  };
}

export type PetHealthTable = 'pet_allergies' | 'pet_dewormings';

export interface PetHealthVersionRow {
  recordId: string;
  version: number;
  values: Record<string, unknown>;
  authorUserId: string;
  veterinaryId: string | null;
  authorRole: 'OWNER' | 'CLINIC';
  createdAt: string;
}

export interface PetHealthRepository {
  insertAllergy(allergy: NewPetAllergy): Promise<string>;
  findAllergyById(id: string): Promise<PetAllergyRecord | null>;
  findAllergiesByPet(petId: string): Promise<PetAllergyRecord[]>;

  insertDeworming(deworming: NewPetDeworming): Promise<string>;
  findDewormingById(id: string): Promise<PetDewormingRecord | null>;
  findDewormingsByPet(petId: string): Promise<PetDewormingRecord[]>;

  findProfile(petId: string): Promise<PetClinicalProfile | null>;
  saveProfile(profile: PetClinicalProfile): Promise<void>;

  /** Versiones de varias filas de una tabla de salud, en una sola consulta. */
  listVersions(table: PetHealthTable, recordIds: string[]): Promise<PetHealthVersionRow[]>;
}
