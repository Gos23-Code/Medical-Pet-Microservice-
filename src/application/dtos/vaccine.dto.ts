// src/application/dtos/vaccine.dto.ts

// ✅ Enum para el status en los DTOs
export type VaccineStatusDTO = 'PENDIENTE' | 'APLICADO' | 'RETRASADO';

export interface CreateVaccineDTO {
  userId: string;  // ✅ AGREGAR userId
  petId: string;
  name: string;
  lotNumber?: string;
  applicationDate: Date;
  nextDoseDate?: Date | null;
  veterinarian?: string;
  notes?: string;
}

export interface UpdateVaccineDTO {
  id: string;
  userId?: string;  // ✅ AGREGAR userId (opcional)
  petId?: string;
  name?: string;
  lotNumber?: string | null;
  applicationDate?: Date;
  nextDoseDate?: Date | null;
  veterinarian?: string | null;
  notes?: string | null;
  status?: VaccineStatusDTO;
}

export interface UpdateNextDoseDTO {
  id: string;
  nextDoseDate: Date | null;
}

export interface ApplyVaccineDTO {
  id: string;
  userId: string;  // ✅ AGREGAR userId (necesario para notificaciones)
  petId: string;   // ✅ AGREGAR petId (necesario para notificaciones)
}

export interface VaccineResponseDTO {
  id: string;
  petId: string;
  userId: string;  // ✅ AGREGAR userId
  name: string;
  lotNumber: string | null;
  applicationDate: Date;
  nextDoseDate: Date | null;
  veterinarian: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;  // ✅ AGREGAR updatedAt
  isDue: boolean;
  daysUntilDue: number | null;
  status: VaccineStatusDTO;
  reminderCount: number;  // ✅ AGREGAR contador de recordatorios
  lastReminderSentAt: Date | null;  // ✅ AGREGAR último recordatorio
}