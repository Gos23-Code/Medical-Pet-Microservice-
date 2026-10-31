import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { ForbiddenError } from '@/src/infrastructure/http/api-error';
import { SupabaseClinicalDocumentRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-document.repository';
import { SupabaseDocumentStorage } from '@/src/infrastructure/storage/supabase-document-storage';
import { SupabaseClinicalAuditRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import {
  ReadClinicalDocumentUseCase,
  DeleteClinicalDocumentUseCase,
  DocumentForbiddenError,
} from '@/src/application/use-cases/documents/list-read-delete-clinical-document.use-case';
import { documentToResponse } from '@/src/application/mappers/clinical-document.mapper';

const repository = new SupabaseClinicalDocumentRepository();
const storage = new SupabaseDocumentStorage();
const auditRepository = new SupabaseClinicalAuditRepository();
const readDocument = new ReadClinicalDocumentUseCase(repository, storage);
const deleteDocument = new DeleteClinicalDocumentUseCase(repository, storage);

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/documents/[id] → metadatos + URL firmada de 10 minutos (solo clínica con CLINICAL_READ)
export const GET = withAuth(async (_request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;

  const result = await readDocument.execute(id, (petId) => authorizePet(actor, petId, 'DOCUMENT_READ'));
  if (!result) {
    return NextResponse.json({ success: false, message: 'Documento no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: { ...documentToResponse(result.document), url: result.url, expiresInSeconds: result.expiresInSeconds },
  });
});

// DELETE /api/documents/[id] → solo la clínica que lo subió (DOCUMENT_UPLOAD)
export const DELETE = withAuth(async (_request: NextRequest, context: RouteContext, actor) => {
  const { id } = await context.params;

  const veterinaryId = actor.clinic?.veterinaryId;
  if (!veterinaryId) {
    throw new ForbiddenError('CLINIC_TOKEN_REQUIRED', 'Solo la clínica puede borrar documentos');
  }

  try {
    const deleted = await deleteDocument.execute(id, veterinaryId, (petId) =>
      authorizePet(actor, petId, 'DOCUMENT_WRITE')
    );
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Documento no encontrado' }, { status: 404 });
    }
  } catch (error) {
    if (error instanceof DocumentForbiddenError) {
      throw new ForbiddenError('TENANT_MISMATCH', error.message);
    }
    throw error;
  }

  await auditRepository.record({
    tableName: 'clinical_documents',
    recordId: id,
    action: 'DELETE',
    actorUserId: actor.userId,
    veterinaryId,
  });

  return NextResponse.json({ success: true, message: 'Documento eliminado' });
});
