-- ============================================
-- 007: desparasitación sin próxima dosis
-- Ejecutar DESPUÉS de 006. Se aplica a mano en el SQL Editor de Supabase.
--
-- Decisión: la desparasitación guarda solo la fecha de la última dosis. El intervalo depende del
-- producto y no se calcula en Medical. Se quita next_dose_date (y con ella su CHECK de fechas).
-- Si ya hay filas de prueba con next_dose_date, esa columna se pierde: no se usaba en ninguna pantalla.
-- ============================================

ALTER TABLE public.pet_dewormings DROP COLUMN IF EXISTS next_dose_date;
