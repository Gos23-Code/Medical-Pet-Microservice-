import { Vaccine, CreateVaccineData } from '../entities/vaccine.entity';

export interface IVaccineRepository {
  // ============================================
  // 🔥 MÉTODOS EXISTENTES
  // ============================================
  addVaccine(vaccineData: CreateVaccineData): Promise<Vaccine>;
  getByPetId(petId: string): Promise<Vaccine[]>;
  updateVaccine(id: string, vaccineData: Partial<CreateVaccineData>): Promise<Vaccine>;
  deleteVaccine(id: string): Promise<void>;
  getById(id: string): Promise<Vaccine | null>;

  // ============================================
  // ✅ NUEVOS MÉTODOS PARA RECORDATORIOS
  // ============================================
  
  /**
   * Obtiene todas las vacunas que están PENDIENTE o RETRASADO
   * y que aún tienen recordatorios disponibles (reminderCount < 3)
   */
  getPendingVaccines(): Promise<Vaccine[]>;

  /**
   * Incrementa el contador de recordatorios de una vacuna
   */
  incrementReminderCount(id: string): Promise<void>;

  /**
   * Actualiza la fecha del último recordatorio enviado
   */
  updateLastReminderSent(id: string, date: Date): Promise<void>;

  /**
   * Marca una vacuna como RETRASADO (OVERDUE)
   */
  markAsOverdue(id: string): Promise<void>;

  /**
   * Marca una vacuna como APLICADO
   */
  markAsApplied(id: string): Promise<void>;

  /**
   * Obtiene vacunas que vencen hoy (para recordatorios)
   */
  getVaccinesDueToday(): Promise<Vaccine[]>;

  /**
   * Obtiene vacunas que están retrasadas (overdue)
   */
  getOverdueVaccines(): Promise<Vaccine[]>;
}