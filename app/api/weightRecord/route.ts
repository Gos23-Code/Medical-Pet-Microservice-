import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { AddWeightRecordUseCase } from '@/src/application/use-cases/add-weightRecord.use-case';
import { SupabaseWeightRecordRepository } from '@/src/infrastructure/repositories/supabase-weightRecord.repository';

export async function POST(req: NextRequest) {
  console.log('🚀 POST /api/weightRecord - iniciando');

  try {
    const body = await req.json();
    console.log('📦 Body recibido:', body);

    const dto = {
      petId: uuidv4(),
      weight: body.weight,
      date: body.date,
      note: body.note,
    };
    console.log('📝 DTO armado:', dto);

    const repository = new SupabaseWeightRecordRepository();
    const useCase = new AddWeightRecordUseCase(repository);
    console.log('⚙️ Ejecutando use case...');

    const result = await useCase.execute(dto);
    console.log('✅ Resultado:', result);

    return NextResponse.json(result, { status: 201 });

  } catch (error: unknown) {
    console.log('💥 Error capturado:', error);
    const message = error instanceof Error
      ? error.message : 'Error interno del servidor';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}