import { NextRequest, NextResponse } from 'next/server';
import { Actor } from '@/src/infrastructure/auth/actor';
import { authorizePet, ClinicalNeed } from '@/src/infrastructure/auth/clinical-access';
import { ClinicalCorrectionRepository, CorrectableTable } from '@/src/domain/repositories/clinical-correction.repository';
import { ApplyClinicalCorrectionUseCase } from '@/src/application/use-cases/clinical-correction/apply-clinical-correction.use-case';
import { SupabaseClinicalCorrectionRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-correction.repository';
import { ApiError, NotFoundError } from '@/src/infrastructure/http/api-error';

// Manejadores comunes de correcciones (POST crea una versión, GET lista las versiones).
// El body solo aporta el motivo y los campos de la lista `fields`. El autor sale del token.

export interface CorrectionRouteConfig {
  table: CorrectableTable;
  /** Mascota del acto; null si el acto no existe. */
  petIdOf: (recordId: string) => Promise<string | null>;
  /** Permiso que exige la escritura, según Veterinary (y el lado del dueño, según authorizePet). */
  writeNeed: ClinicalNeed;
  /** Campos del body que se pueden corregir. Lo demás se ignora. */
  fields: readonly string[];
  /** Validación propia del acto (enums, reglas de estado). Lanza ApiError si los valores no valen. */
  validate?: (values: Record<string, unknown>) => void;
}

export type CorrectionContext = { params: Promise<{ id: string }> };

/** Campos corregidos tomados del body según la lista permitida. */
export function pickFields(body: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

export function postCorrection(
  config: CorrectionRouteConfig,
  repository: ClinicalCorrectionRepository = new SupabaseClinicalCorrectionRepository()
) {
  return async (request: NextRequest, context: CorrectionContext, actor: Actor): Promise<NextResponse> => {
    const { id } = await context.params;

    const petId = await config.petIdOf(id);
    if (!petId) {
      throw new NotFoundError('ACT_NOT_FOUND', 'El acto clínico no existe');
    }

    // Dueño o editor (lado del dueño), o clínica con el permiso de escritura en Veterinary.
    const authorship = await authorizePet(actor, petId, config.writeNeed);

    const body = (await request.json().catch(() => {
      throw new ApiError(400, 'INVALID_BODY', 'El body debe ser JSON');
    })) as Record<string, unknown>;

    const values = pickFields(body, config.fields);
    config.validate?.(values);

    const useCase = new ApplyClinicalCorrectionUseCase(repository);
    const result = await useCase.execute({
      table: config.table,
      recordId: id,
      actor: { userId: actor.userId, veterinaryId: authorship.veterinaryId },
      reason: body.reason,
      values,
      employeeId: authorship.employeeId,
    });

    return NextResponse.json({ ...result, recordId: id }, { status: 201 });
  };
}

export function getVersions(
  config: CorrectionRouteConfig,
  repository: ClinicalCorrectionRepository = new SupabaseClinicalCorrectionRepository()
) {
  return async (_request: NextRequest, context: CorrectionContext, actor: Actor): Promise<NextResponse> => {
    const { id } = await context.params;

    const petId = await config.petIdOf(id);
    if (!petId) {
      throw new NotFoundError('ACT_NOT_FOUND', 'El acto clínico no existe');
    }

    await authorizePet(actor, petId, 'CLINICAL_READ');

    const versions = await repository.listVersions(config.table, id);
    return NextResponse.json(versions, { status: 200 });
  };
}

/** Respuesta de los PUT/PATCH que ya no sobrescriben: el cliente debe usar la ruta de correcciones. */
export function overwriteRefused(correctionPath: string) {
  return async (): Promise<NextResponse> =>
    NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 405,
        error: 'Method Not Allowed',
        message: `Los actos clínicos no se sobrescriben. Corrige con POST ${correctionPath} (motivo obligatorio)`,
        code: 'USE_CORRECTION_ENDPOINT',
      },
      { status: 405, headers: { Allow: 'GET, POST' } }
    );
}
