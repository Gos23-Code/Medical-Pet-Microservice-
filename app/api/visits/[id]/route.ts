import { withCorrections } from '@/src/infrastructure/clinical/act-versions';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { toVisitResponse, VisitRow } from '@/src/application/mappers/visit-response.mapper';
import { overwriteRefused } from '@/src/infrastructure/clinical/correction-handlers';

type RouteContext = { params: Promise<{ id: string }> };

// PUT ya no sobrescribe: la corrección es POST /api/visits/{id}/corrections (motivo obligatorio).
export const PUT = overwriteRefused('/api/visits/{id}/corrections');

// GET /api/visits/[id] - Dueño de la mascota o clínica con CLINICAL_READ (MED-03)
export const GET = withAuth(async (_request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;
  console.log('📝 GET /api/visits/[id] - Obteniendo visita', id);

  const { data, error } = await createClient()
    .from('veterinary_visits')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // Un id inexistente llega como error de "no rows" de PostgREST
    if (error.code === 'PGRST116') {
      return NextResponse.json({ success: false, message: 'Visita no encontrada' }, { status: 404 });
    }
    console.error('❌ Error de Supabase:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, message: 'Visita no encontrada' }, { status: 404 });
  }

  await authorizePet(actor, data.pet_id, 'CLINICAL_READ');

  return NextResponse.json(await withCorrections('veterinary_visits', { success: true, data: toVisitResponse(data as VisitRow) }));
});
