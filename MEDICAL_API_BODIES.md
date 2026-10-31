# Medical — bodies por endpoint (dueño y clínica)

> Contrato de entrada de la API de Medical después de MED-01…07 (`MEDICAL_SERVICE_CHANGES.md`).
> Un solo endpoint sirve al **dueño** (token `ctx = USER`) y a la **clínica** (token `ctx = VETERINARY`). Los campos de clínica son **opcionales**; quién escribe se decide por el token, no por el body.
> Fuente de verdad del comportamiento: `AGENTS.md` §2.2 y §5.
> Fecha: 27 de octubre de 2026.

## Convenciones

| Tema | Regla |
|---|---|
| Autenticación | `Authorization: Bearer <token>` en todas las rutas, salvo `/api/cron/**` (que exige `X-Internal-Api-Key`). |
| Identidad | `userId` **no** se envía. Sale de `sub`. `veterinaryId` y el empleado salen del token de clínica. |
| Campos `*` | Obligatorio. Sin `*` = opcional. |
| Fechas | `YYYY-MM-DD` para día, ISO-8601 para instantes. "Hoy" en zona de la clínica (`America/Bogota`). |
| Errores de autorización | `{ "timestamp", "status", "error", "message", "code" }`. Códigos: `TOKEN_INVALID` / `TOKEN_EXPIRED` (401), `CLINIC_TOKEN_REQUIRED`, `PET_NOT_OWNED`, `NO_ACCESS_TO_PET`, `INSUFFICIENT_PERMISSION`, `TENANT_MISMATCH` (403), `APPOINTMENT_ALREADY_ATTENDED` (409), `EXTERNAL_SERVICE_UNAVAILABLE` (503). |
| Errores de validación | Las rutas tocadas siguen devolviendo su forma anterior (`{ success, message }` o `{ error }`) para los 400 de validación. |
| Campos que el servidor pone | `veterinaryId`, `attendedBy…`, `source`, `userId` de notificación. Si el cliente los manda, se ignoran. |

### Quién puede qué

| Operación | Dueño (USER) | Clínica (VETERINARY) |
|---|:-:|:-:|
| Leer historia (visitas, tratamientos, vacunas, labs, cirugías, peso) | ✅ si es dueño | ✅ con `CLINICAL_READ` |
| Registrar **peso** | ✅ (`Source = OWNER`) | ✅ con `NURSING_WRITE` (`Source = CLINIC`) |
| Crear/editar visitas, tratamientos, medicación, cirugías, labs, vacunas | ✅ con el body base, de su propia mascota | ✅ con el body base + campos extra opcionales |
| Aplicar/editar vacunas | ✅ con el body base | ✅ con el body base + extras |
| Borrar cirugía | ❌ | ✅ solo la clínica que la creó |

---

## 1. Visitas

### `POST /api/visits`

**Dueño:** usa el body base. Los campos de veterinaria (`heartRate`, `plan`…) se ignoran sin error.

**Clínica** (los campos del formulario "Registrar visita", diseño 13 oct):

```json
{
  "petId": "uuid",                         // *
  "reason": "Control de los 15 días",      // * Motivo de consulta
  "date": "2026-10-28",                    // opcional, por defecto hoy en la zona de la clínica
  "appointmentId": "uuid",                 // opcional: cita de Calendar ya atendida (MED-04)
  "veterinarian": "Dra. Sara Ruiz",        // opcional (texto libre)
  "weight": 12.4,                          // opcional, kg (0 < x ≤ 500)
  "temperature": 38.6,                     // opcional, °C (30 a 45)
  "heartRate": 96,                         // opcional, lpm (1 a 400)
  "respiratoryRate": 22,                   // opcional, rpm (1 a 200)
  "mucousMembranes": "ROSADAS",            // opcional: ROSADAS | PALIDAS | ICTERICAS | CIANOTICAS | HIPEREMICAS
  "bodyConditionScore": 5,                 // opcional, entero 1 a 9
  "anamnesis": "Apetito normal",           // opcional
  "physicalExam": "Herida en cicatrización", // opcional
  "diagnosis": "Herida sana",              // opcional
  "plan": "Retirar puntos el lunes",       // opcional
  "notes": "Notas internas"                // opcional
}
```

Respuesta `201`: `data` con los mismos campos en camelCase más `id`, `veterinaryId`, `attendedByEmployeeId`, `createdAt`, `updatedAt`. Un valor fuera de rango responde `400 { success: false, message }`.

