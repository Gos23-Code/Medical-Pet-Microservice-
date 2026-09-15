# Medical Pet Backend — guía técnica

API REST del núcleo clínico de la plataforma **Medical Pet**: historiales veterinarios, tratamientos, medicación, vacunas, cirugías, laboratorios y control de peso. Publica eventos de dominio a Google Cloud Pub/Sub que consume un microservicio de notificaciones separado.

Esta guía es la fuente de verdad para trabajar en el repo (humanos y agentes). `CLAUDE.md` solo apunta aquí (`@AGENTS.md`).

## 1. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), route handlers como API REST — no hay frontend real, `app/page.tsx` es el scaffold de `create-next-app` |
| Lenguaje | TypeScript 5, `strict: true` |
| Runtime | Node 22 |
| Base de datos | Supabase (Postgres) vía `@supabase/supabase-js` / `@supabase/ssr` |
| Mensajería | Google Cloud Pub/Sub (`@google-cloud/pubsub`) |
| DI/decoradores | `@nestjs/common` + `@nestjs/config` usados de forma puntual (clases `@Injectable()` instanciadas a mano con factories, **no** hay una app Nest real corriendo) |
| Testing | Jest 30 + ts-jest, 49 archivos de test |
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

## 3. Estructura de carpetas

```
app/api/                     Route handlers (Next.js App Router)
  cron/{vaccine,visit}-reminders/route.ts    Endpoints para cron jobs (Cloud Scheduler)
  lab/, medications/, surgery/, treatments/, vaccines/, visits/, weight/

src/
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
    database/
      supabase/client.ts       Cliente browser (createBrowserClient) — usado por los repos "nuevos"
      supabase/client-surgery.ts  Cliente server (createClient) — solo pet-surgery
      repositories/supabase-*.repository.ts   Implementación real de cada puerto
      repositories/__test__/    Tests con mocks del builder de Supabase
    pubsub/
      constants/                Nombres de topics y suscripciones
      interfaces/                Catálogo de eventos y sus payloads (PubSubEventMap)
      services/pubsub.service.ts  Wrapper sobre @google-cloud/pubsub
      publishers/*.publisher.ts   Un publisher por dominio
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
| Vacunas | `Vaccine` | — | `supabase-vaccine.repository.ts` | aplicar, chequear vencimiento, recordatorios, `getUserIdByPetId` |
| Laboratorios | `LabTest` | `lab_tests` (**sin** `user_id`/`pet_id`, solo `visit_id`) | `supabase-lab-test.repository.ts` | crear, obtener por visita, chequear normalidad, actualizar resultado |
| Peso | `weightRecord`** | `WeightRecord` (columnas PascalCase: `PetId`, `Weight`, `Date`, `Note`, `Created_at` — **sin** `UserId`/`Unit`) | `supabase-weight-record.repository.ts` | crear, listar, por pet, último, actualizar |

\* nombre de archivo con typo histórico: `medicacion-treatment.entity.ts` (con "c"), la clase interna sí es `Medication...`. No lo renombres sin actualizar todos los imports.
\*\* única entidad/interfaz del repo en `camelCase` en vez de `PascalCase` (`weightRecord`, `weightRecordProps`, `weightRecordRepository`). Es intencional-por-inercia, no un typo tuyo: mantenlo consistente con el resto del módulo hasta que alguien haga el rename completo (ver §10).

## 5. Mapa de la API

| Método | Ruta | Descripción |
|---|---|---|
| GET, POST | `/api/cron/vaccine-reminders` | Recordatorios de vacunas (GET = prueba sin `userId`, POST = con `userId` para notificar) |
| GET, POST | `/api/cron/visit-reminders` | Recordatorios de visitas |
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
| GET, POST, PATCH | `/api/weight` | Listar/último, crear, actualizar |

Todas las rutas devuelven JSON (`{ success, data }` o `{ error }` según el endpoint — no hay un formato de respuesta unificado, revisa la ruta puntual antes de asumir shape).

## 6. Persistencia — Supabase

- Dos proyectos de Supabase **distintos** en el ecosistema: este backend usa el suyo (`NEXT_PUBLIC_SUPABASE_URL`), el `notification-microservice-pubsub` usa otro. No están relacionados a nivel de datos — la única integración entre servicios es Pub/Sub.
- `src/infrastructure/database/supabase/client.ts` — `createBrowserClient` (anon key), usado por la mayoría de repos "modernos" (weight, lab, etc.). Loguea `"🔍 URL existe"` / `"🔍 KEY existe"` en cada llamada; es ruido intencional para debug, no lo repliques en repos nuevos.
- `src/infrastructure/database/supabase/client-surgery.ts` — cliente aparte con `createClient` (server) + tipos `Database` manuales, solo para `pet_surgeries`. Legado de cuando cada módulo tenía su propio cliente; no lo generalices.
- FKs reales a tener en cuenta: `treatments.visit_id → veterinary_visits.id`, `pet_surgeries.veterinary_visit_id → veterinary_visits.id`. Un `POST` con un id que no existe en la tabla referenciada falla con `23503 foreign_key_violation` (Postgres), no con un 400 propio — el mensaje ya es descriptivo, no lo enmascares.
- Convención de nombres de columnas **inconsistente entre tablas**: `veterinary_visits`/`lab_tests`/`pet_surgeries` usan `snake_case`; `WeightRecord` usa `PascalCase` (`PetId`, `Weight`, `Created_at`). Revisa la tabla real antes de escribir un `.select()`/`.insert()` nuevo.

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

`route.ts` → `createXPublisher()` (factory, singleton de `PubSubService`) → `publisher.publishY(data)` → `pubSubService.publishDomainEvent(topic, { eventType, userId, payload })`. El mensaje final en el topic es:

```json
{ "eventType": "WEIGHT_RECORDED", "userId": "...", "payload": { ... }, "occurredAt": "ISO", "metadata": { "version": "1.0", "source": "medical-pet-backend" } }
```

**Regla de oro:** `userId` y `petId` para notificaciones deben salir del **body de la request** cuando el recurso no los persiste. Ejemplo real corregido: `PATCH /api/lab` sacaba `userId`/`petId` de `repository.findByVisistId()`, pero `lab_tests` no tiene esas columnas → llegaban vacíos y el suscriptor descartaba el evento (`evento sin userId, se descarta`). Fix: leerlos del `body` como hace `POST /api/lab`. Antes de cablear un publish nuevo, verifica que el dato exista de verdad en la fuente que estás usando (¿DB o body?).

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

## 9. Variables de entorno

| Variable | Dónde se usa | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente Supabase | build-time (se incrusta en el bundle) y runtime |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente Supabase | ídem |
| `GOOGLE_CLOUD_PROJECT` | `PubSubService` (fallback de `GCP_PROJECT_ID`) | runtime, **no** se incrusta en build |
| `GCP_PROJECT_ID` | `PubSubService` (prioridad sobre `GOOGLE_CLOUD_PROJECT`) | opcional |
| `GOOGLE_APPLICATION_CREDENTIALS` | ADC de `google-auth-library` | solo hace falta fuera de GCP (dev/Docker); en Cloud Run se resuelve solo |

`.env.local` está en `.gitignore` y en `.dockerignore` — nunca llega a la imagen. Pásalo por `--build-arg` (solo las `NEXT_PUBLIC_*`) o `--env-file`/`-e` en runtime.

## 10. Deuda técnica conocida / cosas que no son bugs tuyos

- **Naming inconsistente en `weight-record`**: DTOs `WeightRecordResponseDto` (`PascalCase`) conviven con la entidad/interfaz `weightRecord` (`camelCase`). Fue un refactor de notificaciones parcialmente aplicado; `userId`/`unit` en las respuestas de `findAll`/`findByPetId`/`getLatestByPetId`/`updateWeightByPetId` vienen hardcodeados como `''`/`'kg'` porque la tabla `WeightRecord` no tiene esas columnas — son placeholders, no datos reales. Si necesitas el `userId` real ahí, o agregas la columna en Supabase, o lo resuelves con un lookup como `getUserIdByPetId` (ya existe en `supabase-vaccine.repository.ts`).
- **`lab_tests` no tiene `user_id`/`pet_id`**: cualquier notificación de laboratorio debe sacar esos campos del `body` de la request, nunca del repositorio.
- **`AGENTS.md`/`CLAUDE.md`**: este archivo es la fuente de verdad; `CLAUDE.md` solo hace `@AGENTS.md`. Si edita uno de los dos, edita este.
- **Archivos sueltos a limpiar**: `tsconfig.json5` (scratch, no lo lee nada), `sa.json` (directorio vacío creado por un `docker run -v` con un origen inexistente — bórralo y agrégalo a `.gitignore` para que no vuelva a colarse un service account key ahí por accidente).
- **`README.md`** es el boilerplate de `create-next-app`, sin actualizar.
- **Sin CI** (`.github/workflows` no existe). `npm test` / `npm run build` / `npx tsc --noEmit` corren solo localmente o en el build de Docker.

## 11. Docker

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
  --set-env-vars=GOOGLE_CLOUD_PROJECT=<PROJECT_ID>,NEXT_PUBLIC_SUPABASE_URL=...,NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
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
```
