import { createClient } from '@/src/infrastructure/database/supabase/client';

// Para rutas con id de registro (PUT /vaccines/{id}, GET /treatments/{id}…) la autorización
// necesita la mascota del registro (MED-03: "leer primero el registro para obtener su pet_id").
// Todo se resuelve dentro de Medical: nunca se lee la tabla de mascotas (AGENTS.md §6).

export async function petIdOfVisit(visitId: string): Promise<string | null> {
  const { data } = await createClient()
    .from('veterinary_visits')
    .select('pet_id')
    .eq('id', visitId)
    .maybeSingle();
  return data?.pet_id ?? null;
}

export async function petIdOfVaccine(vaccineId: string): Promise<string | null> {
  const { data } = await createClient()
    .from('vaccines')
    .select('pet_id')
    .eq('id', vaccineId)
    .maybeSingle();
  return data?.pet_id ?? null;
}

export async function petIdOfTreatment(treatmentId: string): Promise<string | null> {
  const { data } = await createClient()
    .from('treatments')
    .select('visit_id')
    .eq('id', treatmentId)
    .maybeSingle();
  return data ? petIdOfVisit(data.visit_id) : null;
}

export async function petIdOfMedication(medicationId: string): Promise<string | null> {
  const { data } = await createClient()
    .from('medications')
    .select('treatment_id')
    .eq('id', medicationId)
    .maybeSingle();
  return data ? petIdOfTreatment(data.treatment_id) : null;
}

export async function petIdOfSurgery(surgeryId: string): Promise<string | null> {
  const { data } = await createClient()
    .from('pet_surgeries')
    .select('pet_id')
    .eq('id', surgeryId)
    .maybeSingle();
  return data?.pet_id ?? null;
}

/** Los exámenes viejos no tienen pet_id: en ese caso se sube por la visita. */
export async function petIdOfLabTest(labTestId: string): Promise<string | null> {
  const { data } = await createClient()
    .from('lab_tests')
    .select('pet_id, visit_id')
    .eq('id', labTestId)
    .maybeSingle();
  if (!data) return null;
  return data.pet_id ?? petIdOfVisit(data.visit_id);
}
