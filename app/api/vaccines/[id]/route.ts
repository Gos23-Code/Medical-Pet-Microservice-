// app/api/vaccines/[id]/route.ts
import { overwriteRefused } from '@/src/infrastructure/clinical/correction-handlers';

// PUT ya no sobrescribe una vacuna: se corrige con POST /api/vaccines/{id}/corrections (motivo obligatorio).
export const PUT = overwriteRefused('/api/vaccines/{id}/corrections');
