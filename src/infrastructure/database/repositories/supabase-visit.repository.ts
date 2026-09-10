import { createClient } from '@/src/infrastructure/database/supabase/client';
import { VeterinaryVisit, VisitStatus } from '@/src/domain/entities/veterinary-visit.entity';
import { VeterinaryVisitRepository } from '@/src/domain/repositories/veterinary-visit.repository';
import { Weight } from '@/src/domain/value-objects/weight.vo';
import { Temperature } from '@/src/domain/value-objects/temperature.vo';

interface SupabaseVisitRecord {
  id: string;
  pet_id: string;
  date: string;
  reason: string;
  diagnosis: string | null;
  veterinarian: string;
  notes: string | null;
  weight: number | null;
  temperature: number | null;
  created_at: string;
  updated_at: string;
  status: string;
  reminder_count: number;
  last_reminder_sent_at: string | null;
}

interface SupabaseInsertRecord {
  id: string;
  pet_id: string;
  date: string;
  reason: string;
  diagnosis: string | null;
  veterinarian: string;
  notes: string | null;
  weight: number | null;
  temperature: number | null;
  created_at: string;
  updated_at: string;
  status: string;
  reminder_count: number;
  last_reminder_sent_at: string | null;
}

export class SupabaseVisitRepository implements VeterinaryVisitRepository {
  private supabase = createClient();

  private toDomain(record: SupabaseVisitRecord): VeterinaryVisit {
    return VeterinaryVisit.reconstitute({
      id: record.id,
      petId: record.pet_id,
      date: new Date(record.date),
      reason: record.reason,
      diagnosis: record.diagnosis || undefined,
      veterinarian: record.veterinarian,
      notes: record.notes || undefined,
      weight: record.weight !== null && record.weight !== undefined 
        ? new Weight(record.weight) 
        : undefined,
      temperature: record.temperature !== null && record.temperature !== undefined 
        ? new Temperature(record.temperature) 
        : undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      status: record.status as VisitStatus || 'SCHEDULED',
      reminderCount: record.reminder_count || 0,
      lastReminderSentAt: record.last_reminder_sent_at ? new Date(record.last_reminder_sent_at) : null,
    });
  }

  private toPersistence(visit: VeterinaryVisit): SupabaseInsertRecord {
    return {
      id: visit.id,
      pet_id: visit.petId,
      date: visit.date.toISOString().split('T')[0],
      reason: visit.reason,
      diagnosis: visit.diagnosis || null,
      veterinarian: visit.veterinarian,
      notes: visit.notes || null,
      weight: visit.weight?.value !== undefined ? visit.weight.value : null,
      temperature: visit.temperature?.value !== undefined ? visit.temperature.value : null,
      created_at: visit.createdAt.toISOString(),
      updated_at: visit.updatedAt.toISOString(),
      status: visit.status || 'SCHEDULED',
      reminder_count: visit.reminderCount || 0,
      last_reminder_sent_at: visit.lastReminderSentAt?.toISOString() || null,
    };
  }

  async save(visit: VeterinaryVisit): Promise<VeterinaryVisit> {
    const { data, error } = await this.supabase
      .from('veterinary_visits')
      .insert(this.toPersistence(visit))
      .select()
      .single();

    if (error) throw new Error(`Error al guardar: ${error.message}`);
    return this.toDomain(data as SupabaseVisitRecord);
  }

  async findById(id: string): Promise<VeterinaryVisit | null> {
    const { data, error } = await this.supabase
      .from('veterinary_visits')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.toDomain(data as SupabaseVisitRecord);
  }

  async findByPetId(petId: string): Promise<VeterinaryVisit[]> {
    const { data, error } = await this.supabase
      .from('veterinary_visits')
      .select('*')
      .eq('pet_id', petId)
      .order('date', { ascending: false });

    if (error) throw new Error(`Error al buscar: ${error.message}`);
    return (data || []).map(record => this.toDomain(record as SupabaseVisitRecord));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<VeterinaryVisit[]> {
    const { data, error } = await this.supabase
      .from('veterinary_visits')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) throw new Error(`Error al buscar: ${error.message}`);
    return (data || []).map(record => this.toDomain(record as SupabaseVisitRecord));
  }