Respuesta `201`:

```json
{ "success": true, "message": "Visita creada exitosamente",
  "data": { "id": "uuid", "petId": "uuid", "date": "2026-10-27", "reason": "…", "diagnosis": "…",
            "veterinarian": "…", "notes": "…", "weight": 12.4, "temperature": 38.6,
            "appointmentId": "uuid", "veterinaryId": "uuid", "attendedByEmployeeId": "uuid",
            "createdAt": "…", "updatedAt": "…" } }
```

Errores propios: `409 APPOINTMENT_ALREADY_ATTENDED` si la cita ya tiene visita.

### `GET /api/visits/[id]`

Dueño o clínica con `CLINICAL_READ`. Sin body.

### `PUT /api/visits/[id]`

Solo clínica con `CLINICAL_WRITE`, y solo la clínica que creó la visita (`TENANT_MISMATCH` si es otra).

```json
{ "diagnosis": "Parvovirus", "plan": "Hidratación IV 48 h", "physicalExam": "Deshidratación leve" }
```

Parcial: solo cambian los campos enviados. Acepta cualquiera de los campos clínicos de la sección anterior; al menos uno es obligatorio. `prescriptions` es opcional y solo viaja en el evento `VISIT_COMPLETED`, que se publica cuando llega `diagnosis`. Cada cambio queda en auditoría con antes y después.

### `GET /api/visits/pet/[petId]`

Dueño o clínica con `CLINICAL_READ`. Sin body.

### `GET /api/visits/date-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Solo clínica** (filtra por la clínica del token). Un dueño recibe 403.

### `GET /api/visits/veterinary/[veterinaryId]?from=YYYY-MM-DD&to=YYYY-MM-DD`

**MED-07.** Solo clínica, y `veterinaryId` debe ser el de su token (`TENANT_MISMATCH` si no). `from` y `to` son opcionales.

### `GET /api/visits/[id]/treatment`

Dueño o clínica con `CLINICAL_READ`. Sin body.

---

## 2. Peso

### `POST /api/weight` — **mismo body para dueño y clínica**

```json
{
  "petId": "uuid",          // *
  "weight": 12.4,           // *
  "unit": "kg",             // opcional, por defecto "kg"
  "date": "2026-10-27",     // opcional
  "note": "Después del baño" // opcional
}
```

- Dueño → `source: "OWNER"`, `veterinaryId: null`.
- Clínica con `NURSING_WRITE` → `source: "CLINIC"`, `veterinaryId` del token.

Respuesta `201`: el registro (`id`, `petId`, `weight`, `unit`, `date`, `note`, `createdAt`) más `source` y `veterinaryId`.

### `GET /api/weight?petId=uuid[&latest=true]`

`petId` es **obligatorio** (sin él → 400). Dueño o clínica con `CLINICAL_READ`.

### `PATCH /api/weight?petId=uuid` — mismo body para dueño y clínica

```json
{ "weight": 12.6, "unit": "kg", "note": "Corrección" }
```

`weight` es obligatorio. Corrige el último registro de la mascota y deja auditoría con antes/después.

---

## 3. Vacunas (dueño y clínica)

### `POST /api/vaccines`

```json
{
  "petId": "uuid",                 // *
  "name": "Antirrábica",           // *
  "applicationDate": "2026-10-27", // *
  "lotNumber": "L-2026-88",        // opcional (lote)
  "manufacturer": "Zoetis",        // opcional (fabricante)
  "nextDoseDate": "2027-10-27",    // opcional
  "veterinarian": "Dra. Sara Ruiz",// opcional
  "notes": "Sin reacciones"        // opcional
}
```

Dueño → 403. Si no se puede resolver al dueño de la mascota → `503` (la vacuna no se registra porque la notificación es parte del flujo).

### `GET /api/vaccines?petId=uuid`

Dueño o clínica con `CLINICAL_READ`.

### `PUT /api/vaccines/[id]`

Dueño (de su mascota) o clínica con `NURSING_WRITE`. Campos opcionales: `name`, `lotNumber`, `applicationDate`, `nextDoseDate` (`null` la borra), `veterinarian`, `notes`, `status`. La mascota sale de la vacuna.

### `GET /api/vaccines/[id]/due`

Dueño o clínica con `CLINICAL_READ_BASIC`. Sin body.

