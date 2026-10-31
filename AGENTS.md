# Medical Pet Backend — guía técnica

API REST del núcleo clínico de la plataforma **Medical Pet**: historiales veterinarios, tratamientos, medicación, vacunas, cirugías, laboratorios y control de peso. Publica eventos de dominio a Google Cloud Pub/Sub que consume un microservicio de notificaciones separado.

Esta guía es la fuente de verdad para trabajar en el repo (humanos y agentes). `CLAUDE.md` solo apunta aquí (`@AGENTS.md`).

> **Regla de mantenimiento:** cada cambio en el repo (código, migración, variable de entorno, contrato, decisión) se refleja en esta guía **en el mismo cambio**, no después. Si un cambio contradice lo escrito aquí, se corrige esta guía antes de dar la tarea por terminada.

## 1. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), route handlers como API REST — no hay frontend real, `app/page.tsx` es el scaffold de `create-next-app` |
| Lenguaje | TypeScript 5, `strict: true` |
| Runtime | Node 22 |
| Base de datos | Supabase (Postgres) vía `@supabase/supabase-js` / `@supabase/ssr` |
| Mensajería | Google Cloud Pub/Sub (`@google-cloud/pubsub`) |
| DI/decoradores | `@nestjs/common` + `@nestjs/config` usados de forma puntual (clases `@Injectable()` instanciadas a mano con factories, **no** hay una app Nest real corriendo) |
| Auth | JWT RS256 validado con `jose` contra el JWKS del User service (`src/infrastructure/auth/`) |
| Testing | Jest 30 + ts-jest, 57 suites / 443 tests (`npm test`) |
| Contenedor | Docker multi-stage (`node:22-alpine`), salida `standalone` de Next.js |
| Despliegue objetivo | Google Cloud Run |

## 2. Arquitectura

Clean Architecture / Hexagonal, por módulo de dominio:

```
app/api/<recurso>/route.ts        → HTTP: parsea, valida, arma DTO, publica eventos
        │
        ▼
src/application/use-cases/<recurso>/*.use-case.ts   → orquesta reglas de negocio, sin conocer HTTP ni Supabase
        │
        ├─▶ src/application/mappers/*.mapper.ts      → DTO → entidad de dominio
        ├─▶ src/application/dtos/*.dto.ts            → contratos de entrada/salida
        │
        ▼
src/domain/entities/*.entity.ts                      → reglas invariantes, value objects
src/domain/value-objects/*.vo.ts                      → Dosage, Frequency, Temperature, Weight, VaccineName…
src/domain/repositories/*.repository.ts               → interfaces (puertos)
        │
        ▼
src/infrastructure/database/repositories/supabase-*.repository.ts   → implementación contra Supabase (adaptador)
src/infrastructure/pubsub/publishers/*.publisher.ts                 → adaptador de salida a Pub/Sub
```

Las rutas de `app/api/**/route.ts` son el único punto que conoce tanto los use-cases como los publishers: arma el DTO, ejecuta el use-case, y si corresponde publica un evento (siempre en un `try/catch` separado — **un fallo de Pub/Sub nunca debe tumbar la respuesta HTTP**, ver §8.3).

### 2.1 Este servicio es *publish-only*

Existen `src/infrastructure/pubsub/subscribers/*.subscriber.ts` y un `pubsub.module.ts` que los registra, pero **nadie los importa** (`grep` no encuentra referencias fuera del propio módulo). Es código muerto/plantilla: este backend nunca consume sus propios eventos. El consumo real ocurre en el repo hermano **`notification-microservice-pubsub`**, que corre por separado (su propia base de Supabase, su propio `.env.local`) y se suscribe a las mismas suscripciones (`sub-notificaciones-*`). No asumas que estos subscribers hacen algo en producción.

### 2.2 Un servicio, dos tipos de actor ("2 en 1")

Medical atiende a **dos tipos de usuario con el mismo endpoint**: el dueño de la mascota (token `ctx = USER`) y la clínica (token `ctx = VETERINARY`). Un mismo body sirve a los dos; lo que cambia es quién queda como autor y qué puede hacer.

- **Body común:** los campos base (`petId`, `reason`, `weight`…) son obligatorios para cualquiera.
- **Campos de clínica:** `veterinarian`, `appointmentId`, `diagnosis`, `notes`… son **opcionales** y solo los usa un token de clínica. Un dueño que los envía no recibe error por ellos; sencillamente no se usan.
- **Identidad desde el token:** `userId` sale de `sub`, nunca del body. `veterinaryId` y el empleado salen de `vet_id`/`employee_id`. Un body con `userId` o `veterinaryId` se ignora.
- **Autorización** (`src/infrastructure/auth/clinical-access.ts` → `authorizePet`): dueño y clínica leen (`CLINICAL_READ`, `CLINICAL_READ_BASIC`) y escriben historia (`CLINICAL_WRITE`, `NURSING_WRITE`, `WEIGHT_WRITE`). El dueño solo sobre sus propias mascotas (Pets). La clínica según el permiso de Veterinary. Los documentos son exclusivos de la clínica (`DOCUMENT_READ`, `DOCUMENT_WRITE`).
- **Quién decide:** la clínica pregunta a Veterinary (`GET /internal/veterinaries/{v}/patients/{p}/access`, caché 60 s). El dueño pregunta a Pets (`GET /internal/pets/{p}/owner/{u}`, caché 60 s). Si uno de los dos no responde → **503**, nunca "pasa".
- **Errores:** formato del contrato `{ timestamp, status, error, message, code }` (ver `src/infrastructure/http/api-error.ts`). Los errores de las rutas que no se tocaron siguen con su forma anterior (`{ success, message }` o `{ error }`, decisión D7 pendiente).
- Detalle de cada body y ejemplo por endpoint: **`MEDICAL_ENDPOINTS_Y_BODIES.md`** (referencia única, ordenada por módulo; reemplaza a `MEDICAL_API_BODIES.md` donde difieran).

