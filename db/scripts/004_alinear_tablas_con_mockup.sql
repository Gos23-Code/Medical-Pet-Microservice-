-- 004_alinear_tablas_con_mockup.sql
-- Alinea las 7 tablas de Medical con las pantallas del mockup de MyAnimaLogVet (historia clínica:
-- Consultas, Cirugías, Laboratorio, Tratamientos, Vacunas, Peso y Documentos).
--
-- Orden: 001 → 002 → 003 → 004. Es incremental: no borra ni renombra columnas existentes.
-- Idempotente: ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT IF EXISTS antes de cada CHECK,
-- y CREATE TABLE IF NOT EXISTS para las tablas nuevas.
--
-- Campos "Origen" (Clínica / Dueño): cuando el registro lo hizo el dueño desde la app,
-- veterinary_id va en NULL y source = 'OWNER'.

-- ============================================
-- 1. CONSULTAS (veterinary_visits) · pestaña Consultas
--    Ya cubiertas en 003: signos vitales, anamnesis, examen físico, diagnóstico, plan,
--    appointment_id ("desde la cita"). Aquí solo se asegura el origen y el autor.
-- ============================================
ALTER TABLE public.veterinary_visits
  ADD COLUMN IF NOT EXISTS source varchar(10) NOT NULL DEFAULT 'CLINIC',
  ADD COLUMN IF NOT EXISTS heart_rate smallint,
  ADD COLUMN IF NOT EXISTS respiratory_rate smallint,
  ADD COLUMN IF NOT EXISTS mucous_membranes varchar(20),
  ADD COLUMN IF NOT EXISTS body_condition_score smallint,
  ADD COLUMN IF NOT EXISTS anamnesis text,
  ADD COLUMN IF NOT EXISTS physical_exam text,
  ADD COLUMN IF NOT EXISTS plan text;

ALTER TABLE public.veterinary_visits DROP CONSTRAINT IF EXISTS veterinary_visits_source_check;
ALTER TABLE public.veterinary_visits ADD CONSTRAINT veterinary_visits_source_check
  CHECK (source IN ('CLINIC', 'OWNER'));

ALTER TABLE public.veterinary_visits DROP CONSTRAINT IF EXISTS veterinary_visits_body_condition_check;
ALTER TABLE public.veterinary_visits ADD CONSTRAINT veterinary_visits_body_condition_check
  CHECK (body_condition_score IS NULL OR body_condition_score BETWEEN 1 AND 9);

ALTER TABLE public.veterinary_visits DROP CONSTRAINT IF EXISTS veterinary_visits_mucous_check;
ALTER TABLE public.veterinary_visits ADD CONSTRAINT veterinary_visits_mucous_check
  CHECK (mucous_membranes IS NULL OR mucous_membranes IN ('ROSADAS', 'PALIDAS', 'ICTERICAS', 'CIANOTICAS', 'HIPEREMICAS'));

-- Autor con tarjeta verificada: el nombre y la tarjeta viven en User/Veterinary; aquí solo los IDs.
ALTER TABLE public.veterinary_visits ALTER COLUMN veterinarian DROP NOT NULL;

-- ============================================
-- 2. CIRUGÍAS (pet_surgeries) · pestaña Cirugías
--    Fecha y hora ("Martes 22 sep 2026 · 8:30 a.m."), riesgo ASA, cirujana, consulta relacionada.
-- ============================================
ALTER TABLE public.pet_surgeries
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS asa_risk smallint,
  ADD COLUMN IF NOT EXISTS source varchar(10) NOT NULL DEFAULT 'CLINIC',
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS surgeon_employee_id uuid;

ALTER TABLE public.pet_surgeries DROP CONSTRAINT IF EXISTS pet_surgeries_asa_check;
ALTER TABLE public.pet_surgeries ADD CONSTRAINT pet_surgeries_asa_check
  CHECK (asa_risk IS NULL OR asa_risk BETWEEN 1 AND 5);

ALTER TABLE public.pet_surgeries DROP CONSTRAINT IF EXISTS pet_surgeries_source_check;
ALTER TABLE public.pet_surgeries ADD CONSTRAINT pet_surgeries_source_check
  CHECK (source IN ('CLINIC', 'OWNER'));

-- ============================================
-- 3. TRATAMIENTOS (treatments) · pestaña Tratamientos
--    Activo / Finalizado / Suspendido, indicado por, indicaciones, origen.
-- ============================================
ALTER TABLE public.treatments
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVO',
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS source varchar(10) NOT NULL DEFAULT 'CLINIC',
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS prescribed_by_employee_id uuid;

ALTER TABLE public.treatments DROP CONSTRAINT IF EXISTS treatments_status_check;
ALTER TABLE public.treatments ADD CONSTRAINT treatments_status_check
  CHECK (status IN ('ACTIVO', 'FINALIZADO', 'SUSPENDIDO'));

ALTER TABLE public.treatments DROP CONSTRAINT IF EXISTS treatments_source_check;
ALTER TABLE public.treatments ADD CONSTRAINT treatments_source_check
  CHECK (source IN ('CLINIC', 'OWNER'));

-- ============================================
-- 4. MEDICACIÓN (medications) · historial de medicamentos
--    Dosis, frecuencia, duración, "Desde el 28 sep", estado Activo / Terminado / Reacción.
-- ============================================
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'ACTIVO',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS reaction_note text;

ALTER TABLE public.medications DROP CONSTRAINT IF EXISTS medications_status_check;
ALTER TABLE public.medications ADD CONSTRAINT medications_status_check
  CHECK (status IN ('ACTIVO', 'TERMINADO', 'REACCION'));

