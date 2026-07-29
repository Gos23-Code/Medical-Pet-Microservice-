import { MedicationFromService } from '@/src/application/dtos/treatment.dto';

export class GetMedicationsUseCase {
  private medicationServiceUrl: string;

  constructor() {
    this.medicationServiceUrl = process.env.MEDICATION_SERVICE_URL || 'http://localhost:3000';
  }

  async execute(treatmentId: string): Promise<MedicationFromService[]> {
    if (!treatmentId) {
      throw new Error('El ID del tratamiento es requerido');
    }

    try {
      const response = await fetch(
        `${this.medicationServiceUrl}/api/medications?treatmentId=${treatmentId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.warn(`Medication service responded with status: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.warn('Error fetching medications:', error);
      return [];
    }
  }
}