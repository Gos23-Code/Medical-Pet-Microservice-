import { PetSurgery } from '@/src/domain/entities/pet-surgery.entity';
import { PetSurgeryRepository } from '@/src/domain/repositories/pet-surgery.repository';

export interface GetSurgeriesFilters {
  visitId?: string;
  petId?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  outcome?: string;
}

export interface SurgeryStatistics {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  complicated: number;
  cancelled: number;
  successRate: number;
  averageDuration: number;
}

export class GetSurgeriesUseCase {
  constructor(private readonly repository: PetSurgeryRepository) {}

  async execute(filters: GetSurgeriesFilters = {}): Promise<PetSurgery[]> {
    let surgeries: PetSurgery[] = [];

    // Validar que al menos haya un filtro de búsqueda
    if (!filters.visitId && !filters.petId) {
      throw new Error('At least one filter is required: visitId or petId');
    }

    // Buscar por visita
    if (filters.visitId) {
      if (!filters.visitId.trim()) {
        throw new Error('Visit ID cannot be empty');
      }
      surgeries = await this.repository.findByVisitId(filters.visitId);
    }
    
    // Buscar por mascota
    else if (filters.petId) {
      if (!filters.petId.trim()) {
        throw new Error('Pet ID cannot be empty');
      }
      surgeries = await this.repository.findByPetId(filters.petId);
    }

    // Aplicar filtros adicionales
    surgeries = this.applyFilters(surgeries, filters);

    return surgeries;
  }

  async getById(id: string): Promise<PetSurgery> {
    if (!id || !id.trim()) {
      throw new Error('Surgery ID is required');
    }

    const surgery = await this.repository.findById(id);
    
    if (!surgery) {
      throw new Error(`Surgery with id ${id} not found`);
    }
    
    return surgery;
  }

  async getStatistics(filters: GetSurgeriesFilters = {}): Promise<SurgeryStatistics> {
    const surgeries = await this.execute(filters);
    
    const completedSurgeries = surgeries.filter(s => s.status === 'COMPLETED');
    const successfulCompleted = completedSurgeries.filter(s => s.outcome === 'SUCCESSFUL');
    const completedWithDuration = surgeries.filter(s => s.status === 'COMPLETED' && s.durationMinutes);

    const statistics: SurgeryStatistics = {
      total: surgeries.length,
      scheduled: surgeries.filter(s => s.status === 'SCHEDULED').length,
      inProgress: surgeries.filter(s => s.status === 'IN_PROGRESS').length,
      completed: completedSurgeries.length,
      complicated: surgeries.filter(s => s.status === 'COMPLICATED').length,
      cancelled: surgeries.filter(s => s.status === 'CANCELLED').length,
      successRate: completedSurgeries.length > 0 
        ? (successfulCompleted.length / completedSurgeries.length) * 100 
        : 0,
      averageDuration: completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, s) => sum + s.durationMinutes, 0) / completedWithDuration.length
        : 0,
    };
    
    return statistics;
  }

  private applyFilters(surgeries: PetSurgery[], filters: GetSurgeriesFilters): PetSurgery[] {
    let filtered = [...surgeries];
    
    // Filtrar por estado
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    
    // Filtrar por resultado
    if (filters.outcome) {
      filtered = filtered.filter(s => s.outcome === filters.outcome);
    }
    
    // Filtrar por fecha desde
    if (filters.fromDate) {
      filtered = filtered.filter(s => s.surgeryDate >= filters.fromDate!);
    }
    
    // Filtrar por fecha hasta
    if (filters.toDate) {
      filtered = filtered.filter(s => s.surgeryDate <= filters.toDate!);
    }
    
    return filtered;
  }
}