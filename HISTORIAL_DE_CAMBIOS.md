# Historial de cambios · Medical Pet Backend

> **Cómo se armó este documento:** la conversación local de trabajo anterior no está disponible, así que este historial se reconstruyó a partir del estado real del repo (`git log`, `git status`, diffs sin commitear), de los documentos del proyecto y del trabajo de la sesión del 27 de octubre de 2026. Si algo de la conversación original no aparece aquí, es porque no quedó en el repo.
> Fecha de corte: 27 de octubre de 2026.

## 1. Contexto del proyecto

Medical Pet Backend es el servicio de historia clínica de la plataforma **MyAnimaLog**:

- **MyAnimaLog (B2C):** app del dueño de la mascota. La historia viaja con la mascota entre clínicas.
- **MyAnimaLogVet (B2B):** panel de la clínica. Veterinary (permisos y vínculos), Pets (mascotas y dueños), Calendar (citas), Notifications (avisos) y User (cuentas y tokens) son otros microservicios.
- Medical guarda la historia clínica. No conoce a la clínica por su nombre: la recibe por token y por consultas HTTP a Pets y Veterinary.

Documentos de referencia (en la carpeta del proyecto, fuera de este repo): `MYANIMALOG_VET_MAESTRO.md` (plan y fuente de verdad del ecosistema), `MYANIMALOG_VET_BRECHAS.md`, `MYANIMALOG_VET_CLIENTE.md`, `MYANIMALOG_VET_NEGOCIO.md`, `MYANIMALOG_VET_REGISTRO.md`, `MYANIMALOG_VET_DISENO.md`, `MYANIMALOG_VET_ESTADO.md`, `MYANIMALOG_VET_BACKEND_CONTRATO.md`, `MODULO_MEDICO.md`, `ADMIN_REVISION_DE_DOCUMENTOS.md`, y los de frontend (`ARQUITECTURA.md`).

**Fecha límite de la parte Vet: 3 de noviembre de 2026.**

---

## 2. Trabajo previo (anterior a la sesión del 27 oct)

Estado en git (rama `main`, último commit `3ad7c2c merge: keep local README`):

| Commit | Qué hizo |
|---|---|
| `3ad7c2c` | Merge: se conserva el README local |
| `a8d0601` | `feat: Vaccine has been modified to allow userId` — `vaccines.user_id` como patrón de referencia para persistir el dueño |
| `9a6bd57` | Revisión del README (boilerplate de `create-next-app`, sin actualizar) |
| `d5943ab` | Cambios en `api lab` y `next-env.ts` |
| `7ac762a` | Cambios en use-cases y sus tests |

Cambios **sin commitear** que ya existían al abrir la sesión (no los hizo esta sesión):

- `AGENTS.md`: regla de mantenimiento (la guía se actualiza en el mismo cambio), conteo de tests, `todayInTimeZone` y `db/scripts/001`.
- `app/api/visits/route.ts`, `supabase-visit.repository.ts`, `supabase-vaccine.repository.ts`: "hoy" calculado con `todayInTimeZone()` en vez de `toISOString()`. Se eliminó `getUserIdByPetId` del repositorio de vacunas (consultaba la tabla `pets`, que no es de Medical).
- `pubsub.interface.ts` y `pubsub.service.ts`: sobre común de `CONTRATOS_COMPARTIDOS.md` §4.1 (`DomainEventInput`, `DomainEventEnvelope`, `assertHasRecipient`, `buildDomainEventEnvelope`). Un evento sin `userId` ni contacto no se publica.
- `src/shared/business-date.ts` y su test: zona de negocio `America/Bogota`.
- `src/infrastructure/pubsub/__test__/pubsub-envelope.test.ts`: tests del sobre.
- `db/scripts/001_authorship_columns.sql`: columnas de autoría (`veterinary_visits`, `vaccines`, `pet_surgeries`, `WeightRecord`).
- `CONTRATOS_COMPARTIDOS.md` (nuevo) y `MEDICAL_SERVICE_CHANGES.md` (nuevo): contratos compartidos entre los 7 repos y el plan de cambios de Medical (MED-01…MED-07).

