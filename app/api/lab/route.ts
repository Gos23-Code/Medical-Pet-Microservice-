// app/api/labTests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AddLabTestUseCase } from '@/src/application/use-cases/lab-test/add-lab-test.use-case';
import { SupabaseLabTestRepository } from '@/src/infrastructure/database/repositories/supabase-lab-test.repository';
import { GetLabTestsByVisitIdUseCase } from '@/src/application/use-cases/lab-test/get-lab-test.use-case';
import { UpdateLabTestResultUseCase } from '@/src/application/use-cases/lab-test/update-lab-test.use.case';
import { CheckLabTestIsNormalUseCase } from '@/src/application/use-cases/lab-test/check-lab-test.use-case';
import { CreateLabTestDto } from '@/src/application/dtos/lab-test.dto';
import { createLabTestPublisher } from '@/src/infrastructure/pubsub/pubsub.factory';

const repository = new SupabaseLabTestRepository();

// ✅ Obtener instancia del publisher
const labTestPublisher = createLabTestPublisher();

// ============================================
// POST - Crear un nuevo laboratorio
// ============================================
export async function POST(req: NextRequest) {
    console.log('🚀 POST /api/lab');
    try {
        const body = await req.json();
        console.log('📦 Body recibido:', body);

        // Validar campos requeridos
        if (!body.name) {
            return NextResponse.json(
                { error: 'name es requerido' },
                { status: 400 }
            );
        }

        if (!body.visit_id) {
            return NextResponse.json(
                { error: 'visit_id es requerido' },
                { status: 400 }
            );
        }

        // ✅ Validar userId y petId (necesarios para notificaciones)
        if (!body.userId) {
            return NextResponse.json(
                { error: 'userId es requerido para notificaciones' },
                { status: 400 }
            );
        }

        if (!body.petId) {
            return NextResponse.json(
                { error: 'petId es requerido para notificaciones' },
                { status: 400 }
            );
        }

        // Crear DTO con visit_id incluido
        const dto: CreateLabTestDto = {
            name: body.name,
            result: body.result,
            normal_range: body.normal_range,
            date: body.date,
            notes: body.notes,
            visit_id: body.visit_id,
        };

        const useCase = new AddLabTestUseCase(repository);
        const result = await useCase.execute(dto);

        // ✅ PUBLICAR EN PUB/SUB
        console.log('📤 Publicando evento LAB_TEST_CREATED...');
        try {
            await labTestPublisher.publishLabTestCreated({
                labTestId: result.id,
                petId: body.petId,
                userId: body.userId,
                testType: body.name,
                results: body.result ? { result: body.result } : {},
                veterinarian: body.veterinarian || 'pending',
            });
            console.log('✅ Evento LAB_TEST_CREATED publicado correctamente');
        } catch (pubsubError) {
            // ✅ Usar 'pubsubError' en lugar de 'error' para evitar el warning
            console.error('❌ Error publicando en Pub/Sub:', pubsubError);
        }

        return NextResponse.json(result, { status: 201 });

    } catch (error: unknown) {
        console.log('💥 Error:', error);
        const message = error instanceof Error
            ? error.message : 'Error interno del servidor';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ============================================
// GET - Obtener laboratorios
// ============================================
export async function GET(req: NextRequest) {
    console.log('🚀 GET /api/labTests');
    try {
        const visit_id = req.nextUrl.searchParams.get('visit_id');
        const isNormal = req.nextUrl.searchParams.get('isNormal');

        if (!visit_id) {
            return NextResponse.json(
                { error: 'visit_id es requerido' },
                { status: 400 }
            );
        }

        if (isNormal === 'true') {
            const useCase = new CheckLabTestIsNormalUseCase(repository);
            const result = await useCase.execute(visit_id);
            return NextResponse.json(result, { status: 200 });
        }

        const useCase = new GetLabTestsByVisitIdUseCase(repository);
        const result = await useCase.execute(visit_id);
        return NextResponse.json(result, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ============================================
// PATCH - Actualizar resultado del laboratorio
// ============================================
// app/api/lab/route.ts - PATCH

export async function PATCH(req: NextRequest) {
    console.log('🚀 PATCH /api/lab');
    try {
        const visit_id = req.nextUrl.searchParams.get('visit_id');

        if (!visit_id) {
            return NextResponse.json(
                { error: 'visit_id es requerido' },
                { status: 400 }
            );
        }

        const body = await req.json();

        if (!body.result) {
            return NextResponse.json(
                { error: 'result es requerido' },
                { status: 400 }
            );
        }

        // ✅ userId y petId son necesarios para la notificación (la tabla
        // lab_tests no los guarda, así que vienen en el body como en el POST)
        if (!body.userId) {
            return NextResponse.json(
                { error: 'userId es requerido para notificaciones' },
                { status: 400 }
            );
        }

        if (!body.petId) {
            return NextResponse.json(
                { error: 'petId es requerido para notificaciones' },
                { status: 400 }
            );
        }

        // 1. Obtener el lab test actual desde el repositorio
        const currentLabTest = await repository.findByVisistId(visit_id);
        if (!currentLabTest || currentLabTest.length === 0) {
            return NextResponse.json(
                { error: 'Lab test no encontrado' },
                { status: 404 }
            );
        }

        // Tomar el primer lab test de la visita
        const labTest = currentLabTest[0];

        // 2. Actualizar el resultado
        const useCase = new UpdateLabTestResultUseCase(repository);
        const result = await useCase.execute(visit_id, { result: body.result });

        // 3. ✅ PUBLICAR EN PUB/SUB - userId/petId vienen del body
        console.log('📤 Publicando evento LAB_TEST_RESULT_UPDATED...');
        try {
            const normalRange = labTest.normal_range || '';
            const isNormal = labTest.result && normalRange
                ? checkIsNormal(labTest.result, normalRange)
                : true;

            await labTestPublisher.publishLabTestResultUpdated({
                labTestId: labTest.id,
                petId: body.petId,
                userId: body.userId,
                result: body.result,
                isNormal: isNormal,
                normalRange: normalRange || undefined,
                updatedAt: new Date().toISOString(),
            });
            console.log('✅ Evento LAB_TEST_RESULT_UPDATED publicado correctamente');
        } catch (pubsubError) {
            console.error('❌ Error publicando en Pub/Sub:', pubsubError);
        }

        return NextResponse.json(result, { status: 200 });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// ============================================
// 🔧 Helper para verificar si el resultado es normal
// ============================================
function checkIsNormal(result: string, normalRange: string): boolean {
    if (!normalRange) return true;
    
    try {
        const numResult = parseFloat(result);
        if (isNaN(numResult)) return result === normalRange;

        if (normalRange.includes('-')) {
            const [min, max] = normalRange.split('-').map(Number);
            if (!isNaN(min) && !isNaN(max)) {
                return numResult >= min && numResult <= max;
            }
        }

        if (normalRange.includes('>')) {
            const min = parseFloat(normalRange.replace('>', '').trim());
            return numResult > min;
        }

        if (normalRange.includes('<')) {
            const max = parseFloat(normalRange.replace('<', '').trim());
            return numResult < max;
        }

        return result === normalRange;
    } catch {
        return false;
    }
}