-- ============================================
-- 5. LABORATORIO (lab_tests) · pestaña Laboratorio
--    Examen con laboratorio, estado global, interpretación del veterinario, PDF.
-- ============================================
ALTER TABLE public.lab_tests
  ADD COLUMN IF NOT EXISTS status varchar(20),
  ADD COLUMN IF NOT EXISTS laboratory_name varchar(120),
  ADD COLUMN IF NOT EXISTS interpretation text,
  ADD COLUMN IF NOT EXISTS source varchar(10) NOT NULL DEFAULT 'CLINIC';

ALTER TABLE public.lab_tests DROP CONSTRAINT IF EXISTS lab_tests_status_check;
ALTER TABLE public.lab_tests ADD CONSTRAINT lab_tests_status_check
  CHECK (status IS NULL OR status IN ('NORMAL', 'FUERA_DE_RANGO', 'ANORMAL', 'NEGATIVO', 'POSITIVO'));

ALTER TABLE public.lab_tests DROP CONSTRAINT IF EXISTS lab_tests_source_check;
ALTER TABLE public.lab_tests ADD CONSTRAINT lab_tests_source_check
  CHECK (source IN ('CLINIC', 'OWNER'));

-- Parámetros del examen: "Parámetro · Resultado · Rango normal · Estado" (tabla del mockup)
CREATE TABLE IF NOT EXISTS public.lab_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_test_id uuid NOT NULL REFERENCES public.lab_tests (id) ON DELETE CASCADE,
  parameter_name text NOT NULL,
  result text NOT NULL,
  unit varchar(20),
  reference_text varchar(60),
  flag varchar(20) NOT NULL DEFAULT 'NORMAL',
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_test_results DROP CONSTRAINT IF EXISTS lab_test_results_flag_check;
ALTER TABLE public.lab_test_results ADD CONSTRAINT lab_test_results_flag_check
  CHECK (flag IN ('NORMAL', 'ALTO', 'BAJO', 'NEGATIVO', 'POSITIVO', 'ANORMAL'));

CREATE INDEX IF NOT EXISTS lab_test_results_test_idx ON public.lab_test_results (lab_test_id, position);

-- ============================================
-- 6. VACUNAS (vaccines) · carnet de vacunas
--    Lote, laboratorio, aplicó, próxima dosis, Vigente / Por vencer / Vencida / Anterior, origen.
-- ============================================
ALTER TABLE public.vaccines
  ADD COLUMN IF NOT EXISTS source varchar(10) NOT NULL DEFAULT 'CLINIC',
  ADD COLUMN IF NOT EXISTS replaced_by_id uuid REFERENCES public.vaccines (id);

ALTER TABLE public.vaccines DROP CONSTRAINT IF EXISTS vaccines_source_check;
ALTER TABLE public.vaccines ADD CONSTRAINT vaccines_source_check
  CHECK (source IN ('CLINIC', 'OWNER'));

-- "Anterior · Reemplazada": una dosis reemplazada apunta a la que la sustituye (replaced_by_id).
CREATE INDEX IF NOT EXISTS vaccines_replaced_idx ON public.vaccines (replaced_by_id);

-- ============================================
-- 7. PESO (WeightRecord) · pestaña Peso
--    Origen (Dueño-app / Clínica), quién registró (dueño, veterinario, auxiliar).
-- ============================================
ALTER TABLE public."WeightRecord"
  ADD COLUMN IF NOT EXISTS "RegisteredByUserId" uuid,
  ADD COLUMN IF NOT EXISTS "RegisteredByEmployeeId" uuid,
  ADD COLUMN IF NOT EXISTS "RegisteredByRole" varchar(20);

-- ============================================
-- 8. DOCUMENTOS (tabla nueva) · pestaña Documentos y PDFs de laboratorio/cirugía
--    Metadatos aquí; el archivo vive en Storage privado (nunca URL pública).
-- ============================================
CREATE TABLE IF NOT EXISTS public.clinical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  visit_id uuid REFERENCES public.veterinary_visits (id),
  surgery_id uuid REFERENCES public.pet_surgeries (id),
  lab_test_id uuid REFERENCES public.lab_tests (id),
  document_type varchar(30) NOT NULL,
  title text NOT NULL,
  storage_path text NOT NULL,
  mime_type varchar(100) NOT NULL,
  size_bytes bigint NOT NULL,
  source varchar(10) NOT NULL DEFAULT 'CLINIC',
  veterinary_id uuid,
  uploaded_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_documents DROP CONSTRAINT IF EXISTS clinical_documents_type_check;
ALTER TABLE public.clinical_documents ADD CONSTRAINT clinical_documents_type_check
  CHECK (document_type IN ('LABORATORIO', 'IMAGEN', 'CONSENTIMIENTO', 'FORMULA', 'CERTIFICADO', 'VACUNAS', 'PROTOCOLO', 'OTRO'));

ALTER TABLE public.clinical_documents DROP CONSTRAINT IF EXISTS clinical_documents_source_check;
ALTER TABLE public.clinical_documents ADD CONSTRAINT clinical_documents_source_check
  CHECK (source IN ('CLINIC', 'OWNER'));

CREATE INDEX IF NOT EXISTS clinical_documents_pet_idx ON public.clinical_documents (pet_id, created_at);
CREATE INDEX IF NOT EXISTS clinical_documents_visit_idx ON public.clinical_documents (visit_id);

-- ============================================
-- 9. BUCKET PRIVADO DE DOCUMENTOS (Storage)
--    Archivos de la historia (PDF, JPG, PNG, máx. 10 MB). Privado: nunca URL pública.
--    Las lecturas usan URL firmadas de 10 minutos desde el backend (SUPABASE_SERVICE_ROLE_KEY).
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('clinical-documents', 'clinical-documents', false, 10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];
