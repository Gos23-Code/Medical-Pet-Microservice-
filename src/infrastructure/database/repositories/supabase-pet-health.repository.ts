import { createClient } from '@/src/infrastructure/database/supabase/client';
import {
  NewPetAllergy,
  NewPetDeworming,
  PetAllergyRecord,
  PetClinicalProfile,
  PetDewormingRecord,
  PetHealthRepository,
  PetHealthTable,
  PetHealthVersionRow,
} from '@/src/domain/repositories/pet-health.repository';

// Tablas pet_allergies, pet_dewormings y pet_clinical_profile (db/scripts/006_datos_clinicos_mascota.sql).
// Las filas originales de alergias y dosis no tienen UPDATE: el estado actual llega por versiones.

type Row = Record<string, unknown>;

function toAllergy(row: Row): PetAllergyRecord {
  return {
    id: row.id as string,
    petId: row.pet_id as string,
    allergen: row.allergen as string,
    category: row.category as string,
    reaction: (row.reaction as string | null) ?? null,
    severity: row.severity as string,
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
    source: row.source as 'OWNER' | 'CLINIC',
    createdByUserId: row.created_by_user_id as string,
    veterinaryId: (row.veterinary_id as string | null) ?? null,
    employeeId: (row.employee_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function toDeworming(row: Row): PetDewormingRecord {
  return {
    id: row.id as string,
    petId: row.pet_id as string,
    kind: row.kind as string,
    product: row.product as string,
    activeIngredient: (row.active_ingredient as string | null) ?? null,
    dose: (row.dose as string | null) ?? null,
    weightKg: row.weight_kg === null || row.weight_kg === undefined ? null : Number(row.weight_kg),
    applicationDate: row.application_date as string,
    notes: (row.notes as string | null) ?? null,
    status: row.status as string,
    source: row.source as 'OWNER' | 'CLINIC',
    createdByUserId: row.created_by_user_id as string,
    veterinaryId: (row.veterinary_id as string | null) ?? null,
    employeeId: (row.employee_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function toProfile(row: Row): PetClinicalProfile {
  return {
    petId: row.pet_id as string,
    allergyStatus: row.allergy_status as 'UNKNOWN' | 'NONE_KNOWN',
    allergyStatusSource: (row.allergy_status_source as 'OWNER' | 'CLINIC' | null) ?? null,
    allergyStatusUserId: (row.allergy_status_user_id as string | null) ?? null,
    allergyStatusVeterinaryId: (row.allergy_status_veterinary_id as string | null) ?? null,
    neuteredStatus: row.neutered_status as 'YES' | 'NO' | 'UNKNOWN',
    neuteredAt: (row.neutered_at as string | null) ?? null,
    neuteredSource: (row.neutered_source as 'OWNER' | 'CLINIC' | null) ?? null,
    neuteredUserId: (row.neutered_user_id as string | null) ?? null,
    neuteredVeterinaryId: (row.neutered_veterinary_id as string | null) ?? null,
    neuteredConfirmedEmployeeId: (row.neutered_confirmed_employee_id as string | null) ?? null,
    neuteredConfirmedAt: (row.neutered_confirmed_at as string | null) ?? null,
  };
}

function check(error: { message: string } | null, action: string): void {
  if (error) {
    throw new Error(`Error ${action}: ${error.message}`);
  }
}

export class SupabasePetHealthRepository implements PetHealthRepository {
  constructor(private readonly supabase = createClient()) {}

  async insertAllergy(allergy: NewPetAllergy): Promise<string> {
    const { data, error } = await this.supabase
      .from('pet_allergies')
      .insert({
        pet_id: allergy.petId,
        allergen: allergy.allergen,
        category: allergy.category,
        reaction: allergy.reaction,
        severity: allergy.severity,
        status: allergy.status,
        notes: allergy.notes,
        source: allergy.source,
        created_by_user_id: allergy.createdByUserId,
        veterinary_id: allergy.veterinaryId,
        employee_id: allergy.employeeId,
      })
      .select('id')
      .single();
    check(error, 'guardando la alergia');
    return (data as { id: string }).id;
  }

  async findAllergyById(id: string): Promise<PetAllergyRecord | null> {
    const { data, error } = await this.supabase.from('pet_allergies').select('*').eq('id', id).maybeSingle();
    check(error, 'leyendo la alergia');
    return data ? toAllergy(data as Row) : null;
  }

  async findAllergiesByPet(petId: string): Promise<PetAllergyRecord[]> {
    const { data, error } = await this.supabase
      .from('pet_allergies')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: true });
    check(error, 'leyendo las alergias');
    return (data ?? []).map((row) => toAllergy(row as Row));
  }

  async insertDeworming(deworming: NewPetDeworming): Promise<string> {
    const { data, error } = await this.supabase
      .from('pet_dewormings')
      .insert({
        pet_id: deworming.petId,
        kind: deworming.kind,
        product: deworming.product,
        active_ingredient: deworming.activeIngredient,
        dose: deworming.dose,
        weight_kg: deworming.weightKg,
        application_date: deworming.applicationDate,
        notes: deworming.notes,
        source: deworming.source,
        created_by_user_id: deworming.createdByUserId,
        veterinary_id: deworming.veterinaryId,
        employee_id: deworming.employeeId,
      })
      .select('id')
      .single();
    check(error, 'guardando la desparasitación');
    return (data as { id: string }).id;
  }

  async findDewormingById(id: string): Promise<PetDewormingRecord | null> {
    const { data, error } = await this.supabase.from('pet_dewormings').select('*').eq('id', id).maybeSingle();
    check(error, 'leyendo la desparasitación');
    return data ? toDeworming(data as Row) : null;
  }

  async findDewormingsByPet(petId: string): Promise<PetDewormingRecord[]> {
    const { data, error } = await this.supabase
      .from('pet_dewormings')
      .select('*')
      .eq('pet_id', petId)
      .order('application_date', { ascending: true });
    check(error, 'leyendo las desparasitaciones');
    return (data ?? []).map((row) => toDeworming(row as Row));
  }

  async findProfile(petId: string): Promise<PetClinicalProfile | null> {
    const { data, error } = await this.supabase
      .from('pet_clinical_profile')
      .select('*')
      .eq('pet_id', petId)
      .maybeSingle();
    check(error, 'leyendo el perfil clínico');
    return data ? toProfile(data as Row) : null;
  }

  async saveProfile(profile: PetClinicalProfile): Promise<void> {
    const { error } = await this.supabase.from('pet_clinical_profile').upsert(
      {
        pet_id: profile.petId,
        allergy_status: profile.allergyStatus,
        allergy_status_source: profile.allergyStatusSource,
        allergy_status_user_id: profile.allergyStatusUserId,
        allergy_status_veterinary_id: profile.allergyStatusVeterinaryId,
        neutered_status: profile.neuteredStatus,
        neutered_at: profile.neuteredAt,
        neutered_source: profile.neuteredSource,
        neutered_user_id: profile.neuteredUserId,
        neutered_veterinary_id: profile.neuteredVeterinaryId,
        neutered_confirmed_employee_id: profile.neuteredConfirmedEmployeeId,
        neutered_confirmed_at: profile.neuteredConfirmedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pet_id' }
    );
    check(error, 'guardando el perfil clínico');
  }

  async listVersions(table: PetHealthTable, recordIds: string[]): Promise<PetHealthVersionRow[]> {
    if (recordIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from('clinical_record_versions')
      .select('record_id, version, values, author_user_id, veterinary_id, author_role, created_at')
      .eq('record_table', table)
      .in('record_id', recordIds)
      .order('version', { ascending: true });
    check(error, 'leyendo las versiones');

    return (data ?? []).map((row) => ({
      recordId: row.record_id as string,
      version: row.version as number,
      values: row.values as Record<string, unknown>,
      authorUserId: row.author_user_id as string,
      veterinaryId: (row.veterinary_id as string | null) ?? null,
      authorRole: row.author_role as 'OWNER' | 'CLINIC',
      createdAt: row.created_at as string,
    }));
  }
}
