
import { NextRequest, NextResponse } from 'next/server';
import { SupabasePetSurgeryRepository } from '@/src/infrastructure/database/repositories/supabase-pet-surgery.repository';
import { GetSurgeriesUseCase } from '@/src/application/use-cases/surgery/get-surgery.use-case';
import { PetSurgery } from '@/src/domain/entities/pet-surgery.entity';

const repository = new SupabasePetSurgeryRepository();
const getSurgeriesUseCase = new GetSurgeriesUseCase(repository);

// GET /api/pet-surgery?visitId=xxx&petId=xxx&status=xxx&fromDate=xxx&toDate=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visitId = searchParams.get('visitId');
    const petId = searchParams.get('petId');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const includeStats = searchParams.get('stats') === 'true';

    // Validar que haya al menos un filtro
    if (!visitId && !petId) {
      return NextResponse.json(
        { error: 'At least one filter is required: visitId or petId' },
        { status: 400 }
      );
    }

    const filters = {
      visitId: visitId || undefined,
      petId: petId || undefined,
      status: status || undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    // Si se solicitan estadísticas
    if (includeStats) {
      const statistics = await getSurgeriesUseCase.getStatistics(filters);
      return NextResponse.json({ success: true, data: { statistics } });
    }

    // Obtener cirugías con filtros
    const surgeries = await getSurgeriesUseCase.execute(filters);
    
    return NextResponse.json({ 
      success: true, 
      data: surgeries.map((s: PetSurgery) => s.toJSON()),
      count: surgeries.length 
    });
    
  } catch (error) {
    console.error('Error fetching surgeries:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const status = errorMessage.includes('required') ? 400 : 500;
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  }
}

