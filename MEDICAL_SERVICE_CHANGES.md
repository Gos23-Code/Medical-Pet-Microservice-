# Cambios en medical-pet-backend para MyAnimaLogVet

> Leer junto con `AGENTS.md` del repo (fuente de verdad) y `CONTRATOS_COMPARTIDOS.md`.
> Stack: Next.js 16 route handlers + TypeScript + Supabase. Mantener Clean Architecture: la validación del token y la consulta de permisos son infraestructura; los use-cases reciben un `actor` ya resuelto.
> Mantener la regla del repo: un fallo de Pub/Sub nunca tumba la respuesta HTTP.

---

## Estado de implementación (27 oct 2026)

Implementado en código, con tests (`npm test`: 57 suites / 443 tests) y `next build` pasando. Las dependencias de otros servicios (Pets, Veterinary, User) **no están en este repo**: sin ellas, las rutas protegidas responden 503.

| Tarea | Estado | Dónde | Desviación respecto al plan |
|---|---|---|---|
| MED-01 JWT | ✅ | `src/infrastructure/auth/` (`jwt.ts`, `actor.ts`, `with-auth.ts`, `internal-key.ts`) | `jose` 5 con JWKS remoto. `userId` sale de `sub`. Los cron exigen `X-Internal-Api-Key` |
| MED-02 columnas | ✅ | `db/scripts/002_clinical_access_and_audit.sql` + `001` | `manufacturer` nuevo; el lote se reutiliza de `lot_number` (no se duplica como `batch_number`) |
| MED-03 autorización | ✅ | `src/infrastructure/auth/clinical-access.ts`, `clinical/`, `clients/` | Caché de 60 s en `clients/ttl-cache.ts`. Los listados sin mascota (`date-range`, `GET /api/weight` sin `petId`) se restringen a clínica o se piden con `petId` |
| MED-04 visita desde cita | ✅ | `app/api/visits/route.ts` | La regla "la cita está atendida en Calendar" no se valida (Calendar no existe aquí): solo se impide una visita duplicada por cita (409) |
| MED-05 auditoría | ✅ | `supabase-clinical-audit.repository.ts`, llamadas desde cada ruta de escritura | Se hace desde la ruta, no dentro del use-case. Sin transacción: si la auditoría falla se loguea y la escritura queda |
| MED-06 eventos | ✅ | `publishers/event-context.ts`, `clinical/event-target.ts` | `veterinaryName` sale de Veterinary (`/summary`); si no responde, el evento sale sin nombre. Requiere que Pets devuelva `ownerContact` |
| MED-07 consultas | ✅ | `app/api/visits/veterinary/[veterinaryId]/`, `app/api/pets/[petId]/clinical-summary/` | `allergies` devuelve `null` (no hay fuente en Medical, D9). `nextAppointment` devuelve `null` (lo da Calendar) |

Lo que **no** se decidió aquí y queda abierto: D9 (alergias), D10 (dueño que escribe historia), D7 (formato de error completo), y los endpoints que deben existir en Pets y Veterinary (ver `AGENTS.md` §2.2 y §10).

Cambios de contrato con clientes: ver `MEDICAL_API_BODIES.md`.

---

## MED-01 — Validar el JWT *(requiere USER-01, USER-02)*

1. `npm i jose`.
2. `src/infrastructure/auth/jwt.ts`:
   ```ts
   import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

   const JWKS = createRemoteJWKSet(new URL(process.env.JWT_JWKS_URI!));

   export interface Actor {
     userId: string;
     email: string;
     platformRole: 'USER' | 'PLATFORM_ADMIN';
     clinic?: { veterinaryId: string; employeeId: string; role: string; licensed: boolean; status: string };
   }

   export async function authenticate(req: Request): Promise<Actor> {
     const header = req.headers.get('authorization');
     if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();
     const { payload } = await jwtVerify(header.slice(7), JWKS, {
       issuer: 'myanimalog-user-service',
       audience: 'myanimalog-api',
     });
     return toActor(payload);
   }
   ```
3. Helper `withAuth(handler)` para envolver cada `route.ts` y mapear `UnauthorizedError` → 401, `ForbiddenError` → 403.
4. Rutas `/api/cron/**`: no usan JWT de usuario; exigir `X-Internal-Api-Key` (hoy cualquiera puede dispararlas).
5. Variables nuevas: `JWT_JWKS_URI`, `INTERNAL_API_KEY`, `VETERINARY_SERVICE_URL`, `PETS_SERVICE_URL`. Son de runtime: **no** usar prefijo `NEXT_PUBLIC_` (se incrustarían en el bundle).

## MED-02 — Columnas de autoría y clínica

Migración en el Supabase de Medical:

