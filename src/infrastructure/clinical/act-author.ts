import { createClient } from '@/src/infrastructure/database/supabase/client';
import { NotFoundError } from '@/src/infrastructure/http/api-error';

// Lee de qué clínica es un acto clínico (null = lo registró el dueño).
// Se usa antes de modificar o borrar: ver assertSameAuthorSide en src/application/clinical/act-integrity.ts.

export interface ActLocation {
  table: string;
  /** Columna de la clínica. WeightRecord la tiene en PascalCase. */
  veterinaryColumn?: string;
  /** Columna y valor que identifican la fila (por id, o por mascota para el último peso). */
  filterColumn?: string;
  filterValue: string;
  /** Si hay varias filas, cuál: la más reciente por esta columna. */
  orderBy?: string;
}

export async function actVeterinaryId(location: ActLocation): Promise<{ veterinaryId: string | null }> {
  const column = location.veterinaryColumn ?? 'veterinary_id';
  const filter = location.filterColumn ?? 'id';

  let query = createClient()
    .from(location.table)
    .select(column)
    .eq(filter, location.filterValue);

  if (location.orderBy) {
    query = query.order(location.orderBy, { ascending: false }).limit(1);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Error leyendo la clínica del acto en ${location.table}: ${error.message}`);
  }
  if (!data) {
    throw new NotFoundError('ACT_NOT_FOUND', 'El acto clínico no existe');
  }

  const row = data as unknown as Record<string, string | null>;
  return { veterinaryId: row[column] ?? null };
}
