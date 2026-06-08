import { PetSurgeryRepository } from '../../domain/repositories/petSurgery.repository';

export class DeleteSurgeryUseCase {
  constructor(private readonly repository: PetSurgeryRepository) {}

  async execute(id: string): Promise<void> {
    // Validar ID
    if (!id || id.trim().length === 0) {
      throw new Error('Surgery ID is required');
    }
    
    // Verificar que existe
    const surgery = await this.repository.findById(id);
    
    if (!surgery) {
      throw new Error(`Surgery with id ${id} not found`);
    }
    
    // Validar que no esté en progreso o completada
    if (surgery.status === 'IN_PROGRESS') {
      throw new Error('Cannot delete a surgery that is in progress');
    }
    
    if (surgery.status === 'COMPLETED') {
      throw new Error('Cannot delete a completed surgery');
    }
    
    // Eliminar
    await this.repository.delete(id);
  }
}