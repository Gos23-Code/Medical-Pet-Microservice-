-- 002_clinical_access_and_audit.sql
-- MED-02 (resto), MED-04 y MED-05: complementa 001 con lo que faltaba para el modelo "2 en 1"
-- (dueño y clínica usan los mismos endpoints) y para la auditoría clínica.
--
-- Ejecutar a mano en el SQL Editor de Supabase de Medical, DESPUÉS de 001.
-- Idempotente: IF NOT EXISTS en todo. Calificar siempre con public.
--
-- Decisiones tomadas aquí (ver AGENTS.md §6):
--   * vaccines: se reutiliza `lot_number` como lote (no se duplica como batch_number).
--     Solo se agrega `manufacturer`.
--   * clinical_audit_log.record_id es uuid. Si WeightRecord usa otra PK, ajustar antes de usar.

-- Visitas: quién atendió (usuario) y la cita de origen (MED-04)
ALTER TABLE public.veterinary_visits
  ADD COLUMN IF NOT EXISTS attended_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS appointment_id uuid;

-- Una cita atendida produce como máximo una visita (MED-04: 409 si ya existe)
CREATE UNIQUE INDEX IF NOT EXISTS veterinary_visits_appointment_uidx
  ON public.veterinary_visits (appointment_id)
  WHERE appointment_id IS NOT NULL;

-- Vacunas: fabricante (el lote ya existe como lot_number)
ALTER TABLE public.vaccines
  ADD COLUMN IF NOT EXISTS manufacturer varchar(100);

-- Laboratorios: sin pet_id/user_id no se puede autorizar ni notificar (AGENTS.md §10)
ALTER TABLE public.lab_tests
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS attended_by_employee_id uuid,
  ADD COLUMN IF NOT EXISTS pet_id uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS lab_tests_pet_idx
  ON public.lab_tests (pet_id);

-- Auditoría de escrituras clínicas (MED-05)
CREATE TABLE IF NOT EXISTS public.clinical_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name varchar(50) NOT NULL,
  record_id uuid NOT NULL,
  action varchar(10) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  actor_user_id uuid NOT NULL,
  veterinary_id uuid,
  changes jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinical_audit_log_record_idx
  ON public.clinical_audit_log (table_name, record_id);

CREATE INDEX IF NOT EXISTS clinical_audit_log_vet_idx
  ON public.clinical_audit_log (veterinary_id, occurred_at);
