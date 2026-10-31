import { ClinicalDocument } from '@/src/domain/entities/clinical-document.entity';

// Forma de un documento en las respuestas. Nunca incluye storagePath: la ruta interna no sale de la API.
export function documentToResponse(document: ClinicalDocument) {
  return {
    id: document.id,
    petId: document.petId,
    documentType: document.documentType,
    title: document.title,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    visitId: document.visitId,
    surgeryId: document.surgeryId,
    labTestId: document.labTestId,
    source: document.source,
    veterinaryId: document.veterinaryId,
    uploadedByUserId: document.uploadedByUserId,
    createdAt: document.createdAt,
  };
}
