import { CLINICAL_DOCUMENT_TYPES, ClinicalDocumentType } from '@/src/domain/entities/clinical-document.entity';

// Reglas del módulo de documentos. Sin HTTP ni Supabase: se prueban solas.

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/** 10 MB, igual que el límite del diseño. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Una URL firmada dura 10 minutos (mockup: "enlace seguro"). */
export const SIGNED_URL_TTL_SECONDS = 600;

export type ValidationResult = { ok: true } | { ok: false; message: string };

export function validateDocumentUpload(input: {
  documentType: string;
  title: string;
  mimeType: string;
  sizeBytes: number;
}): ValidationResult {
  if (!(CLINICAL_DOCUMENT_TYPES as readonly string[]).includes(input.documentType)) {
    return { ok: false, message: `documentType debe ser uno de: ${CLINICAL_DOCUMENT_TYPES.join(', ')}` };
  }
  if (!input.title || input.title.trim() === '') {
    return { ok: false, message: 'El título del documento es requerido' };
  }
  if (input.title.length > 200) {
    return { ok: false, message: 'El título no puede tener más de 200 caracteres' };
  }
  if (!ALLOWED_MIME_TYPES[input.mimeType]) {
    return { ok: false, message: 'Solo se aceptan archivos PDF, JPG o PNG' };
  }
  if (input.sizeBytes <= 0) {
    return { ok: false, message: 'El archivo está vacío' };
  }
  if (input.sizeBytes > MAX_DOCUMENT_BYTES) {
    return { ok: false, message: 'El archivo supera el límite de 10 MB' };
  }
  return { ok: true };
}

/**
 * Ruta en el bucket privado. Va por clínica y mascota para que un borrado o una auditoría
 * nunca dependa de un nombre de archivo que vino del cliente.
 */
export function buildStoragePath(input: {
  veterinaryId: string;
  petId: string;
  documentId: string;
  mimeType: string;
}): string {
  const ext = ALLOWED_MIME_TYPES[input.mimeType];
  return `clinics/${input.veterinaryId}/pets/${input.petId}/${input.documentId}.${ext}`;
}

export function isClinicalDocumentType(value: string): value is ClinicalDocumentType {
  return (CLINICAL_DOCUMENT_TYPES as readonly string[]).includes(value);
}
