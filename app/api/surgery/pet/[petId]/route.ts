// src/app/api/pet-surgery/pet/[petId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SupabasePetSurgeryRepository } from '@/src/infrastructure/database/repositories/supabase-pet-surgery.repository';
import { GetSurgeriesUseCase } from '@/src/application/use-cases/surgery/get-surgery.use-case';

const repository = new SupabasePetSurgeryRepository();
const getSurgeriesUseCase = new GetSurgeriesUseCase(repository);

// GET /api/pet-surgery/pet/[petId]?status=xxx&fromDate=xxx&toDate=xxx
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ petId: string }> }  // 👈 CAMBIO: Promise<{ petId: string }>
) {
  try {
    // 👈 CAMBIO: Await para params
    const { petId } = await params;
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const includeStats = searchParams.get('stats') === 'true';

    const filters = {
      petId: petId, // 👈 Usar la variable extraída
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
    console.error('Error fetching surgeries by pet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}