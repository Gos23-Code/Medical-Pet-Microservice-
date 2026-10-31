// Forma única de una visita en las respuestas. La usan el dueño (lectura) y la clínica (lectura y escritura).

export interface VisitRow {
  id: string;
  pet_id: string;
  date: string;
  reason: string;
  diagnosis: string | null;
  veterinarian: string | null;
  notes: string | null;
  weight: number | null;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  mucous_membranes: string | null;
  body_condition_score: number | null;
  anamnesis: string | null;
  physical_exam: string | null;
  plan: string | null;
  appointment_id: string | null;
  veterinary_id: string | null;
  attended_by_employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export function toVisitResponse(row: VisitRow) {
  return {
    id: row.id,
    petId: row.pet_id,
    date: row.date,
    reason: row.reason,
    // Signos vitales
    weight: row.weight,
    temperature: row.temperature,
    heartRate: row.heart_rate,
    respiratoryRate: row.respiratory_rate,
    mucousMembranes: row.mucous_membranes,
    bodyConditionScore: row.body_condition_score,
    // Texto clínico
    anamnesis: row.anamnesis,
    physicalExam: row.physical_exam,
    diagnosis: row.diagnosis,
    plan: row.plan,
    notes: row.notes,
    // Autoría y origen
    veterinarian: row.veterinarian,
    appointmentId: row.appointment_id,
    veterinaryId: row.veterinary_id,
    attendedByEmployeeId: row.attended_by_employee_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