## 3. Estructura de carpetas

```
app/api/                     Route handlers (Next.js App Router)
  cron/{vaccine,visit}-reminders/route.ts    Endpoints para cron jobs (Cloud Scheduler)
  lab/, medications/, surgery/, treatments/, vaccines/, visits/, weight/

db/scripts/                  Migraciones SQL manuales (se aplican a mano en Supabase, en orden)
  001_authorship_columns.sql   Columnas de autoría clínica (MED-02 parcial)
  002_clinical_access_and_audit.sql   appointment_id, lab_tests (pet/clínica), manufacturer, clinical_audit_log (MED-02/04/05)
  003_alinear_esquema_con_codigo.sql  Esquema completo que usa el código (CREATE IF NOT EXISTS + columnas faltantes). Ejecutar después de 001 y 002, o sola en una base vacía
  004_alinear_tablas_con_mockup.sql   Incremental, después de 003. Alinea las 7 tablas con el mockup de historia clínica (Consultas, Cirugías, Tratamientos, Medicación, Laboratorio, Vacunas, Peso) y crea `lab_test_results` (parámetros del examen) y `clinical_documents` (Documentos)

postman/
  Medical-Pet-Backend.postman_collection.json   83 requests en 17 carpetas: D* = dueño (campos base), V* = veterinaria (base + extra). Tests y casos NEGATIVO
  Medical-Pet-Backend.postman_environment.json  Variables locales (tokens, IDs de prueba). Importar junto con la colección

scripts/dev-auth/            Servicios simulados para probar en LOCAL (JWKS + Pets + Veterinary + tokens). No es para producción.
  stub-services.mjs          node scripts/dev-auth/stub-services.mjs → imprime tokens de dueño y de clínica

src/
  application/
    clinical/                 Campos del mockup: field-spec.ts (parseFields/toResponse), clinical-specs.ts (campos nuevos por módulo),
                              vaccine-status.ts (Vigente/Por vencer/Vencida/Anterior), lab-results.ts (parámetros del examen)
    use-cases/documents/      MÓDULO DOCUMENTOS (exclusivo de la veterinaria): upload, listar, leer (URL firmada), borrar; reglas en document-rules.ts
    mappers/clinical-document.mapper.ts   forma de un documento en la respuesta (sin storagePath)
    visits/visit-clinical-fields.ts       validación de los campos clínicos de la visita
  shared/
    business-date.ts          todayInTimeZone(): "hoy" en la zona de la clínica (default America/Bogota)
    __test__/                 Tests de shared
  domain/
    entities/                 Entidades ricas (create / reconstitute / invariantes)
    value-objects/             VOs con validación en el constructor
    repositories/              Interfaces de persistencia (puertos)
  application/
    use-cases/<recurso>/       Un caso de uso = una clase con .execute()
      __test__/                 Tests unitarios junto al use-case
    dtos/                      Contratos de entrada/salida por recurso
    mappers/                   DTO ↔ entidad
    service/                   Servicios de dominio sin estado (ej. TreatmentProgressService)
  infrastructure/
    auth/                     MED-01/MED-03: actor.ts (claims → Actor), jwt.ts (authenticate), with-auth.ts (withAuth para route handlers),
                              clinical-access.ts (authorizePet, assertClinicPath), clinic-read.ts (lectura por clínica), internal-key.ts (X-Internal-Api-Key)
    clients/                  HTTP a otros servicios con timeout 3 s → 503: pets.client.ts, veterinary.client.ts, internal-http.ts, ttl-cache.ts (caché 60 s)
    clinical/event-target.ts  MED-06: resuelve dueño y contacto de la mascota (vía Pets) para cada evento
    database/clinical-extras.ts   saveExtras / loadExtras: escribe y lee columnas nuevas del mockup sobre filas que crean los casos de uso originales
    database/repositories/supabase-lab-test-result.repository.ts   parámetros del examen (lab_test_results)
    storage/supabase-document-storage.ts   bucket privado clinical-documents, URL firmada de 10 min
    http/api-error.ts         Errores con el formato del contrato y toErrorResponse()
    database/
      pet-lookup.ts           Mascota de un registro (visita, vacuna, tratamiento, medicación, cirugía, lab) sin leer tablas de Pets
      supabase/client.ts       Cliente browser (createBrowserClient) — usado por los repos "nuevos"
      supabase/client-surgery.ts  Cliente server (createClient) — solo pet-surgery
      repositories/supabase-*.repository.ts   Implementación real de cada puerto
      repositories/__test__/    Tests con mocks del builder de Supabase
    pubsub/
      constants/                Nombres de topics y suscripciones
      interfaces/                Catálogo de eventos y sus payloads (PubSubEventMap)
      services/pubsub.service.ts  Wrapper sobre @google-cloud/pubsub + validación y armado del sobre §4.1
      publishers/*.publisher.ts   Un publisher por dominio
      __test__/                   Tests del sobre de eventos (pubsub-envelope.test.ts)
      subscribers/*.subscriber.ts Código muerto (ver §2.1)
      pubsub.factory.ts          Factories `createXPublisher()` usadas por las rutas
```

