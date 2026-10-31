# Medical · Endpoints y bodies (dueño y veterinaria)

> Referencia única de la API de Medical, ordenada por módulo. Vigente desde el 28 de octubre de 2026.
> Reemplaza a los encabezados de `MEDICAL_API_BODIES.md` donde hubiera diferencias.

## Índice

1. [Reglas generales](#1-reglas-generales)
2. [Tabla resumen](#2-tabla-resumen)
3. [Visitas](#3-visitas)
4. [Peso](#4-peso)
5. [Vacunas](#5-vacunas)
6. [Tratamientos y medicación](#6-tratamientos-y-medicación)
7. [Cirugías](#7-cirugías)
8. [Laboratorio](#8-laboratorio)
9. [Documentos (solo veterinaria)](#9-documentos-solo-veterinaria)
10. [Resumen clínico](#10-resumen-clínico)
11. [Cron (clave interna)](#11-cron-clave-interna)

---

## 1. Reglas generales

### Quién es quién

| Actor | Token | Qué puede |
|---|---|---|
| **Dueño** | `Authorization: Bearer <token de usuario>` | Leer y escribir la historia de **sus propias** mascotas, con el body base. |
| **Veterinaria** | `Authorization: Bearer <token de clínica>` | Todo lo del dueño, pero sobre cualquier mascota que la clínica tenga compartida, y con los campos extra. |

### Cómo se leen los bodies

- **`*`** = obligatorio.
- **Sin marca** = opcional, y lo pueden enviar **dueño y veterinaria**.
- **`solo veterinaria`** = opcional, y solo lo acepta la veterinaria. Si el dueño lo envía, se ignora sin error.
- Nunca se envían `userId`, `veterinaryId` ni la autoría. Salen del token.

### Errores

Las rutas nuevas devuelven `{ "timestamp", "status", "error", "message", "code" }`. Los códigos más comunes:

| HTTP | `code` | Cuándo |
|---|---|---|
| 401 | `TOKEN_INVALID` / `TOKEN_EXPIRED` | Token falta, es inválido o venció |
| 403 | `PET_NOT_OWNED` | El dueño intenta tocar una mascota ajena |
| 403 | `NO_ACCESS_TO_PET` | La clínica no tiene la mascota compartida |
| 403 | `INSUFFICIENT_PERMISSION` | La clínica no tiene el permiso del rol |
| 403 | `TENANT_MISMATCH` | Otra clínica o el dueño intenta tocar un registro que no es suyo |
| 403 | `CLINIC_TOKEN_REQUIRED` | Solo veterinaria (documentos, consultas por clínica) |
| 409 | `APPOINTMENT_ALREADY_ATTENDED` | La cita ya tiene visita |
| 503 | `EXTERNAL_SERVICE_UNAVAILABLE` | Pets o Veterinary no responden |

Las rutas que no cambiaron devuelven su forma anterior (`{ success, message }` o `{ error }`) para los 400 de validación.

---

## 2. Tabla resumen

| Módulo | Método y ruta | Dueño | Veterinaria | Body |
|---|---|:-:|:-:|---|
| Visitas | `POST /api/visits` | ✅ | ✅ | Sí |
| Visitas | `GET /api/visits/{visitId}` | ✅ | ✅ | No |
| Visitas | `PUT /api/visits/{visitId}` | ✅ (solo las suyas) | ✅ | Sí |
| Visitas | `GET /api/visits/pet/{petId}` | ✅ | ✅ | No |
| Visitas | `GET /api/visits/{visitId}/treatment` | ✅ | ✅ | No |
| Visitas | `GET /api/visits/date-range` | ❌ | ✅ | No |
| Visitas | `GET /api/visits/veterinary/{vetId}` | ❌ | ✅ | No |
| Peso | `POST /api/weight` | ✅ | ✅ | Sí |
| Peso | `GET /api/weight?petId=` | ✅ | ✅ | No |
| Peso | `PATCH /api/weight?petId=` | ✅ | ✅ | Sí |
| Vacunas | `POST /api/vaccines` | ✅ | ✅ | Sí |
| Vacunas | `GET /api/vaccines?petId=` | ✅ | ✅ | No |
| Vacunas | `PUT /api/vaccines/{vaccineId}` | ✅ | ✅ | Sí |
| Vacunas | `GET /api/vaccines/{vaccineId}/due` | ✅ | ✅ | No |
| Tratamientos | `POST /api/treatments` | ✅ | ✅ | Sí |
| Tratamientos | `GET /api/treatments/{treatmentId}` | ✅ | ✅ | No |
| Tratamientos | `PUT /api/treatments/{treatmentId}` | ✅ | ✅ | Sí |
| Tratamientos | `GET /api/treatments/{treatmentId}/is-active` | ✅ | ✅ | No |
| Tratamientos | `POST /api/treatments/{treatmentId}/add-medication` | ✅ | ✅ | Sí |
| Medicación | `GET /api/medications/{medicationId}` | ✅ | ✅ | No |
| Medicación | `PUT /api/medications/{medicationId}` | ✅ | ✅ | Sí |
| Cirugías | `POST /api/surgery` | ✅ | ✅ | Sí |
| Cirugías | `GET /api/surgery?visitId=` o `?petId=` | ✅ | ✅ | No |
| Cirugías | `GET /api/surgery/pet/{petId}` | ✅ | ✅ | No |
| Cirugías | `GET /api/surgery/visit/{visitId}` | ✅ | ✅ | No |
| Cirugías | `GET /api/surgery/{surgeryId}` | ✅ | ✅ | No |
| Cirugías | `PUT /api/surgery/{surgeryId}` | ✅ | ✅ | Sí |
| Cirugías | `PATCH /api/surgery/{surgeryId}` | ✅ | ✅ | Sí |
| Cirugías | `DELETE /api/surgery/{surgeryId}` | Solo quien la creó | Solo quien la creó | No |
| Laboratorio | `POST /api/lab` | ✅ | ✅ | Sí |
| Laboratorio | `GET /api/lab?visit_id=` | ✅ | ✅ | No |
| Laboratorio | `PATCH /api/lab?visit_id=` | ✅ | ✅ | Sí |
| Documentos | `POST /api/documents` | ❌ | ✅ | form-data |
| Documentos | `GET /api/documents?petId=` | ❌ | ✅ | No |
| Documentos | `GET /api/documents/{documentId}` | ❌ | ✅ | No |
| Documentos | `DELETE /api/documents/{documentId}` | ❌ | Solo quien lo subió | No |
| Resumen | `GET /api/pets/{petId}/clinical-summary` | ✅ | ✅ | No |
| Cron | `GET\|POST /api/cron/visit-reminders?petId=` | Clave interna | Clave interna | No |
| Cron | `GET\|POST /api/cron/vaccine-reminders?petId=` | Clave interna | Clave interna | No |

---

## 3. Visitas

### `POST /api/visits`

```json
{
  "petId": "uuid",                          // * dueño y veterinaria
  "reason": "Control de rutina",            // * dueño y veterinaria
  "date": "2026-10-28",                     // dueño y veterinaria
  "veterinarian": "Dra. Sara Ruiz",         // dueño y veterinaria
  "diagnosis": "Sin novedades",             // dueño y veterinaria
  "notes": "…",                             // dueño y veterinaria
  "weight": 12.4,                           // dueño y veterinaria
  "temperature": 38.6,                      // dueño y veterinaria
  "appointmentId": "uuid",                  // solo veterinaria
  "heartRate": 96,                          // solo veterinaria
  "respiratoryRate": 22,                    // solo veterinaria
  "mucousMembranes": "ROSADAS",             // solo veterinaria
  "bodyConditionScore": 5,                  // solo veterinaria
  "anamnesis": "…",                         // solo veterinaria
  "physicalExam": "…",                      // solo veterinaria
  "plan": "…"                               // solo veterinaria
}
```

`mucousMembranes`: `ROSADAS`, `PALIDAS`, `ICTERICAS`, `CIANOTICAS`, `HIPEREMICAS`.
`bodyConditionScore`: entero de 1 a 9. `heartRate`: 1 a 400. `respiratoryRate`: 1 a 200. `weight`: mayor a 0 y hasta 500. `temperature`: 30 a 45.

Respuesta `201`: `data` con la visita en camelCase.

### `PUT /api/visits/{visitId}`

Parcial: solo cambian los campos enviados. Se requiere al menos uno.

```json
{
  "diagnosis": "Parvovirus", "notes": "…", "weight": 12.5,            // dueño y veterinaria
  "temperature": 38.4, "veterinarian": "…",                           // dueño y veterinaria
  "heartRate": 90, "respiratoryRate": 20, "mucousMembranes": "PALIDAS",
  "bodyConditionScore": 4, "anamnesis": "…", "physicalExam": "…", "plan": "…"   // solo veterinaria
}
```

El dueño solo edita visitas que él creó. Si la creó una clínica, recibe 403 `TENANT_MISMATCH`. Enviar `diagnosis` publica `VISIT_COMPLETED`.

### Sin body

- `GET /api/visits/{visitId}`
- `GET /api/visits/pet/{petId}`
- `GET /api/visits/{visitId}/treatment`
- `GET /api/visits/date-range?startDate=2026-01-01&endDate=2026-12-31` (solo veterinaria)
- `GET /api/visits/veterinary/{vetId}?from=2026-01-01&to=2026-12-31` (solo su propia clínica)

---

## 4. Peso

Dueño y veterinaria usan **el mismo body**. La autoría (`source`, quién lo registró) la pone el servidor.

### `POST /api/weight`

```json
{ "petId": "uuid", "weight": 12.4, "unit": "kg", "date": "2026-10-28", "note": "En casa" }
```

`petId` y `weight` son obligatorios.

### `PATCH /api/weight?petId=uuid`

```json
{ "weight": 12.7, "unit": "kg", "note": "Corrección" }
```

Corrige el último peso y queda en auditoría con antes y después.

### Sin body

- `GET /api/weight?petId=uuid`: historial completo.
- `GET /api/weight?petId=uuid&latest=true`: solo el último. Si la mascota no tiene pesos, responde 404.

---

## 5. Vacunas

### `POST /api/vaccines`

```json
{
  "petId": "uuid",                  // * dueño y veterinaria
  "name": "Antirrábica",            // * dueño y veterinaria
  "applicationDate": "2026-10-28",  // * dueño y veterinaria
  "lotNumber": "L-2026-88",         // dueño y veterinaria
  "nextDoseDate": "2027-10-28",     // dueño y veterinaria
  "veterinarian": "Dra. Sara Ruiz", // dueño y veterinaria
  "notes": "…",                     // dueño y veterinaria
  "manufacturer": "Zoetis",         // solo veterinaria
  "replacesVaccineId": "uuid"       // solo veterinaria: dosis anterior de la misma mascota
}
```

Si el dueño no tiene cuenta y la mascota no tiene contacto, responde `409 OWNER_WITHOUT_CONTACT`. Si no se puede resolver el dueño, responde `503`.

### `PUT /api/vaccines/{vaccineId}`

```json
{
  "name": "Antirrábica refuerzo",   // dueño y veterinaria
  "lotNumber": "L-2026-99",         // dueño y veterinaria
  "applicationDate": "2026-10-28",  // dueño y veterinaria
  "nextDoseDate": "2027-10-28",     // dueño y veterinaria
  "veterinarian": "…",              // dueño y veterinaria
  "notes": "…",                     // dueño y veterinaria
  "status": "…",                    // dueño y veterinaria
  "manufacturer": "Zoetis"          // solo veterinaria
}
```

### Sin body

- `GET /api/vaccines?petId=uuid`: el carnet. Cada dosis trae `displayStatus`: `VIGENTE`, `POR_VENCER`, `VENCIDA`, `ANTERIOR` o `SIN_PROXIMA_DOSIS`.
- `GET /api/vaccines/{vaccineId}/due`

---

## 6. Tratamientos y medicación

### `POST /api/treatments`

```json
{
  "visitId": "uuid",            // * dueño y veterinaria
  "description": "Dermatitis",  // * dueño y veterinaria
  "startDate": "2026-09-28",    // * dueño y veterinaria
  "endDate": "2026-10-26",      // dueño y veterinaria
  "notes": "…",                 // dueño y veterinaria
  "protocol": "…",              // dueño y veterinaria
  "status": "ACTIVO",           // solo veterinaria: ACTIVO | FINALIZADO | SUSPENDIDO
  "instructions": "…"           // solo veterinaria
}
```

La mascota sale de la visita. No se envía `petId`.

### `PUT /api/treatments/{treatmentId}`

```json
{
  "startDate": "2026-09-28", "endDate": "2026-10-26", "notes": "…",                       // dueño y veterinaria
  "status": "SUSPENDIDO", "instructions": "…", "suspensionReason": "Reacción cutánea"     // solo veterinaria
}
```

### `POST /api/treatments/{treatmentId}/add-medication`

```json
{
  "name": "Champú de clorhexidina",   // * dueño y veterinaria
  "dosage": "Todo el cuerpo, 10 min", // * dueño y veterinaria
  "frequency": "2 veces por semana",  // * dueño y veterinaria
  "duration": "4 semanas",            // * dueño y veterinaria
  "startDate": "2026-09-28",          // solo veterinaria
  "endDate": "2026-10-26",            // solo veterinaria
  "status": "ACTIVO",                 // solo veterinaria: ACTIVO | TERMINADO | REACCION
  "reactionNote": "…"                 // solo veterinaria
}
```

### `PUT /api/medications/{medicationId}`

```json
{
  "dosage": "500 mg", "frequency": "cada 8 h",                                    // dueño y veterinaria
  "status": "REACCION", "startDate": "…", "endDate": "…", "reactionNote": "…"    // solo veterinaria
}
```

Al menos un campo es obligatorio.

### Sin body

- `GET /api/treatments/{treatmentId}`
- `GET /api/treatments/{treatmentId}/is-active`
- `GET /api/medications/{medicationId}`

---

## 7. Cirugías

### `POST /api/surgery`

```json
{
  "petId": "uuid",                          // * dueño y veterinaria
  "veterinaryVisitId": "uuid",              // * dueño y veterinaria
  "title": "Orquiectomía",                  // * dueño y veterinaria
  "description": "…",                       // * dueño y veterinaria
  "surgeryDate": "2026-11-03",              // * dueño y veterinaria
  "durationMinutes": 45,                    // * dueño y veterinaria
  "anesthesiaUsed": "Propofol e isoflurano",// dueño y veterinaria
  "postOpInstructions": "…",                // dueño y veterinaria
  "veterinarian": "Dr. Luis Pérez",         // dueño y veterinaria
  "startsAt": "2026-11-03T08:30:00-05:00",  // solo veterinaria
  "asaRisk": 1                              // solo veterinaria: entero de 1 a 5
}
```

### `PUT /api/surgery/{surgeryId}`

```json
{
  "title": "…", "description": "…", "surgeryDate": "2026-11-03", "durationMinutes": 45,
  "anesthesiaUsed": "…", "complications": "…", "postOpInstructions": "…",
  "outcome": "…", "status": "completed", "nextCheckupDate": "2026-11-10",          // dueño y veterinaria
  "startsAt": "2026-11-03T08:30:00-05:00", "asaRisk": 2                              // solo veterinaria
}
```

Si `status` es `completed`, se publica `SURGERY_COMPLETED`.

### `PATCH /api/surgery/{surgeryId}`

```json
{ "status": "completed", "outcome": "Sin complicaciones" }
```

`status` es obligatorio.

### `DELETE /api/surgery/{surgeryId}`

Sin body. Solo quien la creó puede borrarla. Otra persona recibe 403 `TENANT_MISMATCH`.

### Sin body

- `GET /api/surgery?visitId=uuid` o `?petId=uuid`
- `GET /api/surgery/pet/{petId}`
- `GET /api/surgery/visit/{visitId}`
- `GET /api/surgery/{surgeryId}`

---

## 8. Laboratorio

### `POST /api/lab`

```json
{
  "name": "Química sanguínea",          // * dueño y veterinaria
  "visit_id": "uuid",                   // * dueño y veterinaria
  "date": "2026-09-05",                 // dueño y veterinaria
  "result": "…",                        // dueño y veterinaria
  "normal_range": "…",                  // dueño y veterinaria
  "notes": "…",                         // dueño y veterinaria
  "veterinarian": "Dr. Luis Pérez",     // dueño y veterinaria
  "laboratoryName": "VetLab Cartagena", // solo veterinaria
  "status": "FUERA_DE_RANGO",           // solo veterinaria: NORMAL | FUERA_DE_RANGO | ANORMAL | NEGATIVO | POSITIVO
  "interpretation": "…",                // solo veterinaria
  "results": [                          // solo veterinaria
    { "parameter": "ALT", "result": "112", "unit": "U/L", "reference": "10 – 100", "flag": "ALTO" }
  ]
}
```

`flag` de cada parámetro: `NORMAL`, `ALTO`, `BAJO`, `NEGATIVO`, `POSITIVO`, `ANORMAL`. `parameter` y `result` son obligatorios dentro de cada parámetro.

### `PATCH /api/lab?visit_id=uuid`

Actualiza el examen más reciente de la visita (el primero de `GET /api/lab?visit_id=`). Si la visita tiene varios exámenes, el resultado se aplica solo a ese.

```json
{
  "result": "Leucocitos 4000",          // * dueño y veterinaria
  "status": "NORMAL",                   // solo veterinaria
  "laboratoryName": "…",                // solo veterinaria
  "interpretation": "…",                // solo veterinaria
  "results": [                          // solo veterinaria: reemplaza todos los parámetros
    { "parameter": "…", "result": "…", "flag": "NORMAL" }
  ]
}
```

### Sin body

- `GET /api/lab?visit_id=uuid`
- `GET /api/lab?visit_id=uuid&isNormal=true`

---

## 9. Documentos (solo veterinaria)

El dueño recibe 403 `CLINIC_TOKEN_REQUIRED` en todos estos endpoints.

### `POST /api/documents` (multipart/form-data)

| Campo | Tipo | Obligatorio |
|---|---|:-:|
| `file` | PDF, JPG o PNG, máx. 10 MB | Sí |
| `petId` | uuid | Sí |
| `documentType` | `LABORATORIO`, `IMAGEN`, `CONSENTIMIENTO`, `FORMULA`, `CERTIFICADO`, `VACUNAS`, `PROTOCOLO`, `OTRO` | Sí |
| `title` | texto, máx. 200 caracteres | Sí |
| `visitId` | uuid | No |
| `surgeryId` | uuid | No |
| `labTestId` | uuid | No |

Respuesta `201`: metadatos del documento. La ruta interna del archivo no se devuelve.

### Sin body

- `GET /api/documents?petId=uuid`: lista de documentos de la mascota.
- `GET /api/documents/{documentId}`: metadatos y `url` firmada válida 10 minutos.
- `DELETE /api/documents/{documentId}`: solo quien lo subió.

---

## 10. Resumen clínico

Dueño y veterinaria. Sin body.

- `GET /api/pets/{petId}/clinical-summary`

`allergies` es `null` porque las alergias todavía no tienen fuente en Medical (decisión D9). Eso significa "no disponible", no "sin alergias".

---

## 11. Cron (clave interna)

No es un usuario. Requiere la cabecera `x-internal-api-key`. Sin body.

| Método | Ruta |
|---|---|
| GET / POST | `/api/cron/visit-reminders?petId=uuid` |
| GET / POST | `/api/cron/vaccine-reminders?petId=uuid` |

Si la mascota no tiene dueño con cuenta, el POST responde `409 OWNER_WITHOUT_ACCOUNT`.
