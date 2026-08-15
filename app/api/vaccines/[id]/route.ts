// app/api/vaccines/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { UpdateVaccineUseCase } from '@/src/application/use-cases/vaccine/update-vaccine.use-case';
import { VaccineMapper } from '@/src/application/mappers/vaccine.mapper';

const vaccineRepository = new VaccineRepository();

// PUT /api/vaccines/{id} - Actualizar vacuna
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ CORRECTO: Usar await porque params es una Promise
    const params = await context.params;
    const id = params.id;
    
    console.log('📥 ID recibido en PUT:', id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la vacuna es requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    const updateVaccineUseCase = new UpdateVaccineUseCase(vaccineRepository);
    
    const vaccine = await updateVaccineUseCase.execute({
      id: id,
      name: body.name,
      lotNumber: body.lotNumber,
      applicationDate: body.applicationDate ? new Date(body.applicationDate) : undefined,
      nextDoseDate: body.nextDoseDate !== undefined 
        ? (body.nextDoseDate ? new Date(body.nextDoseDate) : null) 
        : undefined,
      veterinarian: body.veterinarian,
      notes: body.notes
    });

    const responseDTO = VaccineMapper.toDTO(vaccine);
    return NextResponse.json(responseDTO);
    
  } catch (error) {
    console.error('❌ Error en PUT /api/vaccines/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar vacuna' },
      { status: 400 }
    );
  }
}