---

## 4. Tratamientos y medicación (dueño y clínica)

### `POST /api/treatments`

```json
{
  "visitId": "uuid",              // *  la mascota sale de la visita
  "description": "Antibiótico",   // *
  "startDate": "2026-10-27",      // *
  "endDate": "2026-11-10",        // opcional
  "notes": "Dar con comida",      // opcional
  "protocol": "Standard protocol" // opcional
}
```

`petId` y `userId` ya no se envían: se resuelven desde la visita y el token.

### `GET /api/treatments/[id]` · `GET /api/treatments/[id]/is-active`

Dueño o clínica con `CLINICAL_READ`.

### `PUT /api/treatments/[id]`

Dueño (de su mascota) o clínica con `CLINICAL_WRITE`.

```json
{ "startDate": "2026-10-27", "endDate": "2026-11-12", "notes": "Evolución favorable" }
```

Todos opcionales. Agregar `endDate` o llegar al 100 % de progreso publica `TREATMENT_COMPLETED`.

### `POST /api/treatments/[id]/add-medication`

Dueño (de su mascota) o clínica con `CLINICAL_WRITE`.

```json
{ "name": "Amoxicilina", "dosage": "250 mg", "frequency": "cada 12 h", "duration": "7 días" }
```

Todos obligatorios. `petId` y `userId` los pone el servidor.

### `PUT /api/medications/[id]`

Dueño (de su mascota) o clínica con `CLINICAL_WRITE`. Al menos uno de `dosage` o `frequency`.

```json
{ "dosage": "500 mg", "frequency": "cada 8 h" }
```

### `GET /api/medications/[id]`

Dueño o clínica con `CLINICAL_READ`.

---

## 5. Cirugías

### `POST /api/surgery` (dueño y clínica)

```json
{
  "petId": "uuid",                 // *
  "veterinaryVisitId": "uuid",     // *
  "title": "Esterilización",       // *
  "description": "Ovariohisterectomía", // *
  "surgeryDate": "2026-11-03",     // *
  "durationMinutes": 60,           // *
  "anesthesiaUsed": "Isoflurano",  // opcional
  "postOpInstructions": "Collar isabelino 10 días", // opcional
  "veterinarian": "Dr. Luis Pérez" // opcional (texto)
}
```

El cirujano y la clínica quedan guardados desde el token. Dueño → 403.

### `GET /api/surgery?petId=uuid` o `?visitId=uuid` (al menos uno)

Dueño o clínica con `CLINICAL_READ`. Filtros: `status`, `fromDate`, `toDate`, `stats=true`.

### `GET /api/surgery/pet/[petId]` · `GET /api/surgery/visit/[visitId]`

Dueño o clínica con `CLINICAL_READ`. Mismos filtros.

### `GET /api/surgery/[id]`

Dueño o clínica con `CLINICAL_READ`.

### `PUT /api/surgery/[id]` (dueño y clínica)

Todos opcionales: `title`, `description`, `surgeryDate`, `durationMinutes`, `anesthesiaUsed`, `complications`, `postOpInstructions`, `outcome`, `status`, `nextCheckupDate`. Si `status` es `completed`, se publica `SURGERY_COMPLETED`.

### `PATCH /api/surgery/[id]` (dueño y clínica)

```json
{ "status": "completed", "outcome": "Sin complicaciones" }
```

`status` es obligatorio.

### `DELETE /api/surgery/[id]` (quien la creó)

Sin body. Solo la clínica que creó la cirugía (`TENANT_MISMATCH` si es otra).

---

## 6. Laboratorios

### `POST /api/lab` (dueño y clínica)

```json
{
  "name": "Hemograma",          // *
  "visit_id": "uuid",           // *  la mascota sale de la visita
  "result": "Leucocitos 12000", // opcional
  "normal_range": "6000-17000", // opcional
  "date": "2026-10-27",         // opcional
  "notes": "Sin ayuno",         // opcional
  "veterinarian": "Dra. Sara Ruiz" // opcional
}
```

`userId` y `petId` ya no se envían.

### `GET /api/lab?visit_id=uuid[&isNormal=true]`

Dueño o clínica con `CLINICAL_READ`.

### `PATCH /api/lab?visit_id=uuid` (dueño y clínica)

```json
{ "result": "Leucocitos 4000", "veterinarian": "Dra. Sara Ruiz" }
```