## 4. Módulos de dominio

| Módulo | Entidad | Tabla Supabase | Repositorio | Use-cases |
|---|---|---|---|---|
| Visitas | `VeterinaryVisit` | `veterinary_visits` | `supabase-visit.repository.ts` | crear, obtener, por pet, por rango de fecha, recordatorios |
| Tratamientos | `Treatment` | `treatments` (FK → `veterinary_visits.id`) | `supabase-treatment.repository.ts` | crear, actualizar, is-active, get-active-status, progreso (`TreatmentProgressService`) |
| Medicación en tratamiento | `MedicacionTreatment`* | — | `supabase-medication-treatment.repository.ts` | agregar medicación a un tratamiento |
| Medicación | `Medication` | — | `supabase-medication.repository.ts` | actualizar dosis/frecuencia |
| Cirugías | `PetSurgery` | `pet_surgeries` (FK → `veterinary_visits.id`) | `supabase-pet-surgery.repository.ts` | crear, buscar por id/pet/visita, actualizar, eliminar |
| Vacunas | `Vaccine` | `vaccines` (**con** `user_id`, ver §6) | `supabase-vaccine.repository.ts` | aplicar, chequear vencimiento, recordatorios |
| Laboratorios | `LabTest` | `lab_tests` (**sin** `user_id`/`pet_id`, solo `visit_id`) | `supabase-lab-test.repository.ts` | crear, obtener por visita, chequear normalidad, actualizar resultado |
| Peso | `weightRecord`** | `WeightRecord` (columnas PascalCase: `PetId`, `Weight`, `Date`, `Note`, `Created_at` — **sin** `UserId`/`Unit`) | `supabase-weight-record.repository.ts` | crear, listar, por pet, último, actualizar |

\* nombre de archivo con typo histórico: `medicacion-treatment.entity.ts` (con "c"), la clase interna sí es `Medication...`. No lo renombres sin actualizar todos los imports.
\*\* única entidad/interfaz del repo en `camelCase` en vez de `PascalCase` (`weightRecord`, `weightRecordProps`, `weightRecordRepository`). Es intencional-por-inercia, no un typo tuyo: mantenlo consistente con el resto del módulo hasta que alguien haga el rename completo (ver §10).

## 5. Mapa de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET, POST | `/api/cron/vaccine-reminders` | **Solo `X-Internal-Api-Key`.** GET = prueba con `petId`; POST = recordatorio con `petId` (el dueño sale de Pets) |
| GET, POST | `/api/cron/visit-reminders` | **Solo `X-Internal-Api-Key`.** Igual que vacunas |
| GET, POST, PATCH | `/api/lab` | Listar/chequear por `visit_id`, crear, actualizar resultado |
| GET, PUT | `/api/medications/[id]` | Obtener / actualizar dosis-frecuencia |
| GET, POST | `/api/surgery` | Listar, crear |
| GET, PUT, PATCH, DELETE | `/api/surgery/[id]` | CRUD por id |
| GET | `/api/surgery/pet/[petId]`, `/api/surgery/visit/[visitId]` | Filtros |
| POST | `/api/treatments` | Crear (requiere `visitId` existente, ver §10) |
| GET, PUT | `/api/treatments/[id]` | Obtener / actualizar |
| POST | `/api/treatments/[id]/add-medication` | Agregar medicación al tratamiento |
| GET | `/api/treatments/[id]/is-active` | Estado activo/expirado |
| GET, POST | `/api/vaccines` | Listar, aplicar |
| PUT | `/api/vaccines/[id]` | Actualizar |
| GET | `/api/vaccines/[id]/due` | Vencimiento |
| POST | `/api/visits` | Crear visita |
| GET, PUT | `/api/visits/[id]` | Obtener / actualizar |
| GET | `/api/visits/[id]/treatment`, `/api/visits/date-range`, `/api/visits/pet/[petId]` | Consultas |
| GET, POST, PATCH | `/api/weight` | Peso. GET y PATCH con `?petId=` (GET sin `petId` ya no lista todo: 400). POST con el mismo body para dueño y clínica |
| GET | `/api/visits/veterinary/[veterinaryId]?from=&to=` | **MED-07.** Visitas de una clínica. `veterinaryId` debe ser el del token (403 `TENANT_MISMATCH`) |
| GET, POST | `/api/documents` | **Exclusivo de la veterinaria.** `GET ?petId=` lista; `POST` multipart (`file`, `petId`, `documentType`, `title`; opcionales `visitId`, `surgeryId`, `labTestId`). PDF/JPG/PNG, máx. 10 MB. Dueño → 403 |
| GET, DELETE | `/api/documents/[id]` | **Exclusivo de la veterinaria.** `GET` devuelve metadatos y URL firmada de 10 min. `DELETE` solo lo puede hacer la clínica que lo subió |
| GET | `/api/pets/[petId]/clinical-summary` | **MED-07.** Resumen para recepción y IA: vacunas (vigente/vencida), tratamientos activos, último peso. `allergies` es `null` (no disponible en Medical, D9) |

Autenticación por ruta (MED-01/MED-03): todas exigen `Authorization: Bearer <token>` salvo `/api/cron/**` (exige `X-Internal-Api-Key`). Quién puede qué está en §2.2.

