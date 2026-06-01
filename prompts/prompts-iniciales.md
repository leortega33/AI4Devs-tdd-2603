# Prompts iniciales — Suite de tests unitarios para inserción de candidatos

## Contexto del proyecto

Proyecto: **AI4Devs-tdd-2603** — LTI (Talent Tracking System)  
Stack: Node.js + Express + TypeScript + Prisma + PostgreSQL  
Framework de tests: Jest + ts-jest  

---

## Prompt utilizado

```
Eres un experto en testing con Jest y JavaScript/TypeScript.

Tu tarea es crear una suite de tests unitarios para la funcionalidad de inserción
de candidatos en la base de datos.

Objetivos

La suite debe cubrir las dos áreas principales del flujo:

1. Recepción y validación de los datos provenientes del formulario.
2. Persistencia (guardado) de los datos en la base de datos.

Requisitos mínimos
- Debe existir al menos un test representativo para cada una de las dos áreas mencionadas.
- Los tests deben verificar tanto los casos exitosos como los posibles errores cuando sea relevante.
- Si alguna prueba requiere interacción con la base de datos, no debe utilizar una base
  de datos real. Utiliza mocks o stubs para aislar la lógica y evitar modificar datos reales.
- Verifica que las funciones dependientes sean llamadas con los parámetros correctos.

Buenas prácticas
- Utiliza bloques describe e it con nombres claros y descriptivos.
- Mantén los tests independientes entre sí.
- Aplica el patrón Arrange / Act / Assert (AAA).
- Utiliza mocks únicamente cuando sean necesarios para aislar dependencias externas.
- Evita detalles de implementación innecesarios y enfócate en el comportamiento observable.
- Si se utilizan pruebas de componentes con Testing Library, emplea consultas semánticas
  como getByRole, findByRole o queryByRole en lugar de selectores basados en clases o IDs.

Resultado esperado

Genera el código completo de los tests, incluyendo:
- Imports necesarios.
- Configuración de mocks.
- Casos de prueba.
- Explicación breve de qué valida cada test y por qué es importante.

Antes de escribir los tests, analiza el código proporcionado para identificar:
- Dependencias externas.
- Validaciones de entrada.
- Puntos de acceso a la base de datos.
- Casos borde relevantes que merezcan cobertura.

Los tests en un fichero tests-iniciales.test.ts en la carpeta backend/src/tests.
Un fichero prompts-iniciales.md en la carpeta prompts.
```

---

## Análisis previo realizado

### Archivos analizados

| Archivo | Rol |
|---|---|
| `backend/src/application/validator.ts` | Validación pura de datos del formulario |
| `backend/src/application/services/candidateService.ts` | Orquestador: valida + persiste |
| `backend/src/domain/models/Candidate.ts` | Modelo con acceso directo a Prisma |
| `backend/src/domain/models/Education.ts` | Modelo con acceso directo a Prisma |
| `backend/src/domain/models/WorkExperience.ts` | Modelo con acceso directo a Prisma |
| `backend/src/domain/models/Resume.ts` | Modelo con acceso directo a Prisma |

### Dependencias externas identificadas

- **PrismaClient**: instanciado directamente en cada modelo de dominio (no inyectado).  
  → Estrategia: mockear las clases completas con `jest.mock()`.

### Validaciones identificadas en `validator.ts`

| Campo | Regla |
|---|---|
| `firstName` / `lastName` | Obligatorio, 2–100 chars, solo letras (regex incluye tildes y ñ) |
| `email` | Obligatorio, formato email (regex) |
| `phone` | Opcional, pero si existe: inicio con 6/7/9, exactamente 9 dígitos |
| `address` | Opcional, máximo 100 chars |
| `education.institution` | Obligatorio, máximo 100 chars |
| `education.title` | Obligatorio, máximo 100 chars |
| `education.startDate` | Obligatorio, formato `YYYY-MM-DD` |
| `education.endDate` | Opcional, formato `YYYY-MM-DD` si está presente |
| `experience.company` | Obligatorio, máximo 100 chars |
| `experience.position` | Obligatorio, máximo 100 chars |
| `experience.description` | Opcional, máximo 200 chars |
| `experience.startDate` | Obligatorio, formato `YYYY-MM-DD` |
| `cv.filePath` | Obligatorio si `cv` está presente |
| `cv.fileType` | Obligatorio si `cv` está presente |

