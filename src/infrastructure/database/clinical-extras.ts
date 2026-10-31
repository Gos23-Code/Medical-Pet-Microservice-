import { createClient } from '@/src/infrastructure/database/supabase/client';

// Escritura y lectura de columnas que los casos de uso originales no conocen.
// Se usan después de que el caso de uso crea o lee la fila principal. No es transaccional
// (supabase-js no ofrece transacciones): si falla, la fila principal ya existe y el error sube a la ruta.

/** UPDATE de columnas nuevas sobre una fila existente. No hace nada si `values` está vacío. */
export async function saveExtras(table: string, id: string, values: Record<string, unknown>): Promise<void> {
  if (Object.keys(values).length === 0) return;

  const { error } = await createClient().from(table).update(values).eq('id', id);
  if (error) {
    throw new Error(`Error guardando columnas nuevas en ${table}: ${error.message}`);
  }
}

/** Lee columnas nuevas de varias filas. Devuelve un mapa id → fila (solo con las columnas pedidas). */
export async function loadExtras(
  table: string,
  ids: string[],
  columns: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const result = new Map<string, Record<string, unknown>>();
  if (ids.length === 0) return result;

  const { data, error } = await createClient()
    .from(table)
    .select(['id', ...columns].join(', '))
    .in('id', ids);

  if (error) {
    throw new Error(`Error leyendo columnas nuevas de ${table}: ${error.message}`);
  }

  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    result.set(String(row.id), row);
  }
  return result;
}
