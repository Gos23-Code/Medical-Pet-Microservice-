// app/api/vaccines/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { UpdateVaccineUseCase } from '@/src/application/use-cases/vaccine/update-vaccine.use-case';
import { VaccineMapper } from '@/src/application/mappers/vaccine.mapper';
import { createVaccinePublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

const vaccineRepository = new VaccineRepository();
const vaccinePublisher = createVaccinePublisher();

// PUT /api/vaccines/{id} - Actualizar vacuna
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
    
    console.log('📥 Body recibido:', body);

    // ✅ Validar userId
    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId es requerido para notificaciones' },
        { status: 400 }
      );
    }
    
    const updateVaccineUseCase = new UpdateVaccineUseCase(
      vaccineRepository,
      vaccinePublisher
    );
    
    const vaccine = await updateVaccineUseCase.execute({
      id: id,
      userId: body.userId,
      petId: body.petId,  // ✅ PASAR petId
      name: body.name,
      lotNumber: body.lotNumber,
      applicationDate: body.applicationDate ? new Date(body.applicationDate) : undefined,
      nextDoseDate: body.nextDoseDate !== undefined 
        ? (body.nextDoseDate ? new Date(body.nextDoseDate) : null) 
        : undefined,
      veterinarian: body.veterinarian,
      notes: body.notes,
      status: body.status
    });

    // ✅ Pasar userId al mapper
    const responseDTO = VaccineMapper.toDTO(vaccine, body.userId);
    return NextResponse.json(responseDTO);
    
  } catch (error) {
    console.error('❌ Error en PUT /api/vaccines/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al actualizar vacuna' },
      { status: 400 }
    );
  }
}