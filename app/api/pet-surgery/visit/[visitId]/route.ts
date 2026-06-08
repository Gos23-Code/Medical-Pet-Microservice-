// src/app/api/pet-surgery/visit/[visitId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SupabasePetSurgeryRepository } from '@/infrastructure/repositories/supabase-pet-surgery.repository';
import { GetSurgeriesUseCase } from '@/application/use-cases/get-surgery.use-case';

const repository = new SupabasePetSurgeryRepository();
const getSurgeriesUseCase = new GetSurgeriesUseCase(repository);

// GET /api/pet-surgery/visit/[visitId]?status=xxx&fromDate=xxx&toDate=xxx
export async function GET(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const includeStats = searchParams.get('stats') === 'true';

    const filters = {
      visitId: params.visitId,
      status: status || undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    // Si se solicitan estadísticas
    if (includeStats) {
      const statistics = await getSurgeriesUseCase.getStatistics(filters);
      return NextResponse.json({ success: true, data: { statistics } });
    }

    const surgeries = await getSurgeriesUseCase.execute(filters);
    
    return NextResponse.json({ 
      success: true, 
      data: surgeries.map(s => s.toJSON()),
      count: surgeries.length 
    });
    
  } catch (error) {
    console.error('Error fetching surgeries by visit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}