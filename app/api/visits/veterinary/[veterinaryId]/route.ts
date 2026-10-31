import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { assertClinicPath } from '@/src/infrastructure/auth/clinical-access';
import { requireClinicWithRead } from '@/src/infrastructure/auth/clinic-read';
import { toVisitResponse, VisitRow } from '@/src/application/mappers/visit-response.mapper';

// GET /api/visits/veterinary/[veterinaryId]?from=&to=
// MED-07: visitas registradas por UNA clínica. El veterinaryId de la ruta debe ser el del token (§1.5).
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ veterinaryId: string }> }, actor) => {
  const { veterinaryId } = await context.params;
  assertClinicPath(actor, veterinaryId);
  requireClinicWithRead(actor);

  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');

  let query = createClient()
    .from('veterinary_visits')
    .select('*')
    .eq('veterinary_id', veterinaryId)
    .order('date', { ascending: false });

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query;
  if (error) {
    console.error('❌ Error de Supabase:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  const visits = (data || []).map((visit) => toVisitResponse(visit as VisitRow));

  return NextResponse.json({ success: true, data: visits, count: visits.length, veterinaryId });
});
