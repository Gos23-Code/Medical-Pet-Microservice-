# Cirugías: estados, outcome y endpoints

Referencia del comportamiento actual del código. Fuentes: `src/application/use-cases/surgery/update-surgery.use-case.ts` (reglas de transición), `src/domain/entities/pet-surgery.entity.ts` (enums) y `app/api/surgery/**` (rutas).

Los valores de `status` y `outcome` son **mayúsculas**. Enviar `completed` en minúsculas falla con `Cannot transition ...`.

## 1. Estados

| Estado | Es terminal | Descripción |
|---|---|---|
| `SCHEDULED` | No | Estado inicial al crear la cirugía (`POST`) |
| `IN_PROGRESS` | No | La cirugía está en curso |
| `COMPLICATED` | No | Hubo complicaciones durante la cirugía; aún no se cierra |
| `COMPLETED` | Sí | Cirugía cerrada. Requiere `outcome` |
| `CANCELLED` | Sí | Cirugía cancelada |

## 2. Transiciones permitidas

| Desde | Hacia | ¿Requiere `outcome`? | Notas |
|---|---|---|---|
| `SCHEDULED` | `IN_PROGRESS` | No | Solo desde `SCHEDULED` se puede iniciar |
| `SCHEDULED` | `CANCELLED` | No | |
| `IN_PROGRESS` | `COMPLETED` | **Sí** | Sin `outcome` responde error |
| `IN_PROGRESS` | `COMPLICATED` | No | |
| `IN_PROGRESS` | `CANCELLED` | No | |
| `COMPLICATED` | `COMPLETED` | **Sí** | No se puede cancelar desde `COMPLICATED` |
| `COMPLETED` | — | — | Terminal: no admite más cambios de estado |
| `CANCELLED` | — | — | Terminal: no admite más cambios de estado |

Cualquier otra transición responde `Cannot transition from X to Y`.

## 3. Outcome

Valores válidos del enum del dominio:

| Valor | Cuándo usarlo |
|---|---|
| `SUCCESSFUL` | Cirugía exitosa sin complicaciones |
| `COMPLICATIONS` | Cirugía terminada con complicaciones |
| `DECEASED` | La mascota murió durante o después de la cirugía |

Reglas actuales:

| Caso | Comportamiento |
|---|---|
| Pasar a `COMPLETED` sin `outcome` y sin outcome previo | Error: `Outcome is required when completing a surgery` |
| Pasar a `COMPLETED` con `outcome` | Se guarda el valor |
| `outcome` con un estado distinto de `COMPLETED` | Se guarda sin validar (**no recomendado**) |
| `outcome` sin `status` (solo en `PUT`) | Se guarda sin validar (**provoca el texto libre que rompió el `GET`**) |
| `outcome` con texto libre (ej. `"Sin complicaciones"`) | Se guarda, pero al leer la cirugía falla con `Invalid outcome value` |

## 4. Endpoints y su efecto sobre estado y outcome

| Método y ruta | Puede cambiar estado | Puede cambiar outcome | Validación de transición | Quién puede |
|---|---|---|---|---|
| `POST /api/surgery` | No (siempre crea en `SCHEDULED`) | No (no lee `outcome` del body) | — | Clínica con `CLINICAL_WRITE` |
| `PATCH /api/surgery/[id]` | Sí, obligatorio `status` | Sí, opcional | Sí, siempre | Clínica con `CLINICAL_WRITE` |
| `PUT /api/surgery/[id]` | Sí, opcional | Sí, opcional | Solo si viene `status` | Clínica con `CLINICAL_WRITE` |
| `GET /api/surgery/[id]` | No | No | — | Dueño o clínica con lectura |
| `DELETE /api/surgery/[id]` | No | No | — | Solo la clínica que creó la cirugía |

## 5. Bodies de ejemplo

| Acción | Endpoint | Body |
|---|---|---|
| Crear | `POST /api/surgery` | Campos base (sin `status` ni `outcome`) |
| Iniciar | `PATCH /api/surgery/[id]` | `{ "status": "IN_PROGRESS" }` |
| Cancelar | `PATCH /api/surgery/[id]` | `{ "status": "CANCELLED" }` |
| Marcar complicación | `PATCH /api/surgery/[id]` | `{ "status": "COMPLICATED" }` |
| Completar sin complicaciones | `PATCH /api/surgery/[id]` | `{ "status": "COMPLETED", "outcome": "SUCCESSFUL" }` |
| Completar tras complicación | `PATCH /api/surgery/[id]` | `{ "status": "COMPLETED", "outcome": "COMPLICATIONS" }` |
| Completar con fallecimiento | `PATCH /api/surgery/[id]` | `{ "status": "COMPLETED", "outcome": "DECEASED" }` |
| Editar campos sin cambiar estado | `PUT /api/surgery/[id]` | `{ "title": "...", "durationMinutes": 90 }` |

## 6. Flujos completos

| Escenario | Secuencia de llamadas |
|---|---|
| Cirugía exitosa | `POST` → `PATCH` `IN_PROGRESS` → `PATCH` `COMPLETED` + `SUCCESSFUL` |
| Con complicaciones | `POST` → `PATCH` `IN_PROGRESS` → `PATCH` `COMPLICATED` → `PATCH` `COMPLETED` + `COMPLICATIONS` |
| Fallecimiento | `POST` → `PATCH` `IN_PROGRESS` → `PATCH` `COMPLETED` + `DECEASED` |
| Cancelada antes de empezar | `POST` → `PATCH` `CANCELLED` |
| Cancelada durante la cirugía | `POST` → `PATCH` `IN_PROGRESS` → `PATCH` `CANCELLED` |

## 7. Problemas conocidos

| # | Problema | Efecto | Solución propuesta |
|---|---|---|---|
| 1 | `status` en minúsculas (`completed`) | `Cannot transition ...` | Usar mayúsculas en Postman y en clientes |
| 2 | Errores de dominio se responden como 500 `INTERNAL_ERROR` | Un error de validación parece fallo del servidor | Responder 400 para errores de validación |
| 3 | `PUT` acepta `outcome` sin `status` sin validar | Se guarda texto libre que luego rompe el `GET` y el `DELETE` | Validar `outcome` contra el enum en cualquier escritura |
| 4 | `outcome` se acepta con cualquier estado | Datos inconsistentes (ej. `IN_PROGRESS` con `DECEASED`) | Aceptar `outcome` solo con `COMPLETED` |
| 5 | Filas existentes con texto libre en `outcome` | `GET` y `DELETE` fallan para esas cirugías | Limpiar con SQL (ver abajo) |

Limpieza de filas con texto libre en Supabase:

```sql
update public.pet_surgeries
set outcome = null
where outcome is not null
  and outcome not in ('SUCCESSFUL', 'COMPLICATIONS', 'DECEASED');
```

## 8. Decisión pendiente

¿`outcome` es un enum cerrado (`SUCCESSFUL`, `COMPLICATIONS`, `DECEASED`) o texto libre? La tabla anterior asume el enum, que es lo que define el dominio hoy. Si se elige texto libre, cambian las secciones 3 y 7, y los filtros de `get-surgery.use-case.ts`.
