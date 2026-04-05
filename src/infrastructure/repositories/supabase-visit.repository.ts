import { createClient } from '@/lib/supabase/client';
import { VeterinaryVisit } from '@/src/domain/entities/veterinary-visit.entity';
import { VeterinaryVisitRepository } from '@/src/domain/repositories/veterinary-visit.repository';

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
      weight: record.weight || undefined,
      temperature: record.temperature || undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
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
      weight: visit.weight || null,
      temperature: visit.temperature || null,
      created_at: visit.createdAt.toISOString(),
      updated_at: visit.updatedAt.toISOString(),
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', visit.id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar: ${error.message}`);
    return this.toDomain(data as SupabaseVisitRecord);
  }
}