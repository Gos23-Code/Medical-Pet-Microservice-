// ============================================
// 🔥 TIPOS DE EVENTOS
// ============================================
export type PubSubEvent = 
  | 'LAB_TEST_CREATED'
  | 'LAB_TEST_UPDATED'
  | 'LAB_TEST_RESULT_UPDATED'
  | 'LAB_TEST_IS_NORMAL_CHECKED'
  | 'MEDICATION_ADDED'
  | 'MEDICATION_PRESCRIBED'
  | 'MEDICATION_ADMINISTERED'
  | 'MEDICATION_UPDATED'  
  | 'SURGERY_SCHEDULED'
  | 'SURGERY_COMPLETED'
  | 'TREATMENT_STARTED'
  | 'TREATMENT_UPDATED'
  | 'TREATMENT_COMPLETED'
  | 'VACCINE_APPLIED'
  | 'VACCINE_DUE_REMINDER'
  | 'VACCINE_OVERDUE_REMINDER'
  | 'VACCINE_UPDATED'
  | 'VISIT_SCHEDULED'
  | 'VISIT_COMPLETED'
  | 'VISIT_DUE_REMINDER'        
  | 'VISIT_OVERDUE_REMINDER'
  | 'WEIGHT_RECORDED'
  | 'WEIGHT_ALERT'
  | 'WEIGHT_UPDATED';

// ============================================
// 🔥 DATOS PARA CADA EVENTO
// ============================================

// ---- LAB TEST ----
export interface LabTestCreatedData {
  labTestId: string;
  petId: string;
  userId: string;  // ✅ YA TIENE
  testType: string;
  results: Record<string, unknown>;
  veterinarian: string;
}

export interface LabTestResultUpdatedData {
  labTestId: string;
  petId: string;
  userId: string;  // ✅ AGREGADO
  result: string;
  isNormal: boolean;
  normalRange?: string;
  updatedAt: string;
}

export interface LabTestIsNormalCheckedData {
  labTestId: string;
  petId: string;
  userId: string;  // ✅ AGREGADO
  name: string;
  result: string;
  normalRange: string;
  isNormal: boolean;
  checkedAt: string;
}

export interface LabTestUpdatedData {
  labTestId: string;
  petId: string;
  userId: string;  // ✅ AGREGADO
  updates: Partial<LabTestCreatedData>;
  updatedAt: string;
}

// ---- MEDICATIONS ----

export interface MedicationAddedData {
  medicationId: string;
  treatmentId: string;
  petId: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  addedAt: string;
}

export interface MedicationPrescribedData {
  medicationId: string;
  petId: string;
  userId: string;  // ✅ YA TIENE
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribedAt: string;
}

export interface MedicationAdministeredData {
  medicationId: string;
  petId: string;
  userId: string;  // ✅ AGREGADO
  administeredBy: string;
  administeredAt: string;
  notes?: string;
}

export interface MedicationUpdatedData {
  medicationId: string;
  treatmentId: string;
  treatmentName: string;
  petId: string;
  userId: string;
  name: string;
  oldDosage: string;
  newDosage: string;
  oldFrequency: string;
  newFrequency: string;
  changeMessage: string;
  updatedAt: string;
}

// ---- SURGERY ----
export interface SurgeryScheduledData {
  surgeryId: string;
  petId: string;
  userId: string;  // ✅ YA TIENE
  type: string;
  scheduledDate: string;
  veterinarian: string;
}

export interface SurgeryCompletedData {
  surgeryId: string;
  petId: string;
  userId: string;  // ✅ AGREGADO
  outcome: string;
  notes: string;
  completedAt: string;
}

// ---- TREATMENTS ----
export interface TreatmentStartedData {
  treatmentId: string;
  petId: string;
  userId: string;  // ✅ YA TIENE
  type: string;
  protocol: string;
  startedAt: string;
}

export interface TreatmentUpdatedData {
  treatmentId: string;
  petId: string;
  userId: string;  // ✅ AGREGADO
  progress: number;
  status: string;
  updatedAt: string;
}

export interface TreatmentCompletedData {
  treatmentId: string;
  petId: string;
  userId: string;  // ✅ AGREGADO
  outcome: string;
  completedAt: string;
}

// ---- VACCINE ----
export interface VaccineAppliedData {
  vaccineId: string;
  petId: string;
  userId: string;  // ✅ YA TIENE
  name: string;
  batch: string;
  applicationDate: string;
  nextDoseDate: string;
  veterinarian: string;
}

export interface VaccineDueReminderData {
  petId: string;
  userId: string;  // ✅ YA TIENE
  vaccineName: string;
  dueDate: string;
  reminderSentAt: string;
  reminderType: 'DUE' | 'OVERDUE';
}

