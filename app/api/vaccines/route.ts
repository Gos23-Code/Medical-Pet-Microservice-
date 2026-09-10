// app/api/vaccines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { AddVaccineUseCase } from '@/src/application/use-cases/vaccine/add-vaccine.use-case';
import { GetVaccinesByPetUseCase } from '@/src/application/use-cases/vaccine/get-vaccine-by-pet.use-case';
import { VaccineMapper } from '@/src/application/mappers/vaccine.mapper';
import { createVaccinePublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

const vaccineRepository = new VaccineRepository();
const vaccinePublisher = createVaccinePublisher();

// POST /api/vaccines - Crear vacuna
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("📦 Body recibido:", body);

    // ✅ Validar userId
    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId es requerido para notificaciones' },
        { status: 400 }
      );
    }

    // ✅ Validar petId
    if (!body.petId) {
      return NextResponse.json(
        { error: 'petId es requerido' },
        { status: 400 }
      );
    }

    // ✅ Validar name
    if (!body.name) {
      return NextResponse.json(
        { error: 'name es requerido' },
        { status: 400 }
      );
    }

    // ✅ Validar applicationDate
    if (!body.applicationDate) {
      return NextResponse.json(
        { error: 'applicationDate es requerido' },
        { status: 400 }
      );
    }

    const addVaccineUseCase = new AddVaccineUseCase(
      vaccineRepository,
      vaccinePublisher
    );
    
    // ✅ Guardar userId para usarlo después
    const userId = body.userId;
    
    const vaccine = await addVaccineUseCase.execute({
      userId: userId,
      petId: body.petId,
      name: body.name,
      lotNumber: body.lotNumber,
      applicationDate: new Date(body.applicationDate),
      nextDoseDate: body.nextDoseDate ? new Date(body.nextDoseDate) : null,
      veterinarian: body.veterinarian,
      notes: body.notes
    });

    // ✅ Pasar userId al mapper (segundo parámetro)
    const responseDTO = VaccineMapper.toDTO(vaccine, userId);
    return NextResponse.json(responseDTO, { status: 201 });
    
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear vacuna' },
      { status: 400 }
    );
  }
}

// GET /api/vaccines?petId={id}&userId={id} - Obtener vacunas por mascota
export async function GET(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId');
    const userId = request.nextUrl.searchParams.get('userId') || '';  // ✅ Obtener userId (opcional)
    
    if (!petId) {
      return NextResponse.json(
        { error: 'petId es requerido' },
        { status: 400 }
      );
    }

    const getVaccinesUseCase = new GetVaccinesByPetUseCase(vaccineRepository);
    const vaccines = await getVaccinesUseCase.execute(petId);
    
    // ✅ Pasar userId al mapper para cada vacuna
    const responseDTOs = vaccines.map(vaccine => VaccineMapper.toDTO(vaccine, userId));
    return NextResponse.json(responseDTOs);
    
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener vacunas' },
      { status: 400 }
    );
  }
}