Cambios de comportamiento de esta versión (rompen clientes antiguos):
- `userId` ya no viene en el body de ninguna ruta. Sale del token (`sub`), y para notificaciones, del dueño resuelto en Pets.
- Escritura de historia: el dueño (de su mascota) usa el body base de cada endpoint; los campos extra del mockup solo los guarda la veterinaria (`src/application/clinical/clinic-only.ts`, `parseClinicExtras`). `source` del registro sale del token (`OWNER` o `CLINIC`).
- `POST /api/treatments` y `POST /api/lab`: la mascota sale de la visita (`visitId` / `visit_id`); `petId` del body ya no se usa para autorizar.
- `GET /api/visits/date-range`: solo clínica; filtra por la clínica del token (un dueño no puede listar visitas de otras mascotas).
- `DELETE /api/surgery/[id]`: solo la clínica que creó la cirugía.

Respuestas: las rutas tocadas devuelven los errores de autorización con el formato del contrato (`{ timestamp, status, error, message, code }`); el resto conserva su forma anterior (`{ success, data }` o `{ error }`, ver D7 en §10).

## 6. Persistencia — Supabase

- Dos proyectos de Supabase **distintos** en el ecosistema: este backend usa el suyo (`NEXT_PUBLIC_SUPABASE_URL`), el `notification-microservice-pubsub` usa otro. No están relacionados a nivel de datos — la única integración entre servicios es Pub/Sub.
- `src/infrastructure/database/supabase/client.ts` — `createBrowserClient` (anon key), usado por la mayoría de repos "modernos" (weight, lab, etc.). Loguea `"🔍 URL existe"` / `"🔍 KEY existe"` en cada llamada; es ruido intencional para debug, no lo repliques en repos nuevos.
- `src/infrastructure/database/supabase/client-surgery.ts` — cliente aparte con `createClient` (server) + tipos `Database` manuales, solo para `pet_surgeries`. Legado de cuando cada módulo tenía su propio cliente; no lo generalices.
- FKs reales a tener en cuenta: `treatments.visit_id → veterinary_visits.id`, `pet_surgeries.veterinary_visit_id → veterinary_visits.id`. Un `POST` con un id que no existe en la tabla referenciada falla con `23503 foreign_key_violation` (Postgres), no con un 400 propio — el mensaje ya es descriptivo, no lo enmascares.
- Convención de nombres de columnas **inconsistente entre tablas**: `veterinary_visits`/`lab_tests`/`pet_surgeries` usan `snake_case`; `WeightRecord` usa `PascalCase` (`PetId`, `Weight`, `Created_at`). Revisa la tabla real antes de escribir un `.select()`/`.insert()` nuevo.
- `vaccines.user_id` (uuid, nullable): se agregó en esta sesión como el **patrón de referencia** para persistir `userId` de verdad en vez de pasarlo solo por el body/evento. `CreateVaccineData.userId` → `VaccineMapper.toDomain` → `insertData.user_id` en `supabase-vaccine.repository.ts` → `mapToVaccine` lo lee de vuelta (`data.user_id ?? ''`) en vez de devolver `''` fijo. El `GET /api/vaccines?petId=` ya no toma `userId` de un query string opcional — usa el de cada fila. Filas creadas antes de la columna quedan con `user_id = null`. **No hay backfill por SQL**: la tabla `pets` vive en la base de datos del servicio Pets, no en la de Medical, así que el dueño de una mascota no se puede resolver desde aquí. Esas filas se rellenan cuando exista la fuente correcta (ver D2/D3 del plan de autorización). Si `weight-record` o `lab_tests` necesitan lo mismo algún día, replica este patrón en vez de reinventar uno.

**Autoría y auditoría (MED-02, MED-05, migración `002`):**
- Toda escritura de la clínica guarda `veterinary_id` y el empleado (`attended_by_employee_id`, `surgeon_employee_id`, `applied_by_employee_id`) y el usuario (`created_by_user_id`/`attended_by_user_id`) **desde el token**.
- Peso: `WeightRecord."Source"` (`OWNER` | `CLINIC`) y `"VeterinaryId"`. Lo fija `authorizePet`.
- Visitas: `appointment_id` tiene índice único parcial: una cita atendida produce como máximo una visita (409 `APPOINTMENT_ALREADY_ATTENDED`).
- Visitas, campos de "Registrar visita" (diseño 13 oct): `heart_rate`, `respiratory_rate`, `mucous_membranes` (enum), `body_condition_score` (1 a 9), `anamnesis`, `physical_exam`, `plan`, además de `weight`, `temperature`, `diagnosis`, `notes`. Todos opcionales. La validación vive en `src/application/visits/visit-clinical-fields.ts` y la forma de respuesta en `src/application/mappers/visit-response.mapper.ts`; todas las rutas de visitas usan ese mapper.
- `clinical_audit_log`: cada CREATE/UPDATE/DELETE de escritura clínica queda con actor, clínica y `changes` (antes/después de lo que cambió). Lo escribe `SupabaseClinicalAuditRepository` desde la ruta. **Limitación:** supabase-js no tiene transacciones: si la auditoría falla, la escritura ya ocurrió y el error solo se loguea.
- Las rutas que escriben en dos pasos (autoría después del insert en `pet_surgeries` y `lab_tests`) hacen un `update` posterior. Si ese update falla, la fila queda sin autoría y el DELETE de cirugías no encontrará a la clínica creadora: revisar el log antes de confiar en el borrado.
- `lab_tests.pet_id` ahora existe (002). Los exámenes viejos quedan con `pet_id = null` y se resuelven por la visita (`petIdOfLabTest`).
- `vaccines.user_id` es el dueño **resuelto en Pets** (puede ser `null` si la mascota aún no tiene dueño con cuenta). Una vacuna no se registra si no se puede resolver el dueño (503): la notificación es parte del flujo.

