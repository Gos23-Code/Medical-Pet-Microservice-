import { Vaccine, CreateVaccineData } from '../entities/vaccine.entity';

export interface IVaccineRepository {
  addVaccine(vaccineData: CreateVaccineData): Promise<Vaccine>;
  getByPetId(petId: string): Promise<Vaccine[]>;
  updateVaccine(id: string, vaccineData: Partial<CreateVaccineData>): Promise<Vaccine>;
  deleteVaccine(id: string): Promise<void>;
  getById(id: string): Promise<Vaccine | null>;
}