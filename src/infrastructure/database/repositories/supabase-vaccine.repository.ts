// src/infrastructure/supabase/vaccine.repository.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Vaccine, CreateVaccineData, VaccineStatus } from '@/src/domain/entities/vaccine.entity';
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';
import { VaccineName } from '@/src/domain/value-objects/vaccine-name.vo';
import { NextDoseDate } from '@/src/domain/value-objects/next-dosage.vo';

// ✅ Interfaz para datos de actualización (sin userId)
export interface VaccineUpdatePayload {
  petId?: string;
  name?: string;
  lotNumber?: string | null;
  applicationDate?: Date;
  nextDoseDate?: Date | null;
  veterinarian?: string | null;
  notes?: string | null;
  status?: VaccineStatus | string;
}

// ✅ Interfaz para el registro de Supabase (SIN user_id)
interface VaccineSupabaseRecord {
  id: string;
  pet_id: string;
  // ❌ user_id: string;  // ELIMINADO
  name: string;
  lot_number: string | null;
  application_date: string;
  next_dose_date: string | null;
  veterinarian: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  reminder_count: number;
  last_reminder_sent_at: string | null;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDoseDate = vaccineData.nextDoseDate ? new Date(vaccineData.nextDoseDate) : null;
    let initialStatus = 'PENDIENTE';
    
    if (nextDoseDate && nextDoseDate < today) {
      initialStatus = 'RETRASADO';
    }

