import { NextRequest, NextResponse } from 'next/server';
import { AddWeightRecordUseCase } from '@/src/application/use-cases/weight-record/add-weight-record.use-case';
import { GetAllWeightRecordsUseCase } from '@/src/application/use-cases/weight-record/get-all-weigh-records.use-case';
import { GetWeightRecordsByPetIdUseCase } from '@/src/application/use-cases/weight-record/get-weigh-record-by-pet.use-case';
import { UpdateWeightRecordUseCase} from '@/src/application/use-cases/weight-record/update-weight-record.use-case';
import { SupabaseWeightRecordRepository } from '@/src/infrastructure/database/repositories/supabase-weight-record.repository';
import { GetLatestWeightRecordByPetIdUseCase } from '@/src/application/use-cases//weight-record/get-latest-weight-record.use-case';

const repository = new SupabaseWeightRecordRepository();

//POST
export async function POST(req: NextRequest) {
  console.log('🚀 POST /api/weightRecord');
  try {
    const body = await req.json();

    const dto = {
      petId: body.petId,
      weight: body.weight,
      date: body.date,
      note: body.note,
    };

    const useCase = new AddWeightRecordUseCase(repository);
    const result = await useCase.execute(dto);

    return NextResponse.json(result, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message : 'Error interno';
    console.error('❌ Error en POST:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

//GET
export async function GET(req: NextRequest) {
  console.log('🚀 GET /api/weightRecord');
  try {
    const petId = req.nextUrl.searchParams.get('petId');
    const latest = req.nextUrl.searchParams.get('latest');

    console.log('📝 petId:', petId);
    console.log('📝 latest:', latest);

    // GetLatest - /api/weightRecord?petId=...&latest=true
    if (petId && latest === 'true') {
      console.log('🔍 Obteniendo último registro para petId:', petId);
      const useCase = new GetLatestWeightRecordByPetIdUseCase(repository);
      const result = await useCase.execute(petId);
      return NextResponse.json(result, { status: 200 });
    }

    // GetWeightRecordByPetId - api/weightRecord?petId=...
    if (petId) {
      console.log('🔍 Obteniendo todos los registros para petId:', petId);
      const useCase = new GetWeightRecordsByPetIdUseCase(repository);
      const result = await useCase.execute(petId);
      return NextResponse.json(result, { status: 200 });
    }

    // GetAll - /api/weightRecord
    console.log('🔍 Obteniendo todos los registros');
    const useCase = new GetAllWeightRecordsUseCase(repository);
    const result = await useCase.execute();
    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('❌ Error en GET:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

//PATCH
export async function PATCH(req: NextRequest) {
  console.log('🚀 PATCH /api/weightRecord');
  try {
    const petId = req.nextUrl.searchParams.get('petId');

    if (!petId) {
      return NextResponse.json(
        { error: 'PetId es requerido' },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (!body.weight) {
      return NextResponse.json(
        { error: 'weight es requerido' },
        { status: 400 }
      );
    }

    const useCase = new UpdateWeightRecordUseCase(repository);
    const result = await useCase.execute(petId, { weight: body.weight });

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message : 'Error interno';
    console.error('❌ Error en PATCH:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}