Decisiones que ya estaban tomadas en los documentos:

1. Híbrido en la verificación de clínicas: la IA pre-analiza y una persona decide (nunca la IA sola).
2. Historia de la mascota propiedad del dueño; la clínica ve solo lo que se le comparte.
3. Veterinary no guarda historia clínica; Medical no lee tablas de Pets.
4. Un solo sobre de eventos (`eventType`, `userId`, `recipient`, `payload`, `occurredAt`, `metadata`).
5. Un fallo de Pub/Sub nunca tumba la respuesta HTTP.
6. Escritura clínica solo con tarjeta profesional verificada (`NURSING_WRITE` incondicional para veterinario y auxiliar, según el contrato actualizado).

---

## 3. Trabajo de la sesión del 27 de octubre

### 3.1 Pedido

1. Reconstruir un `.md` de lo hecho (este documento).
2. Implementar lo que pide `MEDICAL_SERVICE_CHANGES.md` y `CONTRATOS_COMPARTIDOS.md`, para probar ya.
3. Entregar los bodies nuevos de los endpoints cambiados.
4. Hacer que los campos de clínica sean **opcionales**, para que un mismo endpoint sirva al dueño y a la clínica (sin un microservicio aparte).
5. Actualizar la guía de Medical con todo lo anterior.

### 3.2 Lo implementado

**Autenticación y autorización (MED-01, MED-03)**

- `src/infrastructure/auth/`: validación RS256 con `jose` contra el JWKS (`JWT_JWKS_URI`), `Actor` construido desde `sub` y los claims de clínica, `withAuth()` para envolver route handlers, `authorizePet()` que decide por tipo de actor, `assertClinicPath()` (regla de `veterinaryId` = `vet_id`), `requireClinicWithRead()` y `assertInternalKey()` para cron.
- `src/infrastructure/clients/`: `pets.client.ts` (dueño, batch), `veterinary.client.ts` (access, nombre de clínica), `internal-http.ts` (timeout de 3 s y 503), `ttl-cache.ts` (60 s).
- Todas las rutas de `app/api` pasan por `withAuth`, excepto los cron (que usan la clave interna).

**Modelo "2 en 1"**

- Un mismo body para dueño y clínica donde aplica (peso). Los campos de clínica son opcionales (`veterinarian`, `appointmentId`, `diagnosis`…).
- `userId`, `veterinaryId` y el empleado salen del token. Se quitó `userId` de todos los bodies.
- Dueño: lectura de su historia y registro de peso (`Source = OWNER`). Clínica: escritura según permisos de `access` (`Source = CLINIC`).

**Autoría y auditoría (MED-02, MED-05)**

- `db/scripts/002_clinical_access_and_audit.sql`: `appointment_id` con índice único parcial, `lab_tests` (`pet_id`, `veterinary_id`, `attended_by_employee_id`), `vaccines.manufacturer`, `attended_by_user_id` y la tabla `clinical_audit_log`.
- `SupabaseClinicalAuditRepository` (con `buildChanges()` para antes/después) llamado desde cada ruta de escritura.
- `pet-lookup.ts`: mascota de un registro (visita, vacuna, tratamiento, medicación, cirugía, lab) sin leer tablas de Pets.

**Eventos (MED-06)**

- `resolveEventTarget()`: el destinatario es el dueño resuelto en Pets; si no tiene cuenta, el contacto.
- Publishers: `event-context.ts` (`EventContext`, `eventContextPayload`, `eventMetadata`). Todos los publishers de historia reciben `recipient`, `veterinaryId` y `veterinaryName`. Se aplicó con un script y se verificó con `tsc`.
- Tipos `userId: string | null` en las interfaces de eventos.

**Visitas (MED-04) y consultas (MED-07)**

