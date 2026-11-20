import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { getVersions, postCorrection } from '@/src/infrastructure/clinical/correction-handlers';

// POST /api/weight/[id]/corrections → nueva versión (motivo obligatorio). El registro de peso original no cambia.
// GET  /api/weight/[id]/corrections → versiones del acto.
async function petIdOfWeightRecord(recordId: string): Promise<string | null> {
  const { data } = await createClient().from('WeightRecord').select('PetId').eq('id', recordId).maybeSingle();
  return (data?.PetId as string | undefined) ?? null;
}

const config = {
  table: 'WeightRecord' as const,
  petIdOf: petIdOfWeightRecord,
  writeNeed: 'WEIGHT_WRITE' as const,
  fields: ['weight', 'unit', 'note'] as const,
};

export const POST = withAuth(postCorrection(config));
export const GET = withAuth(getVersions(config));
