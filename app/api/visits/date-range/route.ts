import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/src/infrastructure/database/supabase/client';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { requireClinicWithRead } from '@/src/infrastructure/auth/clinic-read';
import { toVisitResponse, VisitRow } from '@/src/application/mappers/visit-response.mapper';

// GET /api/visits/date-range?startDate=&endDate=
// Solo para la clínica: lista visitas de TODAS las mascotas, así que un dueño no tiene forma
// de hacerla sin ver datos ajenos. Filtra por el veterinary_id del token (MED-07, contrato §1.5).
export const GET = withAuth(async (request: NextRequest, _context, actor) => {
  console.log('📝 GET /api/visits/date-range - Buscando visitas por rango de fechas');

  const clinic = requireClinicWithRead(actor);
  const supabase = createClient();

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json(
      {
        success: false,
        message: 'Se requieren startDate y endDate. Ejemplo: ?startDate=2024-01-01&endDate=2024-12-31',
      },
      { status: 400 }
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { success: false, message: 'La fecha de inicio debe ser menor o igual a la fecha de fin' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('veterinary_visits')
    .select('*')
    .eq('veterinary_id', clinic.veterinaryId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('❌ Error de Supabase:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  const visits = (data || []).map((visit) => toVisitResponse(visit as VisitRow));

  return NextResponse.json({
    success: true,
    data: visits,
    count: visits.length,
    dateRange: { startDate, endDate },
  });
});
