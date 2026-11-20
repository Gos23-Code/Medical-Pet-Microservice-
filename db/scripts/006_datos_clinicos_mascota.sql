-- ============================================
-- 006: datos clínicos de la mascota (esterilización, alergias, desparasitación)
-- Ejecutar DESPUÉS de 001..005. Se aplica a mano en el SQL Editor de Supabase.
--
--  • pet_clinical_profile: estado por mascota (alergias UNKNOWN/NONE_KNOWN y esterilización).
--    Es estado, no acto: se actualiza en la fila, con autor y fecha. Cada cambio queda en clinical_audit_log.
--  • pet_allergies: alergias. Se corrigen con versiones (clinical_record_versions), nunca se borran.
--  • pet_dewormings: dosis de desparasitación. Igual que las alergias: correcciones con motivo.
--  • apply_clinical_correction acepta las dos tablas nuevas (misma firma que 005).
-- ============================================

-- ============================================
-- 1. Perfil clínico de la mascota (una fila por mascota)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pet_clinical_profile (
  pet_id uuid PRIMARY KEY,
  allergy_status varchar(12) NOT NULL DEFAULT 'UNKNOWN'
    CHECK (allergy_status IN ('UNKNOWN', 'NONE_KNOWN')),
  allergy_status_source varchar(10) CHECK (allergy_status_source IN ('OWNER', 'CLINIC')),
  allergy_status_user_id uuid,
  allergy_status_veterinary_id uuid,
  neutered_status varchar(8) NOT NULL DEFAULT 'UNKNOWN'
    CHECK (neutered_status IN ('YES', 'NO', 'UNKNOWN')),
  neutered_at date,
  neutered_source varchar(10) CHECK (neutered_source IN ('OWNER', 'CLINIC')),
  neutered_user_id uuid,
  neutered_veterinary_id uuid,
  neutered_confirmed_employee_id uuid,
  neutered_confirmed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Solo tiene sentido la fecha si la mascota está esterilizada
  CHECK (neutered_at IS NULL OR neutered_status = 'YES')
);

-- ============================================
-- 2. Alergias
--    `status` y `source` son el estado y el origen con que se creó la fila.
--    El estado actual sale de la última versión (clinical_record_versions).
-- ============================================
CREATE TABLE IF NOT EXISTS public.pet_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  allergen text NOT NULL CHECK (char_length(btrim(allergen)) > 0),
  category varchar(12) NOT NULL CHECK (category IN ('DRUG', 'FOOD', 'ENVIRONMENT', 'OTHER')),
  reaction text,
  severity varchar(10) NOT NULL CHECK (severity IN ('MILD', 'MODERATE', 'SEVERE')),
  status varchar(20) NOT NULL CHECK (status IN ('SUSPECTED', 'CONFIRMED', 'RESOLVED', 'ENTERED_IN_ERROR')),
  notes text,
  source varchar(10) NOT NULL CHECK (source IN ('OWNER', 'CLINIC')),
  created_by_user_id uuid NOT NULL,
  veterinary_id uuid,
  employee_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Dueño: nunca nace confirmada. Clínica: nace confirmada.
  CHECK ((source = 'OWNER' AND status = 'SUSPECTED') OR (source = 'CLINIC' AND status = 'CONFIRMED' AND veterinary_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS pet_allergies_pet_idx ON public.pet_allergies (pet_id);

-- ============================================
-- 3. Desparasitaciones
-- ============================================
CREATE TABLE IF NOT EXISTS public.pet_dewormings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  kind varchar(10) NOT NULL CHECK (kind IN ('INTERNAL', 'EXTERNAL')),
  product text NOT NULL CHECK (char_length(btrim(product)) > 0),
  active_ingredient text,
  dose text,
  weight_kg numeric(6, 2) CHECK (weight_kg IS NULL OR weight_kg > 0),
  application_date date NOT NULL,
  next_dose_date date,
  notes text,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENTERED_IN_ERROR')),
  source varchar(10) NOT NULL CHECK (source IN ('OWNER', 'CLINIC')),
  created_by_user_id uuid NOT NULL,
  veterinary_id uuid,
  employee_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (next_dose_date IS NULL OR next_dose_date > application_date)
);

CREATE INDEX IF NOT EXISTS pet_dewormings_pet_idx ON public.pet_dewormings (pet_id, kind, application_date);

-- ============================================
-- 4. Función de correcciones: ahora admite las tablas nuevas (misma firma que 005)
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
  IF p_table NOT IN ('vaccines', 'veterinary_visits', 'treatments', 'medications', 'lab_tests',
                     'pet_surgeries', 'WeightRecord', 'pet_allergies', 'pet_dewormings') THEN
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

REVOKE EXECUTE ON FUNCTION public.apply_clinical_correction(text, uuid, text, jsonb, uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

-- ============================================
-- 5. RLS y permisos: solo el backend (service role) escribe o lee
-- ============================================
ALTER TABLE public.pet_clinical_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_dewormings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pet_clinical_profile FROM anon, authenticated;
REVOKE ALL ON public.pet_allergies FROM anon, authenticated;
REVOKE ALL ON public.pet_dewormings FROM anon, authenticated;

-- Los actos no se sobrescriben ni se borran desde la API
REVOKE UPDATE, DELETE ON public.pet_allergies, public.pet_dewormings FROM anon, authenticated;
