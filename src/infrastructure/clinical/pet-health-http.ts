import { NextRequest } from 'next/server';
import { ApiError } from '@/src/infrastructure/http/api-error';
import { SupabaseClinicalAuditRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { SupabasePetHealthRepository } from '@/src/infrastructure/database/repositories/supabase-pet-health.repository';
import { SupabaseClinicalCorrectionRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-correction.repository';
import { PetHealthWriter } from '@/src/application/use-cases/pet-health/pet-health.shared';
import { Authorship } from '@/src/infrastructure/auth/clinical-access';

// Piezas HTTP compartidas por las rutas de datos clínicos de la mascota.

export function petHealthRepository(): SupabasePetHealthRepository {
  return new SupabasePetHealthRepository();
}

export function correctionRepository(): SupabaseClinicalCorrectionRepository {
  return new SupabaseClinicalCorrectionRepository();
}

export function auditRepository(): SupabaseClinicalAuditRepository {
  return new SupabaseClinicalAuditRepository();
}

export async function readJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => {
    throw new ApiError(400, 'INVALID_BODY', 'El body debe ser JSON');
  });
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError(400, 'INVALID_BODY', 'El body debe ser un objeto JSON');
  }
  return body as Record<string, unknown>;
}

export function toWriter(authorship: Authorship): PetHealthWriter {
  return {
    source: authorship.source,
    veterinaryId: authorship.veterinaryId,
    employeeId: authorship.employeeId,
    userId: authorship.userId,
  };
}

export function requireQueryParam(request: NextRequest, name: string): string {
  const value = request.nextUrl.searchParams.get(name);
  if (!value) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${name} es requerido`);
  }
  return value;
}