**Regla de bases de datos:** cada servicio tiene su propia BD. Medical **no** debe leer tablas de Pets (ni `pets`, ni ninguna otra); los datos de mascota y de dueño se piden por HTTP al servicio correspondiente o llegan en el request/token. Las relaciones entre servicios se resuelven en el frontend por IDs, no por joins de BD.

## 7. Mensajería — Google Cloud Pub/Sub

### 7.1 Topics y eventos

| Topic (`PUBSUB_TOPICS`) | Suscripción (`sub-notificaciones-*`) | Eventos |
|---|---|---|
| `medical-pet-lab-test` | `lab-test` | `LAB_TEST_CREATED`, `LAB_TEST_RESULT_UPDATED`, `LAB_TEST_IS_NORMAL_CHECKED`, `LAB_TEST_UPDATED` |
| `medical-pet-medications` | `medications` | `MEDICATION_ADDED`, `MEDICATION_PRESCRIBED`, `MEDICATION_ADMINISTERED`, `MEDICATION_UPDATED` |
| `medical-pet-surgery` | `surgery` | `SURGERY_SCHEDULED`, `SURGERY_COMPLETED` |
| `medical-pet-treatments` | `treatments` | `TREATMENT_STARTED`, `TREATMENT_UPDATED`, `TREATMENT_COMPLETED` |
| `medical-pet-vaccine` | `vaccine` | `VACCINE_APPLIED`, `VACCINE_DUE_REMINDER`, `VACCINE_OVERDUE_REMINDER`, `VACCINE_UPDATED` |
| `medical-pet-visits` | `visits` | `VISIT_SCHEDULED`, `VISIT_COMPLETED`, `VISIT_DUE_REMINDER`, `VISIT_OVERDUE_REMINDER` |
| `medical-pet-weight-record` | `weight` | `WEIGHT_RECORDED`, `WEIGHT_ALERT`, `WEIGHT_UPDATED` |

El shape exacto de cada payload está tipado en `src/infrastructure/pubsub/interfaces/pubsub.interface.ts` (`PubSubEventMap`). Todo evento nuevo se agrega ahí primero (union `PubSubEvent` + interfaz de datos + entrada en el map), luego en el publisher correspondiente.

### 7.2 Cómo se publica

`route.ts` → `createXPublisher()` (factory, singleton de `PubSubService`) → `publisher.publishY(data)` → `pubSubService.publishDomainEvent(topic, { eventType, userId, recipient?, payload, occurredAt })`. El mensaje final en el topic es el sobre común de `CONTRATOS_COMPARTIDOS.md` §4.1 (documento compartido entre los 7 repos; copia en `docs/` pendiente):

```json
{ "eventType": "WEIGHT_RECORDED", "userId": "...", "recipient": null, "payload": { ... }, "occurredAt": "ISO", "metadata": { "version": "1.0", "source": "medical-pet-backend", "veterinaryId": null, "correlationId": "uuid" } }
```

Reglas aplicadas en `PubSubService` (`assertHasRecipient` / `buildDomainEventEnvelope`):
- Sin `userId` ni `recipient.email`/`recipient.phone` el evento **no se publica** (lanza error, la ruta lo loguea).
- Cada evento recibe un `correlationId` nuevo salvo que el publisher lo pase.
- `metadata.veterinaryId` es `null` por defecto; pasarlo cuando el actor sea una clínica.

**Regla de oro (MED-06):** el **destinatario** de un evento de historia es el **dueño de la mascota**, y lo resuelve Pets (`resolveEventTarget(petId, …)` → `POST /internal/pets/batch`). Nunca sale del body: un body podría notificar a un tercero. Si el dueño no tiene cuenta (`claimStatus = UNCLAIMED`), `userId = null` y `recipient` lleva el contacto que devuelve Pets (contrato §4.1, regla 1). Si Pets no responde, el evento se omite con log y la respuesta HTTP sigue siendo exitosa.

Todo evento de la clínica lleva en `payload` `veterinaryId` y `veterinaryName` (el nombre sale de Veterinary, opcional) y en `metadata.veterinaryId`. Los publishers reciben `EventContext` (`src/infrastructure/pubsub/publishers/event-context.ts`).

Supuesto que Pets debe cumplir para esto: `POST /internal/pets/batch` devuelve, por mascota, `ownerId`, `name`, `claimStatus` y `ownerContact` (`{ name, email, phone }`) cuando `claimStatus = UNCLAIMED`. Hoy no existe en Pets y hay que confirmarlo (ver `PETS_SERVICE_CHANGES.md`).

### 7.3 Publish nunca debe romper la respuesta HTTP

Patrón usado en **todas** las rutas:

```ts
const result = await useCase.execute(...);
try {
  await publisher.publishAlgo({ ... });
} catch (pubsubError) {
  console.error('❌ Error publicando en Pub/Sub:', pubsubError);
}
return NextResponse.json(result, { status: 200|201 });
```