`result` es obligatorio. `userId` y `petId` ya no se envían.

---

## 7. Resumen clínico y consultas de clínica (MED-07)

### `GET /api/pets/[petId]/clinical-summary`

Dueño o clínica con `CLINICAL_READ_BASIC`. Sin body. Respuesta:

```json
{
  "success": true,
  "data": {
    "petId": "uuid",
    "allergies": null,
    "vaccines": [{ "id": "uuid", "name": "Antirrábica", "applicationDate": "2026-01-10", "nextDoseDate": "2027-01-10", "status": "VIGENTE" }],
    "activeTreatments": [{ "id": "uuid", "description": "Antibiótico", "startDate": "…", "endDate": "…" }],
    "lastWeight": { "weight": 12.4, "date": "2026-10-27", "recordedAt": "…" },
    "nextAppointment": null,
    "generatedAt": "…"
  }
}
```

`status` de la vacuna: `VIGENTE` (próxima dosis hoy o después), `VENCIDA`, `SIN_PROXIMA_DOSIS`. `allergies: null` significa "no disponible en Medical" (decisión D9), no "sin alergias".

### `GET /api/visits/veterinary/[veterinaryId]`

Ver §1.

---

## 8. Cron (solo `X-Internal-Api-Key`)

- `GET /api/cron/vaccine-reminders?petId=uuid` y `GET /api/cron/visit-reminders?petId=uuid`: prueba.
- `POST /api/cron/vaccine-reminders?petId=uuid` y `POST /api/cron/visit-reminders?petId=uuid`: sin body. El dueño sale de Pets. Si la mascota no tiene dueño con cuenta → `409 OWNER_WITHOUT_ACCOUNT`.

```bash
curl -X POST "$MEDICAL/api/cron/visit-reminders?petId=$PET" -H "X-Internal-Api-Key: $INTERNAL_API_KEY"
```

---

## 9. Ejemplo completo: el mismo peso, dos actores

```bash
# Dueño (su app)
curl -X POST "$MEDICAL/api/weight" \
  -H "Authorization: Bearer $TOKEN_DUENO" -H "Content-Type: application/json" \
  -d '{"petId":"'$PET'","weight":12.4,"note":"En casa"}'
# → 201 { …, "source": "OWNER", "veterinaryId": null }

# Clínica (panel)
curl -X POST "$MEDICAL/api/weight" \
  -H "Authorization: Bearer $TOKEN_CLINICA" -H "Content-Type: application/json" \
  -d '{"petId":"'$PET'","weight":12.6}'
# → 201 { …, "source": "CLINIC", "veterinaryId": "uuid-de-la-clinica" }
```

El body es idéntico. Lo que cambia es el token, y con él la autoría.

---

## 10. Campos nuevos del mockup por módulo (27 oct 2026)

Todos los campos nuevos son opcionales salvo los que ya eran obligatorios. Dueño y clínica usan el mismo body; lo que escribe la clínica queda con su autoría desde el token.

### Cirugías (`POST /api/surgery`, `PUT|PATCH /api/surgery/{id}`)

```json
{
  "startsAt": "2026-11-03T08:30:00-05:00",   // opcional: hora de inicio ("8:30 a. m.")
  "asaRisk": 1                                 // opcional: 1 a 5 (ASA I a V)
}
```

Se suman a los campos anteriores. Respuesta: `startsAt` y `asaRisk` más los campos de siempre.

### Tratamientos (`POST /api/treatments`, `PUT /api/treatments/{id}`)

```json
{
  "status": "ACTIVO",                         // ACTIVO | FINALIZADO | SUSPENDIDO
  "instructions": "Secar bien entre los dedos después del baño.",
  "suspensionReason": "Reacción cutánea"       // opcional, para SUSPENDIDO
}
```

### Medicación (`POST /api/treatments/{id}/add-medication`, `PUT /api/medications/{id}`)

```json
{
  "status": "REACCION",                       // ACTIVO | TERMINADO | REACCION
  "startDate": "2026-09-28",
  "endDate": "2026-10-26",
  "reactionNote": "Reacción cutánea leve"
}
```

`PUT /api/medications/{id}` acepta solo `status`, sin tocar dosis ni frecuencia.

### Laboratorio (`POST /api/lab`, `PATCH /api/lab?visit_id=`)

