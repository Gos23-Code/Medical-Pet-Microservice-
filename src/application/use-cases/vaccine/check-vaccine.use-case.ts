// src/domain/use-cases/check-vaccine-due.use-case.ts
import { IVaccineRepository } from '@/src/domain/repositories/vaccine.repositories';    

export interface VaccineDueStatus {
  id: string;
  name: string;
  isDue: boolean;
  daysUntilDue: number | null;
  nextDoseDate: Date | null;
  applicationDate: Date;
}

export class CheckVaccineDueUseCase {
  constructor(private readonly vaccineRepository: IVaccineRepository) {}

  async execute(id: string): Promise<VaccineDueStatus> {
    // Validación
    if (!id) throw new Error('El ID de la vacuna es requerido');

    // Obtener la vacuna
    const vaccine = await this.vaccineRepository.getById(id);
    if (!vaccine) {
      throw new Error('Vacuna no encontrada');
    }

    // Calcular el estado usando el método isDue() de la entidad
    const isDue = vaccine.isDue();
    const daysUntilDue = vaccine.daysUntilDue();

    // Retornar el resultado
    return {
      id: vaccine.id,
      name: vaccine.nameValue,
      isDue,
      daysUntilDue,
      nextDoseDate: vaccine.nextDoseDateValue,
      applicationDate: vaccine.applicationDate
    };
  }
}