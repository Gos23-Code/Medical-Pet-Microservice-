import { PetSurgery } from '@/src/domain/entities/pet-surgery.entity';

export interface PetSurgeryRepository {
  save(surgery: PetSurgery): Promise<void>;
  findById(id: string): Promise<PetSurgery | null>;
  update(surgery: PetSurgery): Promise<void>;
  delete(id: string): Promise<void>;
  findByVisitId(visitId: string): Promise<PetSurgery[]>;
  findByPetId(petId: string): Promise<PetSurgery[]>;
}