Consecuencia importante para debug: **si Pub/Sub falla, la API igual responde 200/201**. El único rastro es el `console.error`. Si "las notificaciones no llegan" pero la API funciona, lo primero es mirar logs del proceso (`docker logs`, `gcloud run services logs read`), no la respuesta HTTP.

### 7.4 Autenticación de Pub/Sub por entorno — la parte que rompe en cada deploy

`PubSubService.createPubSubClient()` (`src/infrastructure/pubsub/services/pubsub.service.ts`) crea el cliente **sin pasar `credentials`**, confiando en Application Default Credentials (ADC) de `google-auth-library`, y toma el project id de `GCP_PROJECT_ID` o si no `GOOGLE_CLOUD_PROJECT`.

| Entorno | De dónde sale la credencial | De dónde sale `GOOGLE_CLOUD_PROJECT` |
|---|---|---|
| `npm run dev` (host) | ADC de `gcloud auth application-default login` → `%APPDATA%\gcloud\application_default_credentials.json` en Windows | `.env.local` (Next.js lo carga solo) |
| Docker local | **No existe dentro de la imagen** salvo que la montes explícitamente | `.dockerignore` excluye `.env.local` → hay que pasarlo con `--env-file` o `-e` |
| Cloud Run | El service account **runtime** del servicio, vía metadata server (no requiere key file) | Pásalo con `--set-env-vars` |

Errores típicos y su causa exacta:
- `Unable to read the credential file specified by GOOGLE_APPLICATION_CREDENTIALS: ... does not exist, or it is not a file` → el `-v` de Docker montó una ruta que no existe en el host; Docker Desktop crea un **directorio vacío** en su lugar. Verifica `Test-Path` de la ruta origen antes de montarla.
- `7 PERMISSION_DENIED: User not authorized to perform this action.` (en Cloud Run) → el service account del servicio no tiene `roles/pubsub.publisher`. Si no especificaste `--service-account` al desplegar, es el compute SA por defecto (`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`); dale el rol:
  ```bash
  gcloud projects add-iam-policy-binding <PROJECT_ID> \
    --member="serviceAccount:<SA_EMAIL>" --role="roles/pubsub.publisher"
  ```
- Publish "exitoso" (200 en la API, log `✅ ... publicado`) pero el suscriptor descarta el evento → revisa `userId`/`petId` en el payload (§7.2), no la autenticación.

## 8. Testing

```bash
npm test              # jest, un run
npm run test:watch
npm run test:coverage
```

- `jest.config.js`: `ts-jest`, `testEnvironment: 'node'`, `roots: ['<rootDir>/src']` → **solo** se testea `src/`, los `route.ts` de `app/api` no tienen tests directos.
- Mock manual de `uuid` en `src/__mocks__/uuid.js` (mapeado en `moduleNameMapper`).
- Los tests de repositorios Supabase mockean el query builder encadenable (`.from().select().eq().order().limit().single()`); si agregas un método nuevo al repo, el mock del builder en el test correspondiente tiene que exponer los mismos métodos, y si alguno resuelve una promesa **con `@jest/globals`** (sin `@types/jest` global) tiene que tiparse — `jest.fn()` sin genéricos infiere retorno `unknown` y `mockResolvedValue(...)` termina esperando un argumento `never`. Patrón usado en este repo:
  ```ts
  type AsyncFn = (...args: unknown[]) => Promise<{ data: unknown; error: unknown }>;
  const mockSingle = jest.fn<AsyncFn>().mockResolvedValue({ data, error: null });
  ```
  Para mocks de un repositorio completo, tipa la variable como `jest.Mocked<XRepository>` (no como la interfaz cruda) — si no, `jest.fn()` no es asignable a las firmas concretas de cada método.
- Convención de nombres: `<algo>.use-case.test.ts` dentro de `__test__/` junto al código que prueba.
- Tests de `PubSubService` (`pubsub-envelope.test.ts`): mockean `@google-cloud/pubsub` y además `@nestjs/common` y `@nestjs/config`, porque `@nestjs/common` es ESM y Jest (ts-jest, CJS) no lo carga. Si un test nuevo importa un servicio con decoradores de Nest, replicar ese mock en vez de quitar el decorador.
- Tests de lógica pura (sin Nest ni Supabase), como `src/shared/__test__/business-date.test.ts`, no necesitan mocks.
- Tests de la capa de auth y clientes (`src/infrastructure/auth/__test__`, `clinical/__test__`, `clients/__test__`, `http/__test__`): los clientes HTTP (`pets.client`, `veterinary.client`) se simulan con `jest.mock` y se prueba la regla de decisión (dueño vs. clínica, permisos, 503, destinatario del evento). `jest.fn` tipado con genéricos (`jest.fn<(token: string) => Promise<…>>()`) porque `tsc` incluye los tests.
- Prueba **manual** end-to-end sin Pets/Veterinary reales: `node scripts/dev-auth/stub-services.mjs` (imprime tokens firmados) y `npx next dev` con las variables de §9 apuntando al stub. Sirve para ver 401/403/503 reales. Las escrituras necesitan Supabase con las migraciones 001 y 002 aplicadas.

## 9. Variables de entorno