    const insertData: VaccineInsertRecord = {
      pet_id: vaccineData.petId,
      // ❌ user_id: vaccineData.userId,  // ELIMINADO - NO ESTÁ EN LA TABLA
      name: vaccineData.name,
      lot_number: vaccineData.lotNumber,
      application_date: vaccineData.applicationDate.toISOString().split('T')[0],
      next_dose_date: vaccineData.nextDoseDate?.toISOString().split('T')[0] || null,
      veterinarian: vaccineData.veterinarian,
      notes: vaccineData.notes,
      status: initialStatus,
      reminder_count: 0,
      last_reminder_sent_at: null,
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

  async updateVaccine(id: string, vaccineData: VaccineUpdatePayload): Promise<Vaccine> {
    const updatePayload: VaccineUpdateRecord = {};

    if (vaccineData.petId !== undefined) updatePayload.pet_id = vaccineData.petId;
    if (vaccineData.name !== undefined) updatePayload.name = vaccineData.name;
    if (vaccineData.lotNumber !== undefined) {
      updatePayload.lot_number = vaccineData.lotNumber;
    }
    if (vaccineData.applicationDate !== undefined) {
      const date = new Date(vaccineData.applicationDate);
      updatePayload.application_date = date.toISOString().split('T')[0];
    }
    if (vaccineData.nextDoseDate !== undefined) {
      if (vaccineData.nextDoseDate) {
        const date = new Date(vaccineData.nextDoseDate);
        updatePayload.next_dose_date = date.toISOString().split('T')[0];
      } else {
        updatePayload.next_dose_date = null;
      }
    }
    if (vaccineData.veterinarian !== undefined) {
      updatePayload.veterinarian = vaccineData.veterinarian;
    }
    if (vaccineData.notes !== undefined) {
      updatePayload.notes = vaccineData.notes;
    }
    if (vaccineData.status !== undefined) {
      updatePayload.status = typeof vaccineData.status === 'string' 
        ? vaccineData.status 
        : vaccineData.status;
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

  // ============================================
  // ✅ NUEVOS MÉTODOS PARA RECORDATORIOS
  // ============================================

  async getPendingVaccines(): Promise<Vaccine[]> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .select('*')
      .in('status', ['PENDIENTE', 'RETRASADO'])
      .lt('reminder_count', 3)
      .order('next_dose_date', { ascending: true });

    if (error) {
      console.error('Error fetching pending vaccines:', error);
      return [];
    }
    return data.map((record: VaccineSupabaseRecord) => this.mapToVaccine(record));
  }

  async incrementReminderCount(id: string): Promise<void> {
    try {
      const { data, error: fetchError } = await this.supabase
        .from('vaccines')
        .select('reminder_count')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error(`Error fetching reminder count for vaccine ${id}:`, fetchError);
        throw new Error(`Error fetching reminder count: ${fetchError.message}`);
      }

      if (!data) {
        throw new Error(`Vaccine with id ${id} not found`);
      }

      const newCount = (data.reminder_count || 0) + 1;
      
      const { error: updateError } = await this.supabase
        .from('vaccines')
        .update({
          reminder_count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error(`Error updating reminder count for vaccine ${id}:`, updateError);
        throw new Error(`Error updating reminder count: ${updateError.message}`);
      }
    } catch (error) {
      console.error(`Error in incrementReminderCount for vaccine ${id}:`, error);
      throw error;
    }
  }

  async updateLastReminderSent(id: string, date: Date): Promise<void> {
    const { error } = await this.supabase
      .from('vaccines')
      .update({
        last_reminder_sent_at: date.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error(`Error updating last reminder sent for vaccine ${id}:`, error);
      throw new Error(`Error updating last reminder sent: ${error.message}`);
    }
  }

  async markAsOverdue(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('vaccines')
      .update({
        status: 'RETRASADO',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error(`Error marking vaccine ${id} as overdue:`, error);
      throw new Error(`Error marking vaccine as overdue: ${error.message}`);
    }
  }

  async markAsApplied(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('vaccines')
      .update({
        status: 'APLICADO',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error(`Error marking vaccine ${id} as applied:`, error);
      throw new Error(`Error marking vaccine as applied: ${error.message}`);
    }
  }

  async getVaccinesDueToday(): Promise<Vaccine[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('vaccines')
      .select('*')
      .eq('status', 'PENDIENTE')
      .eq('next_dose_date', today)
      .lt('reminder_count', 3);

    if (error) {
      console.error('Error fetching vaccines due today:', error);
      return [];
    }
    return data.map((record: VaccineSupabaseRecord) => this.mapToVaccine(record));
  }

  async getOverdueVaccines(): Promise<Vaccine[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('vaccines')
      .select('*')
      .in('status', ['PENDIENTE', 'RETRASADO'])
      .lt('next_dose_date', today)
      .lt('reminder_count', 3);

    if (error) {
      console.error('Error fetching overdue vaccines:', error);
      return [];
    }
    return data.map((record: VaccineSupabaseRecord) => this.mapToVaccine(record));
  }

  // ============================================
  // 🔧 MAPPER ACTUALIZADO (SIN user_id de la BD)
  // ============================================

  private mapToVaccine(data: VaccineSupabaseRecord): Vaccine {
    const name = VaccineName.create(data.name);
    const applicationDate = new Date(data.application_date + 'T00:00:00Z');
    const nextDoseDate = NextDoseDate.create(
      data.next_dose_date ? new Date(data.next_dose_date + 'T00:00:00Z') : null,
      applicationDate
    );

    const statusMap: Record<string, VaccineStatus> = {
      'PENDIENTE': VaccineStatus.PENDING,
      'APLICADO': VaccineStatus.APPLIED,
      'RETRASADO': VaccineStatus.DELAYED
    };

    const status = statusMap[data.status] || VaccineStatus.PENDING;

    // ✅ userId se pasa como string vacío o null (se obtendrá de la mascota)
    return new Vaccine(
      data.id,
      data.pet_id,
      '', // ✅ userId vacío - se obtiene de la mascota cuando se necesite
      name,
      data.lot_number,
      applicationDate,
      nextDoseDate,
      data.veterinarian,
      data.notes,
      new Date(data.created_at),
      new Date(data.updated_at),
      status,
      data.reminder_count || 0,
      data.last_reminder_sent_at ? new Date(data.last_reminder_sent_at) : null,
    );
  }

// ✅ Obtener vacunas pendientes por mascota (SIN user_id)
async getPendingVaccinesByPet(petId: string): Promise<Vaccine[]> {
  const { data, error } = await this.supabase
    .from('vaccines')
    .select('*')
    .eq('pet_id', petId)
    .in('status', ['PENDIENTE', 'RETRASADO'])
    .lt('reminder_count', 3)
    .order('next_dose_date', { ascending: true });

  if (error) {
    console.error('Error fetching pending vaccines for pet:', error);
    return [];
  }

  console.log(`🔍 Encontradas ${data?.length || 0} vacunas pendientes para la mascota ${petId}`);
  
  // ✅ Usar VaccineSupabaseRecord en lugar de any
  return data.map((record: VaccineSupabaseRecord) => this.mapToVaccine(record));
}
// ✅ Obtener el userId de una mascota
async getUserIdByPetId(petId: string): Promise<string | null> {
  const { data, error } = await this.supabase
    .from('pets')
    .select('user_id')
    .eq('id', petId)
    .single();

  if (error) {
    console.error('Error fetching user_id for pet:', error);
    return null;
  }

  return data?.user_id || null;
}
}

