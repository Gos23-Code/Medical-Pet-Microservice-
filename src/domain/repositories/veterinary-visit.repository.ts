import { VeterinaryVisit } from '../entities/veterinary-visit.entity';

export interface VeterinaryVisitRepository {
  save(visit: VeterinaryVisit): Promise<VeterinaryVisit>;
  findById(id: string): Promise<VeterinaryVisit | null>;
  findByPetId(petId: string): Promise<VeterinaryVisit[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<VeterinaryVisit[]>;
  update(visit: VeterinaryVisit): Promise<VeterinaryVisit>;
}