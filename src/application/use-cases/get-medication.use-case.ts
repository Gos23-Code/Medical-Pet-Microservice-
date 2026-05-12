import { createClient } from '@/lib/supabase/client';
import { MedicationFromService } from '../dtos/treatment.dto';

export class GetMedicationsUseCase {
  async execute(treatmentId: string): Promise<MedicationFromService[]> {
    if (!treatmentId) {
      throw new Error('El ID del tratamiento es requerido');
    }

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('treatment_id', treatmentId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching medications from Supabase:', error);
        return [];
      }
      
      return (data || []).map(med => ({
        id: med.id,
        treatmentId: med.treatment_id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        createdAt: med.created_at,
      }));
    } catch (error) {
      console.error('Error in GetMedicationsUseCase:', error);
      return [];
    }
  }
}