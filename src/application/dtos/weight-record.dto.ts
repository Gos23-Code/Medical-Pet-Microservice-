// ============================================
// CREATE WEIGHT RECORD DTO
// ============================================
export interface CreateWeightRecordDto {
  userId: string;  // ✅ AGREGAR - necesario para notificaciones
  petId: string;
  weight: number;
  unit?: 'kg' | 'lb';  // ✅ AGREGAR - unidad de peso
  date?: string;
  note?: string;
}

// ============================================
// UPDATE WEIGHT RECORD DTO
// ============================================
export interface UpdateWeightRecordDto {
  userId: string;  // ✅ AGREGAR - necesario para notificaciones
  weight: number;
  unit?: 'kg' | 'lb';  // ✅ AGREGAR - unidad de peso
  note?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================
export interface WeightRecordResponseDto {
  message?: string;
  id: string;
  petId: string;
  userId: string;  // ✅ AGREGAR
  weight: number;
  unit: 'kg' | 'lb';  // ✅ AGREGAR
  date?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WeightRecordListResponseDto {
  id: string;
  petId: string;
  userId: string;  // ✅ AGREGAR
  weight: number;
  unit: 'kg' | 'lb';  // ✅ AGREGAR
  date?: string;
  note?: string;
  createdAt: string;
}

export interface WeightRecordByPetIdResponseDto {
  petId: string;
  userId: string;  // ✅ AGREGAR
  weight?: number;
  unit?: 'kg' | 'lb';
}

export interface WeightRecordLatestResponseDto {
  petId: string;
  userId: string;  // ✅ AGREGAR
  weight?: number;
  unit?: 'kg' | 'lb';
  date?: string;
}

// ============================================
// WEIGHT ALERT DTO (NUEVO)
// ============================================
export interface WeightAlertDto {
  petId: string;
  userId: string;
  currentWeight: number;
  previousWeight: number;
  percentageChange: number;
  alertType: 'LOSS' | 'GAIN' | 'SIGNIFICANT_CHANGE';
  alertedAt: string;
}