- `POST /api/visits` acepta `appointmentId` y responde 409 si la cita ya tiene visita.
- `GET /api/visits/veterinary/[veterinaryId]` y `GET /api/pets/[petId]/clinical-summary`.

**Cambios de comportamiento deliberados**

- `GET /api/weight` sin `petId` → 400. `date-range` solo para clínica. Un dueño recibe 403 al escribir historia. Cirugía: el DELETE solo lo hace la clínica que la creó. `/api/cron/**` exige `X-Internal-Api-Key`.

**Pruebas**

- Nuevos tests: `auth/__test__/actor-and-auth.test.ts`, `auth/__test__/clinical-access.test.ts`, `clinical/__test__/event-target.test.ts`, `clients/__test__/ttl-cache.test.ts`, `http/__test__/api-error.test.ts`, `database/repositories/__test__/supabase-clinical-audit.repository.test.ts`.
- Ajustes de tests existentes: `supabase-weight-record.repository.test.ts` (dos expectativas nuevas: `VeterinaryId` y `Source`).
- Resultado: **57 suites / 443 tests**, `tsc --noEmit` limpio, `next build` compila todas las rutas.

**Herramienta de prueba local**

- `scripts/dev-auth/stub-services.mjs`: simula JWKS, Pets y Veterinary en el puerto 8099 y firma tokens reales (dueño, clínica, otro dueño). Se verificó: 401 sin token, 403 por mascota ajena, 403 `NO_ACCESS_TO_PET`, 403 `CLINIC_TOKEN_REQUIRED`, 403 `TENANT_MISMATCH`, 401 en cron sin clave.

**Documentación**

- `AGENTS.md`: §2.2 (modelo 2 en 1), §3, §5 (mapa de la API con cambios de comportamiento), §6 (autoría, auditoría, regla de oro del destinatario), §8 (testing), §9 (variables nuevas), §10 (estado y pendientes), §12 y §13.
- `MEDICAL_SERVICE_CHANGES.md`: estado de MED-01…07 con archivos y desviaciones.
- `MEDICAL_API_BODIES.md` (nuevo): body por endpoint para dueño y clínica.
- Este documento.

---

## 4. Lo que no se hizo y por qué

| Pendiente | Motivo |
|---|---|
| Probar contra Supabase real (escrituras) | El entorno no alcanza Supabase (`fetch failed`) y no se escribió en la base del equipo. Hay que aplicar `002` y probar en un proyecto de prueba |
| Pets y Veterinary reales | Están en otros repos. Medical depende de `/internal/pets/{id}/owner/{u}`, `/internal/pets/batch` (con `ownerContact`) y `/internal/veterinaries/{v}/patients/{p}/access`, `/summary` |
| Alergias (`clinical-summary.allergies`) | D9: no hay fuente en Medical. Hoy devuelve `null` |
| Dueño que registra visitas o vacunas como "Registrado por el dueño" | D10: el contrato MED-03 lo prohíbe. Requiere decisión del equipo |
| Formato de error unificado (D7) | Cambia todos los clientes a la vez. Hoy solo las rutas tocadas usan el formato del contrato |
| Transacciones entre tablas | supabase-js no las ofrece. Autoría de cirugías y labs se escribe en dos pasos; la auditoría se loguea si falla |
| Cliente de la app del dueño y del panel | Deben mandar `Authorization: Bearer` y dejar de enviar `userId`/`veterinaryId` |
| Commit | No se hizo commit. Los cambios están sin commitear en `main` |

---

## 5. Procesos que quedan corriendo en la máquina

Durante la prueba se levantaron dos procesos en segundo plano y **siguen activos**:

- `node scripts/dev-auth/stub-services.mjs` (puerto 8099).
- `npx next dev -p 3010` (puerto 3010), con las variables de prueba en el entorno del proceso.

Un intento de detenerlos fue rechazado por el control de permisos, así que hay que pararlos a mano (Ctrl+C en su terminal, o `Get-Process node` y cerrar los que correspondan).