  async update(visit: VeterinaryVisit): Promise<VeterinaryVisit> {
    const { data, error } = await this.supabase
      .from('veterinary_visits')
      .update({
        diagnosis: visit.diagnosis || null,
        notes: visit.notes || null,
        status: visit.status,
        reminder_count: visit.reminderCount,
        last_reminder_sent_at: visit.lastReminderSentAt?.toISOString() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', visit.id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar: ${error.message}`);
    return this.toDomain(data as SupabaseVisitRecord);
  }

  // ✅ NUEVO: Obtener visitas pendientes por mascota
  async getPendingVisitsByPet(petId: string): Promise<VeterinaryVisit[]> {
    const { data, error } = await this.supabase
      .from('veterinary_visits')
      .select('*')
      .eq('pet_id', petId)
      .in('status', ['SCHEDULED', 'OVERDUE'])
      .lt('reminder_count', 3)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching pending visits:', error);
      return [];
    }

    return (data || []).map(record => this.toDomain(record as SupabaseVisitRecord));
  }

  // ✅ NUEVO: Incrementar contador de recordatorios
  async incrementReminderCount(id: string): Promise<void> {
    const { data, error: fetchError } = await this.supabase
      .from('veterinary_visits')
      .select('reminder_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`Error fetching reminder count for visit ${id}:`, fetchError);
      throw new Error(`Error fetching reminder count: ${fetchError.message}`);
    }

    if (!data) {
      throw new Error(`Visit with id ${id} not found`);
    }

    const newCount = (data.reminder_count || 0) + 1;
    
    const { error: updateError } = await this.supabase
      .from('veterinary_visits')
      .update({
        reminder_count: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error(`Error updating reminder count for visit ${id}:`, updateError);
      throw new Error(`Error updating reminder count: ${updateError.message}`);
    }
  }

  // ✅ NUEVO: Actualizar fecha del último recordatorio
  async updateLastReminderSent(id: string, date: Date): Promise<void> {
    const { error } = await this.supabase
      .from('veterinary_visits')
      .update({
        last_reminder_sent_at: date.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error(`Error updating last reminder sent for visit ${id}:`, error);
      throw new Error(`Error updating last reminder sent: ${error.message}`);
    }
  }

  // ✅ NUEVO: Marcar como retrasada (OVERDUE)
  async markAsOverdue(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('veterinary_visits')
      .update({
        status: 'OVERDUE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error(`Error marking visit ${id} as overdue:`, error);
      throw new Error(`Error marking visit as overdue: ${error.message}`);
    }
  }

  // ✅ NUEVO: Marcar como confirmada
  async markAsConfirmed(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('veterinary_visits')
      .update({
        status: 'CONFIRMED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error(`Error marking visit ${id} as confirmed:`, error);
      throw new Error(`Error marking visit as confirmed: ${error.message}`);
    }
  }

  // ✅ NUEVO: Marcar TODAS las visitas SCHEDULED con fecha PASADA como OVERDUE
  async markScheduledAsOverdue(petId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`🔄 Marcando visitas SCHEDULED con fecha < ${today} como OVERDUE...`);

    const { error } = await this.supabase
      .from('veterinary_visits')
      .update({
        status: 'OVERDUE',
        updated_at: new Date().toISOString(),
      })
      .eq('pet_id', petId)
      .eq('status', 'SCHEDULED')
      .lt('date', today);

    if (error) {
      console.error('Error marking scheduled visits as overdue:', error);
      throw new Error(`Error marking scheduled visits as overdue: ${error.message}`);
    }
    
    console.log(`✅ Visitas SCHEDULED con fecha anterior a hoy actualizadas a OVERDUE`);
  }
}