### Puntos de acceso a BD

- `Candidate.save()` → `prisma.candidate.create()` o `prisma.candidate.update()`
- `Education.save()` → `prisma.education.create()` o `prisma.education.update()`
- `WorkExperience.save()` → `prisma.workExperience.create()` o `prisma.workExperience.update()`
- `Resume.save()` → `prisma.resume.create()`

### Casos borde relevantes

| Caso | Motivo |
|---|---|
| Candidato con `id` (modo edición) | El validador omite todas las comprobaciones cuando hay `id` |
| Error Prisma `P2002` | Único constraint en `email`; el servicio lo traduce a mensaje de negocio |
| Error genérico de BD | El servicio debe relanzarlo sin modificar |
| Validación falla → no se llama a `save()` | Garantiza que datos inválidos nunca llegan a Prisma |

---

## Estructura de la suite generada

```
backend/src/tests/tests-iniciales.test.ts
│
├── Área 1: Validación de datos del formulario (validateCandidateData)
│   ├── Casos exitosos (5 tests)
│   │   ├── Datos mínimos válidos
│   │   ├── Modo edición (id presente, omite validación)
│   │   ├── Con educación válida
│   │   ├── Con experiencia laboral válida
│   │   └── Con CV válido
│   ├── Errores en campos personales (8 tests)
│   │   ├── firstName vacío
│   │   ├── firstName de 1 carácter (límite inferior)
│   │   ├── firstName > 100 caracteres (límite superior)
│   │   ├── firstName con números
│   │   ├── Email sin @
│   │   ├── Teléfono que no empieza por 6/7/9
│   │   ├── Teléfono con menos de 9 dígitos
│   │   └── Dirección > 100 caracteres
│   ├── Errores en educación (3 tests)
│   │   ├── Sin institution
│   │   ├── Sin startDate
│   │   └── startDate con formato incorrecto
│   ├── Errores en experiencia laboral (3 tests)
│   │   ├── Sin company
│   │   ├── Sin position
│   │   └── description > 200 caracteres
│   └── Errores en CV (2 tests)
│       ├── Sin filePath
│       └── Sin fileType
│
└── Área 2: Persistencia en base de datos (addCandidate)
    ├── Casos exitosos (4 tests)
    │   ├── Candidato válido → instancia Candidate y llama save()
    │   ├── Con educación → guarda Education con candidateId correcto
    │   ├── Con experiencia → guarda WorkExperience con candidateId correcto
    │   └── Con CV → guarda Resume con candidateId correcto
    └── Casos de error (3 tests)
        ├── Datos inválidos → lanza error antes de persistir (save no se llama)
        ├── Email duplicado (P2002) → mensaje de negocio
        └── Error genérico de BD → relanza el error original
```

**Total: 21 tests**

---

## Decisiones técnicas

### ¿Por qué mockear los modelos completos y no solo Prisma?

Los modelos (`Candidate`, `Education`, etc.) tienen `PrismaClient` instanciado a nivel de módulo (no inyectado). Mockear `@prisma/client` requeriría replicar toda la API del cliente. Mockear los modelos completos con `jest.mock()` es más limpio, más rápido y mantiene los tests enfocados en el comportamiento del servicio.

### ¿Por qué usar variables de instancia (`mockCandidateInstance`)?

El servicio asigna propiedades a las instancias después de crearlas (ej. `educationModel.candidateId = candidateId`). Guardar la instancia mock en una variable permite verificar esas asignaciones directamente en los assertions.

### ¿Por qué `beforeEach` con `jest.clearAllMocks()`?

Garantiza que cada test parte de un estado limpio. Sin esto, llamadas acumuladas de tests anteriores podrían generar falsos positivos o falsos negativos en las verificaciones de `toHaveBeenCalledTimes`.