```sql
ALTER TABLE veterinary_visits
  ADD COLUMN veterinary_id UUID,
  ADD COLUMN attended_by_employee_id UUID,
  ADD COLUMN attended_by_user_id UUID,
  ADD COLUMN appointment_id UUID,
  ADD COLUMN created_by_user_id UUID;
CREATE INDEX ix_visits_vet_date ON veterinary_visits(veterinary_id, visit_date);

ALTER TABLE vaccines
  ADD COLUMN veterinary_id UUID,
  ADD COLUMN applied_by_employee_id UUID,
  ADD COLUMN batch_number VARCHAR(50),        -- lote: obligatorio para carnet de vacunas
  ADD COLUMN manufacturer VARCHAR(100);

ALTER TABLE pet_surgeries
  ADD COLUMN veterinary_id UUID,
  ADD COLUMN surgeon_employee_id UUID;

ALTER TABLE lab_tests ADD COLUMN veterinary_id UUID, ADD COLUMN pet_id UUID, ADD COLUMN user_id UUID;
ALTER TABLE "WeightRecord" ADD COLUMN "VeterinaryId" UUID, ADD COLUMN "Source" VARCHAR(10) DEFAULT 'CLINIC'; -- CLINIC | OWNER

CREATE TABLE clinical_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(10) NOT NULL,                -- CREATE, UPDATE, DELETE
  actor_user_id UUID NOT NULL,
  veterinary_id UUID,
  changes JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Seguir el patrón de `vaccines.user_id` documentado en `AGENTS.md §6`: entidad → mapper → insert → `mapToX` lee de vuelta. Resolver de paso la deuda de `lab_tests` sin `pet_id`/`user_id` (§10 del AGENTS.md).

## MED-03 — Autorización por actor *(requiere VET-29, PETS-04)*

Crear `src/infrastructure/auth/access.service.ts` con caché en memoria de 60 s:

```ts
export async function requireClinicalAccess(actor: Actor, petId: string, permission: Permission) {
  if (!actor.clinic) throw new ForbiddenError('Se requiere token de clínica');
  const res = await fetch(
    `${process.env.VETERINARY_SERVICE_URL}/internal/veterinaries/${actor.clinic.veterinaryId}/patients/${petId}/access?userId=${actor.userId}`,
    { headers: { 'X-Internal-Api-Key': process.env.INTERNAL_API_KEY! }, signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new ServiceUnavailableError();
  const access = await res.json();
  if (!access.hasAccess || !access.permissions.includes(permission)) throw new ForbiddenError();
  return access;
}

export async function requireOwner(actor: Actor, petId: string) {
  // GET {PETS_SERVICE_URL}/internal/pets/{petId}/owner/{actor.userId}
}
```

Matriz por ruta:

| Ruta | Dueño (token base) | Clínica (token de clínica) |
|---|---|---|
| `GET` visitas, tratamientos, cirugías, labs, vacunas, peso | `requireOwner` | `CLINICAL_READ` |
| `POST/PUT` visitas, tratamientos, medicación, cirugías, labs | ❌ 403 | `CLINICAL_WRITE` |
| `POST/PUT` vacunas | ❌ 403 | `NURSING_WRITE` |
| `POST` peso | ✅ con `Source = OWNER` | `NURSING_WRITE` con `Source = CLINIC` |
| `DELETE` cirugía | ❌ | `CLINICAL_WRITE` y misma `veterinary_id` que la creó |
| `/api/cron/**` | — | solo `X-Internal-Api-Key` |

Con token de clínica, **siempre** guardar `veterinary_id = actor.clinic.veterinaryId` y el empleado como autor. Nunca tomarlos del body.

Para rutas que reciben un id de registro (ej. `PUT /api/treatments/[id]`) y no el `petId`: leer primero el registro para obtener su `pet_id` y luego autorizar.

## MED-04 — Visita desde una cita

- `POST /api/visits` acepta `appointmentId` opcional. Si viene, se guarda; la clínica la crea **después** de marcar la cita como atendida en Calendar (no se crean visitas vacías automáticas).
- Validar que no exista ya una visita con ese `appointment_id` (409).

## MED-05 — Auditoría

En cada use-case de escritura, insertar en `clinical_audit_log` (repositorio nuevo `SupabaseAuditLogRepository`). En `UPDATE`, guardar en `changes` el antes/después de los campos modificados. Una historia clínica editada sin rastro no es aceptable.

## MED-06 — Eventos con contexto de clínica

1. Agregar `veterinaryId` y `veterinaryName` en `metadata`/`payload` de los eventos existentes cuando el actor es una clínica (`VACCINE_APPLIED`, `VISIT_COMPLETED`, `TREATMENT_STARTED`, `SURGERY_SCHEDULED`…), para que la notificación diga "Clínica Patitas aplicó la vacuna antirrábica a Max".
2. `userId` del evento = **dueño de la mascota**, obtenido de Pets (`/internal/pets/batch`), ya no del body. Si la mascota no tiene dueño (`claim_status = UNCLAIMED`), `userId = null` y `recipient` con el contacto que devuelve Pets.
3. Adoptar el sobre común (`CONTRATOS_COMPARTIDOS.md §4.1`): agregar `recipient` al `publishDomainEvent`.

## MED-07 — Consultas para la clínica

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/visits/veterinary/[veterinaryId]?from=&to=` | token de clínica de esa clínica, `CLINICAL_READ` (verificar `vet_id` del token = ruta) |
| GET | `/api/pets/[petId]/clinical-summary` | `CLINICAL_READ_BASIC`: alergias, vacunas vigentes/vencidas, tratamientos activos, último peso |

`clinical-summary` es lo que ve recepción y lo que puede consumir el IA service para el resumen previo a la cita.

---

## Tests mínimos (Jest, en `__test__/`)

- `authenticate`: token válido, vencido, firma inválida, `aud` incorrecto.
- `requireClinicalAccess`: con permiso, sin permiso, sin acceso, Veterinary caído → 503.
- Use-case de visita guarda `veterinary_id` y autor desde el actor aunque el body traiga otro.
- Auditoría se escribe en create y update.
- Recepcionista (`CLINICAL_READ_BASIC` sin `CLINICAL_READ`) recibe 403 en historia completa pero 200 en `clinical-summary`.
