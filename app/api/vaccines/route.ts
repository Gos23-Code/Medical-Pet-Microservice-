// app/api/vaccines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VaccineRepository } from '@/src/infrastructure/database/repositories/supabase-vaccine.repository';
import { AddVaccineUseCase } from '@/src/application/use-cases/vaccine/add-vaccine.use-case';
import { GetVaccinesByPetUseCase } from '@/src/application/use-cases/vaccine/get-vaccine-by-pet.use-case';
import { VaccineMapper } from '@/src/application/mappers/vaccine.mapper';

const vaccineRepository = new VaccineRepository();

// POST /api/vaccines - Crear vacuna
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const addVaccineUseCase = new AddVaccineUseCase(vaccineRepository);
    
    const vaccine = await addVaccineUseCase.execute({
      petId: body.petId,
      name: body.name,
      lotNumber: body.lotNumber,
      applicationDate: new Date(body.applicationDate),
      nextDoseDate: body.nextDoseDate ? new Date(body.nextDoseDate) : null,
      veterinarian: body.veterinarian,
      notes: body.notes
    });

    const responseDTO = VaccineMapper.toDTO(vaccine);
    return NextResponse.json(responseDTO, { status: 201 });
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear vacuna' },
      { status: 400 }
    );
  }
}

// GET /api/vaccines?petId={id} - Obtener vacunas por mascota
export async function GET(request: NextRequest) {
  try {
    const petId = request.nextUrl.searchParams.get('petId');
    if (!petId) {
      return NextResponse.json(
        { error: 'petId es requerido' },
        { status: 400 }
      );
    }

    const getVaccinesUseCase = new GetVaccinesByPetUseCase(vaccineRepository);
    const vaccines = await getVaccinesUseCase.execute(petId);
    
    const responseDTOs = vaccines.map(vaccine => VaccineMapper.toDTO(vaccine));
    return NextResponse.json(responseDTOs);
    
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener vacunas' },
      { status: 400 }
    );
  }
}