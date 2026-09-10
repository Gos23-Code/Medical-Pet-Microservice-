import { NextRequest, NextResponse } from 'next/server';
import { AddWeightRecordUseCase } from '@/src/application/use-cases/weight-record/add-weight-record.use-case';
import { GetAllWeightRecordsUseCase } from '@/src/application/use-cases/weight-record/get-all-weigh-records.use-case';
import { GetWeightRecordsByPetIdUseCase } from '@/src/application/use-cases/weight-record/get-weigh-record-by-pet.use-case';
import { UpdateWeightRecordUseCase} from '@/src/application/use-cases/weight-record/update-weight-record.use-case';
import { SupabaseWeightRecordRepository } from '@/src/infrastructure/database/repositories/supabase-weight-record.repository';
import { GetLatestWeightRecordByPetIdUseCase } from '@/src/application/use-cases//weight-record/get-latest-weight-record.use-case';
import { createWeightRecordPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

const repository = new SupabaseWeightRecordRepository();

// ✅ Obtener instancia del publisher
const weightRecordPublisher = createWeightRecordPublisher();

// ============================================
// POST - Crear registro de peso
// ============================================
export async function POST(req: NextRequest) {
  console.log('🚀 POST /api/weightRecord');
  try {
    const body = await req.json();

    console.log("📦 Body recibido:", body);

    // ✅ Validar userId (necesario para notificaciones)
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

    // ✅ Validar weight
    if (!body.weight) {
      return NextResponse.json(
        { error: 'weight es requerido' },
        { status: 400 }
      );
    }

    // ✅ Crear DTO con todos los campos requeridos
    const dto = {
      userId: body.userId,
      petId: body.petId,
      weight: body.weight,
      unit: body.unit || 'kg',
      date: body.date,
      note: body.note,
    };

    const useCase = new AddWeightRecordUseCase(repository);
    const result = await useCase.execute(dto);

    // ✅ Obtener el peso anterior para detectar alertas
    const getLatestUseCase = new GetLatestWeightRecordByPetIdUseCase(repository);
    const previousWeight = await getLatestUseCase.execute(body.petId);

    // ✅ PUBLICAR EN PUB/SUB - Peso registrado
    console.log("📤 Publicando evento WEIGHT_RECORDED...");
    try {
      await weightRecordPublisher.publishWeightRecorded({
        weightId: result.id,
        petId: body.petId,
        userId: body.userId,
        weight: body.weight,
        unit: body.unit || 'kg',
        recordedAt: body.date || new Date().toISOString(),
        notes: body.note,
      });
      console.log("✅ Evento WEIGHT_RECORDED publicado correctamente");
    } catch (pubsubError) {
      console.error("❌ Error publicando en Pub/Sub:", pubsubError);
    }

    // ✅ PUBLICAR EN PUB/SUB - Alerta de peso (si hay cambio significativo)
    if (previousWeight && previousWeight.weight) {
      const previous = previousWeight.weight;
      const current = body.weight;
      const percentageChange = Math.abs(((current - previous) / previous) * 100);
      
      // Si el cambio es mayor al 10%
      if (percentageChange > 10) {
        const alertType = current > previous ? 'GAIN' : 'LOSS';
        console.log(`📤 Publicando evento WEIGHT_ALERT (${percentageChange.toFixed(1)}% ${alertType})...`);
        try {
          await weightRecordPublisher.publishWeightAlert({
            petId: body.petId,
            userId: body.userId,
            currentWeight: current,
            previousWeight: previous,
            percentageChange: percentageChange,
            alertType: alertType,
            alertedAt: new Date().toISOString(),
          });
          console.log("✅ Evento WEIGHT_ALERT publicado correctamente");
        } catch (pubsubError) {
          console.error("❌ Error publicando en Pub/Sub:", pubsubError);
        }
      }
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message : 'Error interno';
    console.error('❌ Error en POST:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================
// GET - Obtener registros de peso
// ============================================
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

// ============================================
// PATCH - Actualizar registro de peso
// ============================================
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

    console.log("📦 Body recibido:", body);

    // ✅ Validar userId (necesario para notificaciones)
    if (!body.userId) {
      return NextResponse.json(
        { error: 'userId es requerido para notificaciones' },
        { status: 400 }
      );
    }

    if (!body.weight) {
      return NextResponse.json(
        { error: 'weight es requerido' },
        { status: 400 }
      );
    }

    // 1. Obtener el registro actual para comparar
    const getLatestUseCase = new GetLatestWeightRecordByPetIdUseCase(repository);
    const currentRecord = await getLatestUseCase.execute(petId);
    const previousWeight: number | undefined = currentRecord?.weight;

    // 2. ✅ Crear DTO con todos los campos requeridos para UPDATE
    const updateDto = {
      userId: body.userId,
      weight: body.weight,
      unit: body.unit || 'kg',
      note: body.note,
    };

    // 3. Actualizar el registro
    const useCase = new UpdateWeightRecordUseCase(repository);
    const result = await useCase.execute(petId, updateDto);

    // 4. ✅ PUBLICAR EN PUB/SUB - Peso actualizado (usando WEIGHT_UPDATED)
    if (previousWeight !== undefined && previousWeight !== body.weight) {
      console.log("📤 Publicando evento WEIGHT_UPDATED...");
      try {
        await weightRecordPublisher.publishWeightUpdated({
          weightId: result.id,
          petId: petId,
          userId: body.userId,
          oldWeight: previousWeight,
          newWeight: body.weight,
          unit: body.unit || 'kg',
          updatedAt: new Date().toISOString(),
          notes: body.note,
        });
        console.log("✅ Evento WEIGHT_UPDATED publicado correctamente");
      } catch (pubsubError) {
        console.error("❌ Error publicando en Pub/Sub:", pubsubError);
      }

      // 5. ✅ Verificar alerta de peso
      {
        const previous = previousWeight;
        const current = body.weight;
        const percentageChange = Math.abs(((current - previous) / previous) * 100);
        
        if (percentageChange > 10) {
          const alertType = current > previous ? 'GAIN' : 'LOSS';
          console.log(`📤 Publicando evento WEIGHT_ALERT (${percentageChange.toFixed(1)}% ${alertType})...`);
          try {
            await weightRecordPublisher.publishWeightAlert({
              petId: petId,
              userId: body.userId,
              currentWeight: current,
              previousWeight: previous,
              percentageChange: percentageChange,
              alertType: alertType,
              alertedAt: new Date().toISOString(),
            });
            console.log("✅ Evento WEIGHT_ALERT publicado correctamente");
          } catch (pubsubError) {
            console.error("❌ Error publicando en Pub/Sub:", pubsubError);
          }
        }
      }
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message : 'Error interno';
    console.error('❌ Error en PATCH:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}