export interface VaccineUpdatedData {
  vaccineId: string;
  petId: string;
  userId: string;
  name: string;
  oldStatus?: string;
  newStatus?: string;
  changes: Record<string,  { old: unknown; new: unknown }>;  // ✅ Cambios realizados
  updatedAt: string;
}

// ---- VISITS ----
export interface VisitScheduledData {
  visitId: string;
  petId: string;
  userId: string;  // ✅ YA TIENE
  scheduledDate: string;
  reason: string;
  veterinarian: string;
}

export interface VisitCompletedData {
  visitId: string;
  petId: string;
  userId: string;  // ✅ AGREGADO
  diagnosis: string;
  prescriptions: string[];
  notes: string;
  completedAt: string;
}

export interface VisitDueReminderData {
  visitId: string;
  petId: string;
  userId: string;
  scheduledDate: string;
  reason: string;
  veterinarian: string;
  reminderType: 'DUE';
}

export interface VisitOverdueReminderData {
  visitId: string;
  petId: string;
  userId: string;
  scheduledDate: string;
  reason: string;
  veterinarian: string;
  reminderType: 'OVERDUE';
}

// ---- WEIGHT RECORD ----
export interface WeightRecordedData {
  weightId: string;
  petId: string;
  userId: string;  // ✅ YA TIENE
  weight: number;
  unit: 'kg' | 'lb';
  recordedAt: string;
  notes?: string;
}

export interface WeightAlertData {
  petId: string;
  userId: string;  // ✅ YA TIENE
  currentWeight: number;
  previousWeight: number;
  percentageChange: number;
  alertType: 'LOSS' | 'GAIN' | 'SIGNIFICANT_CHANGE';
  alertedAt: string;
}

export interface WeightUpdatedData {
  weightId: string;
  petId: string;
  userId: string;
  oldWeight: number;
  newWeight: number;
  unit: string;
  updatedAt: string;
  notes?: string;
}

// ============================================
// 🔥 MAPEO DE EVENTOS A SUS TIPOS DE DATOS
// ============================================
export interface PubSubEventMap {
  'LAB_TEST_CREATED': LabTestCreatedData;
  'LAB_TEST_RESULT_UPDATED': LabTestResultUpdatedData;
  'LAB_TEST_IS_NORMAL_CHECKED': LabTestIsNormalCheckedData;
  'LAB_TEST_UPDATED': LabTestUpdatedData;
  'MEDICATION_ADDED': MedicationAddedData;
  'MEDICATION_PRESCRIBED': MedicationPrescribedData;
  'MEDICATION_ADMINISTERED': MedicationAdministeredData;
  'MEDICATION_UPDATED': MedicationUpdatedData;
  'SURGERY_SCHEDULED': SurgeryScheduledData;
  'SURGERY_COMPLETED': SurgeryCompletedData;
  'TREATMENT_STARTED': TreatmentStartedData;
  'TREATMENT_UPDATED': TreatmentUpdatedData;
  'TREATMENT_COMPLETED': TreatmentCompletedData;
  'VACCINE_APPLIED': VaccineAppliedData;
  'VACCINE_DUE_REMINDER': VaccineDueReminderData;
  'VACCINE_OVERDUE_REMINDER': VaccineDueReminderData;
  'VACCINE_UPDATED': VaccineUpdatedData;
  'VISIT_SCHEDULED': VisitScheduledData;
  'VISIT_COMPLETED': VisitCompletedData;
  'VISIT_DUE_REMINDER': VisitDueReminderData;        
  'VISIT_OVERDUE_REMINDER': VisitOverdueReminderData;
  'WEIGHT_RECORDED': WeightRecordedData;
  'WEIGHT_ALERT': WeightAlertData;
  'WEIGHT_UPDATED': WeightUpdatedData; 
}

// ============================================
// 🔥 MENSAJE DE PUB/SUB TIPADO
// ============================================
export interface PubSubMessage<K extends PubSubEvent = PubSubEvent> {
  event: K;
  data: PubSubEventMap[K];
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

// ============================================
// 🔥 RESPUESTA DE PUBLICACIÓN
// ============================================
export interface PublishResponse {
  success: boolean;
  message_id: string;
  event: string;
  timestamp: string;
}

// ============================================
// 🔥 HANDLER DE EVENTOS
// ============================================
export interface PubSubEventHandler {
  handleEvent<K extends PubSubEvent>(
    message: PubSubMessage<K>
  ): Promise<void> | void;
}

// ============================================
// 🔥 TIPO PARA METADATA (opcional)
// ============================================
export type PubSubMetadata = Record<string, string | number | boolean>;