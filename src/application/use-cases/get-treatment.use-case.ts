import { createClient } from '@/lib/supabase/client';
import { TreatmentResponse } from '../dtos/veterinary-visit.dto';

// Definir el tipo específico para activeStatus
type ActiveStatusType = 'ACTIVE' | 'ACTIVE_INDEFINITE' | 'ACTIVE_LAST_DAY' | 'EXPIRED' | null;

export class GetTreatmentsByVisitUseCase {
  async execute(visitId: string): Promise<TreatmentResponse[]> {
    if (!visitId) {
      throw new Error('El ID de la visita es requerido');
    }

    try {
      const supabase = createClient();
      
      const { data: treatments, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('visit_id', visitId);
      
      if (error) {
        console.error('Error fetching treatments:', error);
        return [];
      }
      
      if (!treatments || treatments.length === 0) {
        console.log(`No treatments found for visitId: ${visitId}`);
        return [];
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const treatmentsWithStatus: TreatmentResponse[] = treatments.map(treatment => {
        const endDate = treatment.end_date ? new Date(treatment.end_date) : null;
        
        let isActive = false;
        let activeStatus: ActiveStatusType = null;
        
        if (!endDate) {
          isActive = true;
          activeStatus = 'ACTIVE_INDEFINITE';
        } else if (endDate >= today) {
          isActive = true;
          const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          if (daysRemaining === 0) {
            activeStatus = 'ACTIVE_LAST_DAY';
          } else {
            activeStatus = 'ACTIVE';
          }
        } else {
          isActive = false;
          activeStatus = 'EXPIRED';
        }
        
        return {
          id: treatment.id,
          visitId: treatment.visit_id,
          description: treatment.description,
          startDate: treatment.start_date,
          endDate: treatment.end_date,
          notes: treatment.notes,
          createdAt: treatment.created_at,
          updatedAt: treatment.updated_at,
          isActive: isActive,
          activeStatus: activeStatus,
        };
      });
      
      return treatmentsWithStatus;
      
    } catch (error) {
      console.error('Error in GetTreatmentsByVisitUseCase:', error);
      return [];
    }
  }
}