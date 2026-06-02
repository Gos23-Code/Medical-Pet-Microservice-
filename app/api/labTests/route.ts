import { NextRequest, NextResponse } from 'next/server';
import { AddLabTestUseCase } from '@/src/application/use-cases/add-labTest.use-case';
import { SupabaseLabTestRepository } from '@/src/infrastructure/repositories/supabase-labTest.repository';
import { error } from 'console';
import { GetLabTestsByVisitIdUseCase } from '@/src/application/use-cases/get-labTests-byVisitId.use-case';

const repository = new SupabaseLabTestRepository();

//POST
export async function POST(req: NextRequest) {
  console.log('🚀 POST /api/labTests');
  try {
    const body = await req.json();
    console.log('📦 Body recibido:', body);

    if (!body.name) {
      return NextResponse.json(
        { error: 'name es requerido' },
        { status: 400 }
      );
    }

    const dto = {
      name: body.name,
      result: body.result,
      normal_range: body.normal_range,
      date: body.date,
      notes: body.notes,
    };

    const useCase = new AddLabTestUseCase(repository);
    const result = await useCase.execute(dto);

    return NextResponse.json(result, { status: 201 });

  } catch (error: unknown) {
    console.log('💥 Error:', error);
    const message = error instanceof Error
      ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
  //GET
  export async function GET(req:NextRequest){
    console.log('🚀 GET /api/labTests');
    try{
      const visit_id= req.nextUrl.searchParams.get('visit_id');

      if(!visit_id){
        return NextResponse.json({error: 'visit_id es requerido'},
          {status: 400}
        );
      }
      const useCase= new GetLabTestsByVisitIdUseCase(repository);
      const result= await useCase.execute(visit_id);
      return NextResponse.json(result, {status: 200})

    }catch(error:unknown){
      const message= error instanceof Error? error.message: 'Error interno';
      return NextResponse.json({erro: message}, {status:500});
    }
}