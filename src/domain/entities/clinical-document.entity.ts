// Documento clínico de una mascota: exclusivo de la veterinaria (el dueño no lo ve ni lo sube).
// Mockup, pestaña Documentos: tipo, título, tamaño, quién lo subió, y a qué visita, cirugía o examen pertenece.

export const CLINICAL_DOCUMENT_TYPES = [
  'LABORATORIO',
  'IMAGEN',
  'CONSENTIMIENTO',
  'FORMULA',
  'CERTIFICADO',
  'VACUNAS',
  'PROTOCOLO',
  'OTRO',
] as const;

export type ClinicalDocumentType = (typeof CLINICAL_DOCUMENT_TYPES)[number];

export interface ClinicalDocument {
  id: string;
  petId: string;
  visitId: string | null;
  surgeryId: string | null;
  labTestId: string | null;
  documentType: ClinicalDocumentType;
  title: string;
  /** Ruta dentro del bucket privado. Nunca se expone como URL pública. */
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  source: 'CLINIC';
  veterinaryId: string;
  uploadedByUserId: string;
  createdAt: string;
}
