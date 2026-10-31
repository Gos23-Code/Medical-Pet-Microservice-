-- 001_authorship_columns.sql
-- MED-02 (parcial): columnas de autoría clínica en la base de datos de Medical.
-- Pendientes de otra decisión (NO incluidos aquí):
--   * lab_tests.user_id / pet_id  → falta decidir si user_id es dueño o quien registró el examen
--   * clinical_audit_log          → MED-05, script aparte
--   * veterinary_visits.appointment_id → MED-04 (depende de Calendar)
--   * vaccines.batch_number / manufacturer → vaccines ya tiene lot_number; decidir si se duplica
--
-- Convención: calificar siempre con public. y usar IF NOT EXISTS (script idempotente).
-- Ejecutar a mano en el SQL Editor de Supabase de Medical.

-- Visitas: quién atendió y en qué clínica
ALTER TABLE public.veterinary_visits
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS attended_by_employee_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

CREATE INDEX IF NOT EXISTS veterinary_visits_vet_date_idx
  ON public.veterinary_visits (veterinary_id, date);

-- Vacunas: clínica y empleado que aplicó (user_id ya existe, ver AGENTS.md §6)
ALTER TABLE public.vaccines
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS applied_by_employee_id uuid;

-- Cirugías: clínica y cirujano
ALTER TABLE public.pet_surgeries
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS surgeon_employee_id uuid;

-- Peso: clínica y origen del registro (CLINIC = lo tomó la clínica, OWNER = lo registró el dueño)
ALTER TABLE public."WeightRecord"
  ADD COLUMN IF NOT EXISTS "VeterinaryId" uuid,
  ADD COLUMN IF NOT EXISTS "Source" varchar(10) NOT NULL DEFAULT 'CLINIC'
    CHECK ("Source" IN ('CLINIC', 'OWNER'));
