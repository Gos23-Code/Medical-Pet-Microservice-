-- 003_alinear_esquema_con_codigo.sql
-- Deja las tablas de Medical con las columnas que el código lee y escribe (repositorios y rutas en app/api).
--
-- Orden de ejecución en el SQL Editor de Supabase: 001 → 002 → 003 (o solo 003 en una base vacía,
-- porque este archivo también crea las tablas y las columnas de 001 y 002).
--
-- Idempotente: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, DROP NOT NULL es seguro si ya es nullable.
-- Si una tabla ya existe, NO se recrea: solo se agregan las columnas que falten.
--
-- Nota de seguridad: el backend usa la anon key de Supabase. No actives RLS en estas tablas
-- sin crear políticas, o las rutas empezarán a devolver error.

-- ============================================
-- 1. VISITAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.veterinary_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  date date NOT NULL,
  reason text NOT NULL,
  diagnosis text,
  veterinarian text,
  notes text,
  weight numeric(7,2),
  temperature numeric(4,1),
  status varchar(20) NOT NULL DEFAULT 'SCHEDULED',
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Columnas de autoría (MED-02) y cita de origen (MED-04)
ALTER TABLE public.veterinary_visits
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS attended_by_employee_id uuid,
  ADD COLUMN IF NOT EXISTS attended_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS appointment_id uuid;

-- Campos de "Registrar visita" (diseño 13 oct): signos vitales y texto clínico.
-- Todos opcionales: el mismo body sirve al dueño (lectura) y a la clínica (escritura).
ALTER TABLE public.veterinary_visits
  ADD COLUMN IF NOT EXISTS heart_rate smallint,
  ADD COLUMN IF NOT EXISTS respiratory_rate smallint,
  ADD COLUMN IF NOT EXISTS mucous_membranes varchar(20),
  ADD COLUMN IF NOT EXISTS body_condition_score smallint,
  ADD COLUMN IF NOT EXISTS anamnesis text,
  ADD COLUMN IF NOT EXISTS physical_exam text,
  ADD COLUMN IF NOT EXISTS plan text;

ALTER TABLE public.veterinary_visits DROP CONSTRAINT IF EXISTS veterinary_visits_body_condition_check;
ALTER TABLE public.veterinary_visits ADD CONSTRAINT veterinary_visits_body_condition_check
  CHECK (body_condition_score IS NULL OR body_condition_score BETWEEN 1 AND 9);

ALTER TABLE public.veterinary_visits DROP CONSTRAINT IF EXISTS veterinary_visits_mucous_check;
ALTER TABLE public.veterinary_visits ADD CONSTRAINT veterinary_visits_mucous_check
  CHECK (mucous_membranes IS NULL OR mucous_membranes IN ('ROSADAS', 'PALIDAS', 'ICTERICAS', 'CIANOTICAS', 'HIPEREMICAS'));

-- El body de clínica ya no exige veterinarian (texto libre opcional)
ALTER TABLE public.veterinary_visits ALTER COLUMN veterinarian DROP NOT NULL;

CREATE INDEX IF NOT EXISTS veterinary_visits_pet_date_idx ON public.veterinary_visits (pet_id, date);
CREATE INDEX IF NOT EXISTS veterinary_visits_vet_date_idx ON public.veterinary_visits (veterinary_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS veterinary_visits_appointment_uidx
  ON public.veterinary_visits (appointment_id) WHERE appointment_id IS NOT NULL;

-- ============================================
-- 2. TRATAMIENTOS Y MEDICACIÓN
-- ============================================
CREATE TABLE IF NOT EXISTS public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.veterinary_visits (id),
  description text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS treatments_visit_idx ON public.treatments (visit_id);

CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid NOT NULL REFERENCES public.treatments (id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medications_treatment_idx ON public.medications (treatment_id);

-- ============================================
-- 3. CIRUGÍAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.pet_surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  veterinary_visit_id uuid NOT NULL REFERENCES public.veterinary_visits (id),
  title text NOT NULL,
  description text NOT NULL,
  surgery_date date NOT NULL,
  duration_minutes integer NOT NULL,
  anesthesia_used text,
  complications text,
  post_op_instructions text,
  outcome text,
  status text NOT NULL,
  next_checkup_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_surgeries
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS surgeon_employee_id uuid;

CREATE INDEX IF NOT EXISTS pet_surgeries_pet_idx ON public.pet_surgeries (pet_id, surgery_date);
CREATE INDEX IF NOT EXISTS pet_surgeries_visit_idx ON public.pet_surgeries (veterinary_visit_id);

-- ============================================
-- 4. LABORATORIOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.veterinary_visits (id),
  name text NOT NULL,
  result text,
  normal_range text,
  date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_tests
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS pet_id uuid,
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS attended_by_employee_id uuid;

CREATE INDEX IF NOT EXISTS lab_tests_visit_idx ON public.lab_tests (visit_id);
CREATE INDEX IF NOT EXISTS lab_tests_pet_idx ON public.lab_tests (pet_id);

-- ============================================
-- 5. VACUNAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.vaccines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  lot_number text,
  application_date date NOT NULL,
  next_dose_date date,
  veterinarian text,
  notes text,
  status varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vaccines
  ADD COLUMN IF NOT EXISTS manufacturer varchar(100),
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS applied_by_employee_id uuid;

-- Un dueño sin cuenta todavía no tiene user_id (MED-06)
ALTER TABLE public.vaccines ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS vaccines_pet_idx ON public.vaccines (pet_id, application_date);

-- ============================================
-- 6. PESO ("WeightRecord": nombres en PascalCase, con comillas)
-- ============================================
CREATE TABLE IF NOT EXISTS public."WeightRecord" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "PetId" uuid NOT NULL,
  "Weight" numeric(7,2) NOT NULL,
  "Date" date,
  "Note" text,
  "Created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."WeightRecord"
  ADD COLUMN IF NOT EXISTS "VeterinaryId" uuid,
  ADD COLUMN IF NOT EXISTS "Source" varchar(10) NOT NULL DEFAULT 'CLINIC';

ALTER TABLE public."WeightRecord" DROP CONSTRAINT IF EXISTS "WeightRecord_Source_check";
ALTER TABLE public."WeightRecord" ADD CONSTRAINT "WeightRecord_Source_check"
  CHECK ("Source" IN ('CLINIC', 'OWNER'));

CREATE INDEX IF NOT EXISTS weight_record_pet_idx ON public."WeightRecord" ("PetId", "Created_at");

-- ============================================
-- 7. AUDITORÍA CLÍNICA (MED-05)
-- ============================================
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

CREATE INDEX IF NOT EXISTS clinical_audit_log_record_idx ON public.clinical_audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS clinical_audit_log_vet_idx ON public.clinical_audit_log (veterinary_id, occurred_at);