```json
{
  "name": "Química sanguínea",
  "visit_id": "uuid",
  "date": "2026-09-05",
  "laboratoryName": "VetLab Cartagena",
  "status": "FUERA_DE_RANGO",                 // NORMAL | FUERA_DE_RANGO | ANORMAL | NEGATIVO | POSITIVO
  "interpretation": "ALT levemente alta, sin signos clínicos.",
  "results": [
    { "parameter": "ALT", "result": "112", "unit": "U/L", "reference": "10 – 100", "flag": "ALTO" }
  ]
}
```

`flag`: `NORMAL`, `ALTO`, `BAJO`, `NEGATIVO`, `POSITIVO`, `ANORMAL`. `PATCH` con `results` reemplaza todos los parámetros. Respuesta: el examen con `results`.

### Vacunas (`POST /api/vaccines`)

Campo nuevo opcional: `replacesVaccineId` (uuid de una dosis de la **misma** mascota). La dosis anterior pasa a `displayStatus: "ANTERIOR"`.

`GET /api/vaccines?petId=` devuelve cada dosis con `source`, `veterinaryId`, `replacedById` y `displayStatus`:
`VIGENTE` · `POR_VENCER` (30 días o menos) · `VENCIDA` · `ANTERIOR` · `SIN_PROXIMA_DOSIS`.

### Peso (`POST /api/weight`, `GET /api/weight?petId=`)

El `POST` no cambia. La respuesta de `GET ?petId=` ahora devuelve la lista completa del historial:

```json
[
  { "id": "uuid", "petId": "uuid", "weight": 12.4, "unit": "kg", "date": "2026-10-02",
    "note": "En casa", "createdAt": "…", "source": "OWNER", "veterinaryId": null,
    "registeredBy": { "userId": "uuid-dueño", "employeeId": null, "role": "OWNER" } }
]
```

`registeredBy.role` es `OWNER` cuando lo registró el dueño, o el rol del empleado (`VETERINARIAN`, `ASSISTANT`…) cuando lo registró la clínica.

---

## 11. Documentos (EXCLUSIVO de la veterinaria)

El dueño recibe **403 `CLINIC_TOKEN_REQUIRED`** en todas estas rutas, aunque la mascota sea suya.

### `POST /api/documents` (multipart/form-data)

| Campo | Tipo | Obligatorio |
|---|---|---|
| `file` | archivo: PDF, JPG o PNG, máx. 10 MB | Sí |
| `petId` | uuid | Sí |
| `documentType` | `LABORATORIO`, `IMAGEN`, `CONSENTIMIENTO`, `FORMULA`, `CERTIFICADO`, `VACUNAS`, `PROTOCOLO`, `OTRO` | Sí |
| `title` | texto, máx. 200 caracteres | Sí |
| `visitId`, `surgeryId`, `labTestId` | uuid, para vincularlo a una consulta, cirugía o examen | No |

Respuesta `201`:

```json
{ "success": true, "data": { "id": "uuid", "petId": "uuid", "documentType": "LABORATORIO",
  "title": "Resultado de química sanguínea", "mimeType": "application/pdf", "sizeBytes": 184320,
  "visitId": "uuid", "surgeryId": null, "labTestId": null, "source": "CLINIC",
  "veterinaryId": "uuid", "uploadedByUserId": "uuid", "createdAt": "…" } }
```

La ruta de almacenamiento nunca se devuelve.

### `GET /api/documents?petId=uuid`

Lista los documentos de la mascota, del más reciente al más antiguo. Solo clínica con `CLINICAL_READ`.

### `GET /api/documents/{id}`

Devuelve los metadatos y una URL firmada:

```json
{ "success": true, "data": { "id": "uuid", "title": "…", "url": "https://…/signed…", "expiresInSeconds": 600 } }
```

La URL caduca en 10 minutos. Se pide otra cada vez que se necesite.

### `DELETE /api/documents/{id}`

Solo la clínica que subió el documento. Otra clínica recibe 403 `TENANT_MISMATCH`. Borra los metadatos y el archivo.

### Errores

- `400`: tipo de archivo no permitido, más de 10 MB, `documentType` inválido o título vacío.
- `403 CLINIC_TOKEN_REQUIRED`: el token es de dueño.
- `403 INSUFFICIENT_PERMISSION`: la clínica no tiene `DOCUMENT_UPLOAD` (o `CLINICAL_READ` para leer).
- `404`: el documento no existe.
