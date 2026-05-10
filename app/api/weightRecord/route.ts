import { NextRequest, NextResponse } from 'next/server';
import { AddWeightRecordUseCase } from '@/src/application/use-cases/add-weightRecord.use-case';
import { GetAllWeightRecordsUseCase } from '@/src/application/use-cases/get-all-weightRecords.use-case';
import { UpdateWeightRecordUseCase} from '@/src/application/use-cases/update-weightRecord.use-case';
import { SupabaseWeightRecordRepository } from '@/src/infrastructure/repositories/supabase-weightRecord.repository';

const repository = new SupabaseWeightRecordRepository();

//POST
export async function POST(req: NextRequest) {
  console.log('🚀 POST /api/weightRecord');
  try {
    const body = await req.json();

    const dto = {
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

//GET
export async function GET() {
  console.log('🚀 GET /api/weightRecord');
  try {
    const useCase = new GetAllWeightRecordsUseCase(repository);
    const result = await useCase.execute();

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

//PATCH
export async function PATCH(req: NextRequest) {
  console.log('🚀 PATCH /api/weightRecord');
  try {
    //api/weightRecord?tetId=...
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}