| Variable | Dónde se usa | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente Supabase | build-time (se incrusta en el bundle) y runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | respaldo de `serverSupabaseKey()` (`supabase/server-key.ts`) | ídem. Solo se usa si falta `SUPABASE_SERVICE_ROLE_KEY`; con RLS activo, la anon key no puede escribir |
| `GOOGLE_CLOUD_PROJECT` | `PubSubService` (fallback de `GCP_PROJECT_ID`) | runtime, **no** se incrusta en build |
| `GCP_PROJECT_ID` | `PubSubService` (prioridad sobre `GOOGLE_CLOUD_PROJECT`) | opcional |
| `GOOGLE_APPLICATION_CREDENTIALS` | ADC de `google-auth-library` | solo hace falta fuera de GCP (dev/Docker); en Cloud Run se resuelve solo |
| `JWT_JWKS_URI` | `authenticate()` (`jose`) | **Obligatoria** para cualquier ruta protegida. URL del JWKS del User service (`…/.well-known/jwks.json`). Runtime, sin `NEXT_PUBLIC_` |
| `PETS_SERVICE_URL` | `pets.client.ts` (dueño, batch) | Base de Pets, sin `/` final. Runtime |
| `VETERINARY_SERVICE_URL` | `veterinary.client.ts` (access, summary) | Base de Veterinary. Runtime |
| `INTERNAL_API_KEY` | `X-Internal-Api-Key` (cron entrante y llamadas a Pets/Veterinary) | Misma clave en todos los servicios (contrato §2). Runtime. Sin ella, las llamadas internas fallan con 500/503 |
| `SUPABASE_SERVICE_ROLE_KEY` | Todos los clientes de servidor: `serverSupabaseKey()` (`client.ts`, `client-surgery.ts`, `supabase-vaccine.repository.ts`) y Storage del bucket `clinical-documents` | Secreta: solo runtime, nunca `NEXT_PUBLIC_`. Salta RLS: las 9 tablas clínicas tienen RLS activo y sin ella los inserts fallan con "violates row-level security policy". Sin ella se usa la anon key como respaldo |

Para probar en local con el stub de `scripts/dev-auth/`: `JWT_JWKS_URI=http://localhost:8099/.well-known/jwks.json`, `PETS_SERVICE_URL=http://localhost:8099`, `VETERINARY_SERVICE_URL=http://localhost:8099`, `INTERNAL_API_KEY=dev-internal-key` (valor del stub). No se guardan en `.env.local` del repo.

`.env.local` está en `.gitignore` y en `.dockerignore` — nunca llega a la imagen. Pásalo por `--build-arg` (solo las `NEXT_PUBLIC_*`) o `--env-file`/`-e` en runtime.

## 10. Deuda técnica conocida / cosas que no son bugs tuyos

- **Naming inconsistente en `weight-record`**: DTOs `WeightRecordResponseDto` (`PascalCase`) conviven con la entidad/interfaz `weightRecord` (`camelCase`). Fue un refactor de notificaciones parcialmente aplicado; `userId`/`unit` en las respuestas de `findAll`/`findByPetId`/`getLatestByPetId`/`updateWeightByPetId` siguen hardcodeados como `''`/`'kg'` porque la tabla `WeightRecord` todavía no tiene esas columnas — son placeholders, no datos reales. **`vaccines.user_id` (§6) ya es el ejemplo de cómo resolverlo bien** si algún día hay que hacer lo mismo aquí: agregar la columna + repetir el mismo flujo entidad → mapper → insert → `mapToVaccine`.
- **Fecha de negocio:** "hoy" se calcula con `todayInTimeZone()` (`src/shared/business-date.ts`, zona `America/Bogota` por defecto), **no** con `toISOString()`. Quedan pendientes en mappers/entidades que formatean fechas de registros existentes (no de "hoy"); ahí la fecha ya viene fijada por el usuario y no cambia de día.
- **Migraciones:** scripts SQL en `db/scripts/`, aplicados a mano en el SQL Editor de Supabase, en orden. `001` (autoría) y `002` (`appointment_id`, `lab_tests`, `manufacturer`, `clinical_audit_log`). **Sin 002 aplicada, las escrituras de autoría fallan.**
- **`lab_tests`:** ya tiene `pet_id`/`veterinary_id` (002). Notificaciones y autorización salen de Pets y de la visita, no de la tabla de mascotas.
- **Estado de MED-01…07** (`MEDICAL_SERVICE_CHANGES.md`): implementados en código. Pendientes que dependen de otros servicios: Pets (`/internal/pets/{id}/owner/{u}`, `/internal/pets/batch` con `ownerContact`) y Veterinary (`/internal/veterinaries/{v}/patients/{p}/access`, `/summary`). Sin ellos, toda ruta protegida responde 503 (no 403).
- **D9 — alergias:** no existen en Medical. `clinical-summary` devuelve `allergies: null`. Decidir si viven en Pets o Medical (`MYANIMALOG_VET_BRECHAS.md` §9.2).
- **D10 — resuelto (27 oct 2026):** el dueño escribe historia de su propia mascota con el body base de cada endpoint (como antes). Los campos extra del mockup solo los guarda la veterinaria (`clinic-only.ts`). Esto contradice MED-03 de `MEDICAL_SERVICE_CHANGES.md` (que pedía 403 al dueño); el documento de MED-03 no se ha cambiado y debe alinearse con esta decisión.
- **`AGENTS.md`/`CLAUDE.md`**: este archivo es la fuente de verdad; `CLAUDE.md` solo hace `@AGENTS.md`. Si edita uno de los dos, edita este.
- **Archivos sueltos a limpiar**: `tsconfig.json5` (scratch, no lo lee nada). `sa.json` ya fue eliminado y `sa.json`, `*-sa.json`, `service-account*.json`, `gcp-key*.json` están en `.gitignore`.
- **Pendientes de decisión (plan de autorización por clínica, ver `MEDICAL_SERVICE_CHANGES.md`):**
  - D5: qué incluye `CLINICAL_READ_BASIC` (el contrato dice nombre/especie/alergias/próxima cita; MED-07 agrega vacunas, tratamientos y último peso).
  - D6: prefijo de los cron (`/api/cron/**` vs. `/internal/**` del contrato §2).
  - D7: formato de error. Hoy las rutas devuelven `{ error }`; el contrato pide `{ timestamp, status, error, message }`. Cambia 21 archivos y rompe clientes.
  - D8: nombres de suscripción. El contrato dice `sub-notificaciones-<topic>`, pero las existentes son `sub-notificaciones-weight`, etc. Se propone corregir el contrato, no renombrar las suscripciones.
  - Pendiente de otro servicio: Pets no expone `/internal/pets/...` ni emite el sobre §4.1 (ver `PETS_SERVICE_CHANGES.md`); User emite `ctx`/`sub` pero el access token todavía dura 60 min (el contrato pide 15).
  - Medical: MED-01 (JWT + `sub`), MED-02/03 (autoría y autorización por actor), MED-04 (`appointmentId`), MED-05 (auditoría), MED-06 (destinatario desde Pets) y MED-07 (consultas de clínica) están implementados en código. Quedan pendientes de confirmar con otros equipos: formato real de `/internal/pets/batch` y los endpoints de Veterinary (ver §2.2 y §10 de `MEDICAL_SERVICE_CHANGES.md`).
  - D7 (formato de error) queda **parcial**: las rutas tocadas ya devuelven el formato del contrato; las que no se tocaron siguen con `{ success, message }` o `{ error }`. Unificarlas es un cambio para todos los clientes a la vez.
  - Cambio de cliente pendiente: las apps y el panel tienen que mandar `Authorization: Bearer` y dejar de enviar `userId`/`ownerId`/`veterinaryId`.
