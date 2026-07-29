import { PetSurgeryRepository } from '@/src/domain/repositories/pet-surgery.repository';

export class DeleteSurgeryUseCase {
  constructor(private readonly repository: PetSurgeryRepository) {}

  async execute(id: string): Promise<void> {

    if (!id || id.trim().length === 0) {
      throw new Error('Surgery ID is required');
    }
    
    const surgery = await this.repository.findById(id);
    
    if (!surgery) {
      throw new Error(`Surgery with id ${id} not found`);
    }
    
    if (surgery.status === 'IN_PROGRESS' || surgery.status === 'COMPLICATED') {
      throw new Error('Cannot delete a surgery that is in progress');
    }
    
    if (surgery.status === 'COMPLETED') {
      throw new Error('Cannot delete a completed surgery');
    }
    
    await this.repository.delete(id);
  }
}