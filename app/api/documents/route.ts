import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/src/infrastructure/auth/with-auth';
import { authorizePet } from '@/src/infrastructure/auth/clinical-access';
import { SupabaseClinicalDocumentRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-document.repository';
import { SupabaseDocumentStorage } from '@/src/infrastructure/storage/supabase-document-storage';
import { SupabaseClinicalAuditRepository } from '@/src/infrastructure/database/repositories/supabase-clinical-audit.repository';
import { UploadClinicalDocumentUseCase, DocumentValidationError } from '@/src/application/use-cases/documents/upload-clinical-document.use-case';
import { ListClinicalDocumentsUseCase } from '@/src/application/use-cases/documents/list-read-delete-clinical-document.use-case';
import { MAX_DOCUMENT_BYTES } from '@/src/application/use-cases/documents/document-rules';
import { documentToResponse } from '@/src/application/mappers/clinical-document.mapper';

// Documentos: EXCLUSIVO de la veterinaria. El dueño recibe 403 (CLINIC_TOKEN_REQUIRED).
// Permisos: DOCUMENT_UPLOAD para subir; CLINICAL_READ para listar.

const repository = new SupabaseClinicalDocumentRepository();
const storage = new SupabaseDocumentStorage();
const auditRepository = new SupabaseClinicalAuditRepository();
const uploadDocument = new UploadClinicalDocumentUseCase(repository, storage);
const listDocuments = new ListClinicalDocumentsUseCase(repository);

// POST /api/documents  (multipart/form-data)
// Campos: file (*), petId (*), documentType (*), title (*), visitId, surgeryId, labTestId (opcionales)
export const POST = withAuth(async (request: NextRequest, _context, actor) => {
  const form = await request.formData();

  const petId = String(form.get('petId') ?? '');
  if (!petId) {
    return NextResponse.json({ success: false, message: 'petId es requerido' }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ success: false, message: 'Falta el archivo (campo file)' }, { status: 400 });
  }
  // Se revisa el tamaño antes de leer el archivo completo en memoria
  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ success: false, message: 'El archivo supera el límite de 10 MB' }, { status: 400 });
  }

  const authorship = await authorizePet(actor, petId, 'DOCUMENT_WRITE');

  try {
    const document = await uploadDocument.execute({
      petId,
      veterinaryId: authorship.veterinaryId as string,
      uploadedByUserId: actor.userId,
      documentType: String(form.get('documentType') ?? ''),
      title: String(form.get('title') ?? ''),
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
      visitId: (form.get('visitId') as string) || null,
      surgeryId: (form.get('surgeryId') as string) || null,
      labTestId: (form.get('labTestId') as string) || null,
    });

    await auditRepository.record({
      tableName: 'clinical_documents',
      recordId: document.id,
      action: 'CREATE',
      actorUserId: actor.userId,
      veterinaryId: authorship.veterinaryId,
    });

    return NextResponse.json({ success: true, data: documentToResponse(document) }, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentValidationError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    throw error;
  }
});

// GET /api/documents?petId=…  (solo clínica con CLINICAL_READ)
export const GET = withAuth(async (request: NextRequest, _context, actor) => {
  const petId = request.nextUrl.searchParams.get('petId');
  if (!petId) {
    return NextResponse.json({ success: false, message: 'petId es requerido' }, { status: 400 });
  }

  await authorizePet(actor, petId, 'DOCUMENT_READ');

  const documents = await listDocuments.execute(petId);
  return NextResponse.json({
    success: true,
    data: documents.map(documentToResponse),
    count: documents.length,
  });
});
