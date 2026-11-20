-- ============================================
-- 005: integridad de los actos clínicos
-- Ejecutar DESPUÉS de 001..004. No se ejecuta sola: se aplica a mano en el SQL Editor de Supabase.
--
-- Reglas que implementa:
--  • Corregir un acto NO sobrescribe la fila: crea una versión con autor, fecha y motivo.
--    La fila original queda intacta.
--  • La versión y la auditoría se escriben en la MISMA transacción (función apply_clinical_correction).
--  • Medicación guarda clínica, autor y rol como el resto de actos.
--  • El rol del autor es `source` (OWNER | CLINIC). CLINIC y VET son lo mismo.
--  • Los autores de usuario de registros antiguos quedan NULL (no se pueden reconstruir).
-- ============================================

-- ============================================
-- 1. Autoría que faltaba
-- ============================================
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS veterinary_id uuid,
  ADD COLUMN IF NOT EXISTS source varchar(10) NOT NULL DEFAULT 'CLINIC',
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS employee_id uuid;

ALTER TABLE public.medications DROP CONSTRAINT IF EXISTS medications_source_check;
ALTER TABLE public.medications ADD CONSTRAINT medications_source_check
  CHECK (source IN ('CLINIC', 'OWNER'));

ALTER TABLE public.vaccines
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

ALTER TABLE public.treatments
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

ALTER TABLE public.pet_surgeries
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

ALTER TABLE public.lab_tests
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

-- ============================================
-- 2. Backfill de medicación desde su tratamiento
--    (clínica y origen se pueden reconstruir; el usuario autor no)
-- ============================================
UPDATE public.medications m
SET veterinary_id = t.veterinary_id,
    source = t.source
FROM public.treatments t
WHERE m.treatment_id = t.id
  AND m.veterinary_id IS NULL;

-- Los created_by_user_id de vacunas, tratamientos, cirugías y medicación quedan NULL
-- en registros antiguos: no existen en la base de Medical. Se distinguen por created_by_user_id IS NULL.

-- ============================================
-- 3. Versiones de actos (correcciones y anulaciones)
-- ============================================
CREATE TABLE IF NOT EXISTS public.clinical_record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_table text NOT NULL,
  record_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  kind varchar(12) NOT NULL DEFAULT 'CORRECTION' CHECK (kind IN ('CORRECTION', 'ANNULMENT')),
  values jsonb NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) >= 5),
  author_user_id uuid NOT NULL,
  author_employee_id uuid,
  veterinary_id uuid,
  author_role varchar(10) NOT NULL CHECK (author_role IN ('CLINIC', 'OWNER')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (record_table, record_id, version)
);

CREATE INDEX IF NOT EXISTS clinical_record_versions_record_idx
  ON public.clinical_record_versions (record_table, record_id, version);

-- ============================================
-- 4. Función atómica: versión + auditoría en una sola transacción
--    Si el INSERT en la auditoría falla, la versión tampoco se guarda.
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_clinical_correction(
  p_table text,
  p_record_id uuid,
  p_reason text,
  p_values jsonb,
  p_author_user_id uuid,
  p_author_employee_id uuid,
  p_veterinary_id uuid,
  p_author_role text
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_next integer;
BEGIN
  IF p_table NOT IN ('vaccines', 'veterinary_visits', 'treatments', 'medications', 'lab_tests', 'pet_surgeries', 'WeightRecord') THEN
    RAISE EXCEPTION 'tabla no corregible: %', p_table USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next
  FROM public.clinical_record_versions
  WHERE record_table = p_table AND record_id = p_record_id;

  INSERT INTO public.clinical_record_versions (
    record_table, record_id, version, kind, values, reason,
    author_user_id, author_employee_id, veterinary_id, author_role
  ) VALUES (
    p_table, p_record_id, v_next, 'CORRECTION', p_values, p_reason,
    p_author_user_id, p_author_employee_id, p_veterinary_id, p_author_role
  );

  INSERT INTO public.clinical_audit_log (
    table_name, record_id, action, actor_user_id, veterinary_id, changes
  ) VALUES (
    p_table, p_record_id, 'UPDATE', p_author_user_id, p_veterinary_id,
    jsonb_build_object('correction_version', v_next, 'reason', p_reason)
  );

  RETURN v_next;
END;
$$;

-- Solo el backend (service role) puede llamarla
REVOKE EXECUTE ON FUNCTION public.apply_clinical_correction(text, uuid, text, jsonb, uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

-- ============================================
-- 5. RLS y permisos para anon/authenticated
--    El backend usa SUPABASE_SERVICE_ROLE_KEY (salta RLS). Esto bloquea el acceso directo con anon.
-- ============================================
ALTER TABLE public.clinical_record_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clinical_record_versions FROM anon, authenticated;

REVOKE UPDATE, DELETE ON public.vaccines, public.veterinary_visits, public.treatments,
  public.medications, public.lab_tests, public.pet_surgeries, public."WeightRecord"
  FROM anon, authenticated;
