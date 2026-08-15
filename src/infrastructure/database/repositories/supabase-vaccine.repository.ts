// src/infrastructure/supabase/vaccine.repository.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Vaccine, CreateVaccineData, UpdateVaccineData } from '@/src/domain/entities/vaccine.entity';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { VaccineName } from '@/src/domain/value-objects/vaccine-name.vo';
import { NextDoseDate } from '@/src/domain/value-objects/next-dosage.vo';

// Definir los tipos para la tabla de vacunas en Supabase
interface VaccineSupabaseRecord {
  id: string;
  pet_id: string;
  name: string;
  lot_number: string | null;
  application_date: string;
  next_dose_date: string | null;
  veterinarian: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type VaccineInsertRecord = Omit<VaccineSupabaseRecord, 'id' | 'created_at' | 'updated_at'>;
type VaccineUpdateRecord = Partial<VaccineInsertRecord>;

export class VaccineRepository implements IVaccineRepository {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async addVaccine(vaccineData: CreateVaccineData): Promise<Vaccine> {
    const insertData: VaccineInsertRecord = {
      pet_id: vaccineData.petId,
      name: vaccineData.name,
      lot_number: vaccineData.lotNumber,
      application_date: vaccineData.applicationDate.toISOString().split('T')[0],
      next_dose_date: vaccineData.nextDoseDate?.toISOString().split('T')[0] || null,
      veterinarian: vaccineData.veterinarian,
      notes: vaccineData.notes
    };

    const { data, error } = await this.supabase
      .from('vaccines')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`Error al agregar vacuna: ${error.message}`);
    if (!data) throw new Error('No se recibieron datos al agregar la vacuna');

    return this.mapToVaccine(data as VaccineSupabaseRecord);
  }

  async getByPetId(petId: string): Promise<Vaccine[]> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .select('*')
      .eq('pet_id', petId)
      .order('application_date', { ascending: false });

    if (error) throw new Error(`Error al obtener vacunas: ${error.message}`);
    if (!data) return [];

    return data.map((record: VaccineSupabaseRecord) => this.mapToVaccine(record));
  }

  async updateVaccine(id: string, vaccineData: UpdateVaccineData): Promise<Vaccine> {
    const updatePayload: VaccineUpdateRecord = {};

    if (vaccineData.petId !== undefined) updatePayload.pet_id = vaccineData.petId;
    if (vaccineData.name !== undefined) updatePayload.name = vaccineData.name;
    if (vaccineData.lotNumber !== undefined) {
      updatePayload.lot_number = vaccineData.lotNumber;
    }
    if (vaccineData.applicationDate !== undefined) {
      updatePayload.application_date = vaccineData.applicationDate.toISOString().split('T')[0];
    }
    if (vaccineData.nextDoseDate !== undefined) {
      updatePayload.next_dose_date = vaccineData.nextDoseDate?.toISOString().split('T')[0] || null;
    }
    if (vaccineData.veterinarian !== undefined) {
      updatePayload.veterinarian = vaccineData.veterinarian;
    }
    if (vaccineData.notes !== undefined) {
      updatePayload.notes = vaccineData.notes;
    }

    const { data, error } = await this.supabase
      .from('vaccines')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar vacuna: ${error.message}`);
    if (!data) throw new Error('No se recibieron datos al actualizar la vacuna');

    return this.mapToVaccine(data as VaccineSupabaseRecord);
  }

  async deleteVaccine(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('vaccines')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Error al eliminar vacuna: ${error.message}`);
  }

  async getById(id: string): Promise<Vaccine | null> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error al obtener vacuna: ${error.message}`);
    }

    if (!data) return null;

    return this.mapToVaccine(data as VaccineSupabaseRecord);
  }

  private mapToVaccine(data: VaccineSupabaseRecord): Vaccine {
    // Crear los Value Objects
    const name = VaccineName.create(data.name);
    const applicationDate = new Date(data.application_date);
    const nextDoseDate = NextDoseDate.create(
      data.next_dose_date ? new Date(data.next_dose_date) : null,
      applicationDate
    );

    // Usar el factory method de Vaccine
    return Vaccine.create(
      data.id,
      data.pet_id,
      name.value, 
      data.lot_number,
      applicationDate,
      nextDoseDate.toDate(), 
      data.veterinarian,
      data.notes,
      new Date(data.created_at)
    );
  }
}