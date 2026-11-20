// Aviso al agregar una medicación que coincide con una alergia vigente (DATOS_MASCOTA_CLINICA §5.5).
// Coincidencia por texto: el nombre de la medicación contiene el alérgeno o al revés (sin tildes ni mayúsculas).
// No conoce clases de fármacos: "Amoxicilina" no coincide con "Penicilina" si el texto no lo dice. Eso lo decide el veterinario.

export interface AllergyWarning {
  allergyId: string;
  allergen: string;
  severity: string;
}

const MIN_LENGTH = 4;

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function allergyWarningsFor(
  medicationName: string,
  activeAllergies: Array<{ id: string; allergen: string; severity: string }>
): AllergyWarning[] {
  const name = normalizeText(medicationName);
  if (name.length < MIN_LENGTH) return [];

  return activeAllergies
    .filter((allergy) => {
      const allergen = normalizeText(allergy.allergen);
      if (allergen.length < MIN_LENGTH) return false;
      return name.includes(allergen) || allergen.includes(name);
    })
    .map((allergy) => ({ allergyId: allergy.id, allergen: allergy.allergen, severity: allergy.severity }));
}