- **`README.md`** es el boilerplate de `create-next-app`, sin actualizar.
- **Sin CI** (`.github/workflows` no existe). `npm test` / `npm run build` / `npx tsc --noEmit` corren solo localmente o en el build de Docker.

## 11. Docker

> **`docker run` local y Cloud Run son completamente independientes.** Correr `docker run ...` en tu máquina no despliega, actualiza ni afecta de ninguna forma el servicio en Cloud Run — son dos procesos distintos con sus propias credenciales (ver tabla de §7.4). Para Cloud Run, el único camino es `gcloud run deploy` (§12) con la imagen en un registry.

`Dockerfile` multi-stage:
1. `deps` — `npm ci`.
2. `builder` — copia todo, recibe `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` como `--build-arg`, corre `npm run build` (incluye `tsc` — si el proyecto no tipa limpio, el build falla aquí, no en runtime).
3. `runner` — imagen final `node:22-alpine`, copia la salida `standalone`, usuario no-root `nextjs`, `CMD ["node", "server.js"]`.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=$env:NEXT_PUBLIC_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$env:NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -t medical-pet-microservice .

docker run -d --name pets-app -p 3000:3000 `
  --env-file .env.local `
  -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/adc.json `
  -v "$env:APPDATA\gcloud\application_default_credentials.json:/gcp/adc.json:ro" `
  medical-pet-microservice
```

`docker-compose.yml` conecta el servicio a una red externa `microservicios-net` (compartida con otros microservicios del ecosistema, incluye variables de un Eureka server que no está implementado en este repo — es config heredada de una versión anterior del stack).

## 12. Despliegue en Cloud Run

```bash
gcloud run deploy <SERVICE_NAME> \
  --region <REGION> \
  --image <IMAGE> \
  --service-account=<SA_CON_roles/pubsub.publisher> \
  --set-env-vars=GOOGLE_CLOUD_PROJECT=<PROJECT_ID>,NEXT_PUBLIC_SUPABASE_URL=...,NEXT_PUBLIC_SUPABASE_ANON_KEY=...,JWT_JWKS_URI=<USER_URL>/.well-known/jwks.json,PETS_SERVICE_URL=<PETS_URL>,VETERINARY_SERVICE_URL=<VET_URL> \
  --set-secrets=INTERNAL_API_KEY=<SECRET_NAME>:latest \
  --allow-unauthenticated
```

No olvides que los topics deben existir de antemano en el proyecto (`gcloud pubsub topics create <topic>`) y que el `notification-microservice-pubsub` (consumidor, suscripción **pull**) se escala a cero en Cloud Run igual que este — necesita `--min-instances=1 --no-cpu-throttling`, cambiar a suscripción **push**, o correr en otro compute (GKE, Cloud Run jobs) para procesar mensajes de forma confiable.

## 13. Comandos rápidos

```bash
npm run dev             # http://localhost:3000
npm run build           # incluye tsc --noEmit
npm run lint
npm test / test:watch / test:coverage
npx tsc --noEmit -p tsconfig.json     # solo tipos, sin build completo
node scripts/dev-auth/stub-services.mjs   # JWKS + Pets + Veterinary simulados y tokens de prueba (puerto 8099)
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
