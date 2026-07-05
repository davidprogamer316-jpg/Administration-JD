# Tinting-JD ERP

**Versión:** 0.8.0 (MVP - Contabilidad quincenal + Trabajos + Facturación + Gastos fijos + PDFs térmicos + Responsive)
**Fecha:** Julio 2026
**Tipo:** Aplicación Web (ERP modular)
**Tecnología Backend:** Node.js / Express + TypeScript
**Tecnología Frontend:** React 19 + TypeScript + Tailwind CSS v4
**Base de Datos:** MongoDB Atlas

---

## 1. Descripción General

Sistema ERP web, de uso interno, orientado a llevar la gestión administrativa y financiera de una empresa de tinting automotriz. Cuenta con cuatro módulos principales:

1. **Contabilidad Quincenal** — registra ingresos (auto-calculados desde trabajos) y gastos por quincena (1-15 / 16-fin de mes), calcula automáticamente la utilidad y distribuye ganancias entre empleados y jefe según porcentajes configurables. Soporta **gastos fijos automáticos** (se dividen a la mitad por periodo).
2. **Trabajos de Carros** — registra trabajos por vehículo (fecha, VIN, descripción, pago, tipo de papel) con escáner VIN integrado, que alimentan automáticamente los ingresos de contabilidad. Cada trabajo almacena un snapshot de los porcentajes de empleados activos al momento de crearse.
3. **Facturación** — genera facturas/garantías (PDF estilo ticket POS 80mm, Courier, 9pt mínimo, todo negro) a partir de los trabajos registrados, permitiendo agrupar múltiples servicios en una misma factura.
4. **Reportes PDF de empleados** — genera PDFs estilo ticket térmico (mismo diseño que facturas) con el historial de pagos por empleado y mes, mostrando solo fecha + ganancia por trabajo.

El sistema está diseñado para crecer de forma modular (estilo Odoo), agregando en versiones futuras módulos como inventario, etc.

---

## 2. Alcance

- Aplicación web accesible desde navegador, con backend centralizado y base de datos MongoDB.
- Arquitectura pensada para múltiples módulos futuros (ERP).
- Multiusuario desde el diseño (jefe + empleados), aunque el control de acceso/roles detallado puede definirse en una iteración posterior.
- No se contempla en esta versión integración con pasarelas de pago ni facturación electrónica.

---

## 3. Stakeholders

- **Usuario principal:** Jefe / dueño de la empresa (administra empleados, porcentajes y visualiza reportes).
- **Usuarios secundarios:** Empleados (podrían tener acceso limitado de solo consulta en versiones futuras).

---

## 4. Requerimientos Funcionales

### 4.1 Gestión de Empleados

- El sistema debe permitir registrar múltiples empleados con los siguientes datos:
  - Nombre completo
  - Porcentaje de participación sobre el neto a repartir
  - Estado (activo / inactivo)
- El sistema debe permitir editar el porcentaje de un empleado y desactivar empleados sin eliminar su historial.
- El sistema debe validar que la suma de los porcentajes de todos los empleados activos **no supere el 100%** del neto a repartir (el remanente queda automáticamente para el jefe).
- El sistema debe mostrar en todo momento qué porcentaje le corresponde al jefe (100% - suma de porcentajes de empleados activos).
- **Los cambios en el porcentaje o estado de un empleado NO recalculan periodos abiertos existentes.** Cada `CarJob` almacena un snapshot de empleados activos con su % al crearse. El recálculo manual (botón "Recalcular" en detalle del periodo) usa esos snapshots.

### 4.2 Registro Quincenal de Contabilidad

- El sistema debe auto-calcular los ingresos de la quincena sumando todos los pagos (`payment`) de trabajos de carro (`CarJob`) en el rango de la quincena.
- El sistema permite crear un registro por quincena con:
  - Rango de fechas (día 1-15 o 16-fin de mes, auto-calculado con `Date.UTC` medianoche)
  - Gastos de la quincena, desglosados en **uno o más ítems de gasto**, cada uno con:
    - Descripción (ej. "gasolina", "repuestos", "almuerzos")
    - Monto
  - **Gastos fijos automáticos** (auto-calculados desde `FixedExpense`): se dividen en partes iguales por periodo (mitad del total mensual en cada quincena)
  - El sistema calcula automáticamente el **total de gastos** como suma de todos los ítems + gastos fijos.
- El sistema debe permitir agregar, editar y eliminar ítems de gasto dentro de una quincena abierta.
- El sistema debe impedir crear más de un registro de contabilidad para la misma quincena.
- El sistema auto-crea una quincena cuando se registra un `CarJob` y no existe quincena para esa fecha.
- Al editar una quincena, solo los gastos son modificables; las fechas y el ingreso son de solo lectura.
- Al editar, todos los valores derivados (DDDG, ganancia, neto, reparto) se recalculan automáticamente.

### 4.3 Cálculo Automático de Contabilidad

Por cada quincena registrada, el sistema debe calcular automáticamente, en este orden:

1. **D.D.D.G (Disponible Después De Gastos)**
   `DDDG = Ingresos - Gastos (ítems + gastos fijos)` (mínimo 0)

2. **Ganancia Empresa**
   `Ganancia Empresa = DDDG * 20%` (porcentaje **fijo** en el sistema, definido en configuración interna del backend)

3. **Neto a Repartir**
   `Neto a Repartir = DDDG - Ganancia Empresa`

4. **Reparto por Empleado**
   Para cada empleado activo (usando snapshot del trabajo):
   `Monto Empleado = Neto a Repartir * (% Empleado / 100)`

5. **Reparto del Jefe**
   `Monto Jefe = Neto a Repartir - Suma de Montos de todos los Empleados`

Todos estos valores deben recalcularse automáticamente cada vez que se modifique el ingreso, los ítems de gasto, los gastos fijos, o se ejecute un recálculo manual.

#### 4.3.1 Cierre Manual de Periodos

- Los periodos se cierran manualmente mediante `PATCH /api/accounting/{id}/close`.
- Un periodo cerrado **bloquea todas las mutaciones**: no se pueden editar gastos, crear/editar/eliminar trabajos, ni recalcular.
- Un periodo abierto permite editar gastos y recalcular manualmente; el ingreso siempre se recalcula desde `CarJob`.
- El sistema no forza cierre automático al cambiar de quincena.
- **Al eliminar un trabajo** en un periodo abierto, si el periodo queda con income=0, expenseItems vacío y fixedExpenses vacío, se elimina automáticamente.

#### 4.3.2 Gastos Fijos Automáticos

- Los gastos fijos se gestionan desde la página de Configuración (`/settings`).
- Cada gasto fijo tiene: nombre, monto mensual.
- Al recalcular un periodo, se toma el monto mensual del gasto fijo y se divide en 2 (mitad para cada quincena del mes).
- Los gastos fijos se almacenan en `period.fixedExpenses[]` como subdocumentos (name, amount).
- Se muestran como sección de solo lectura en la página de detalle del periodo.

### 4.4 Módulo de Trabajos de Carros

- El sistema debe permitir registrar trabajos por vehículo con:
  - Fecha del trabajo
  - VIN (número de identificación vehicular) — escaneable con cámara
  - Descripción del trabajo realizado
  - Pago (monto)
  - **Tipo de papel** (multi-select): "Premium Film", "Ceramic Film", "Ultra Ceramic Film", "DOES NOT APPLY"
- El sistema debe mostrar un listado con filtros por rango de fechas y búsqueda por VIN (búsqueda parcial, case-insensitive).
- El sistema debe permitir editar y eliminar trabajos.
- Al crear/editar/eliminar un trabajo, se recalcula automáticamente el ingreso y todos los valores derivados del periodo correspondiente.
- Si no existe una quincena para la fecha del trabajo, se crea automáticamente.
- Los trabajos de la quincena se muestran en el detalle de la quincena de contabilidad (sección colapsable).
- Al hacer clic en cualquier celda de una fila de trabajo se abre un modal con los detalles completos.
- Al hacer clic en el nombre del periodo en la tabla de contabilidad, se navega a una página de detalle (`/accounting/[id]`) que muestra: tarjetas resumen, trabajos del periodo (colapsable), editor de gastos, gastos fijos (solo lectura), y ganancias empleados por trabajo (colapsable con acordeón por empleado).
- **Botón "Recalcular"** en la página de detalle para forzar recálculo manual del periodo.
- **Snapshot de porcentajes:** cada `CarJob` almacena `employeeShares[]` con los empleados activos y sus porcentajes al momento de creación. El recálculo usa estos snapshots, no los datos actuales del empleado.
- **Escáner VIN:** foto-based. Abre la cámara trasera via `getUserMedia`, el usuario ve el video en vivo, presiona "Tomar foto", captura un frame y lo decodifica con `@zxing/library`. No hay escaneo continuo.
- **Submit button deshabilitado** mientras la petición está en curso para evitar trabajos duplicados.

### 4.5 Resumen y Dashboard

- El sistema debe ofrecer un dashboard general con:
  - Ingresos y gastos totales del período seleccionado
  - Ganancia acumulada de la empresa
  - Total repartido a empleados (general y por empleado individual)
  - Total acumulado del jefe
  - Gráfico de evolución semanal de ingresos vs. gastos vs. ganancia
  - **Filtro por rango de fechas** — el dashboard carga por defecto el mes actual. El filtro solo se activa al hacer clic en "Filtrar" (no al cambiar las fechas).
  - `useEffect` **NO** depende de `startDate`/`endDate` para evitar recargas prematuras.

### 4.6 Vista de Contabilidad Quincenal

- El sistema debe mostrar una tabla/listado con todos los periodos registrados, incluyendo las columnas:
  - Periodo (número 1 o 2 + rango de fechas) — enlace a página de detalle
  - Ingresos
  - Gastos
  - D.D.D.G
  - Ganancia Empresa
  - Neto a Repartir
  - Monto por cada Empleado (columna dinámica por empleado activo)
  - Monto Jefe
- **Columnas responsive:** DDDG y Ganancia ocultas en `<sm`, columnas de empleados y Jefe ocultas en `<lg`.
- El sistema debe permitir filtrar por rango de fechas.
- El sistema debe mostrar totales acumulados para el rango filtrado.

### 4.7 Exportación a Excel

- El sistema debe permitir exportar la contabilidad quincenal en formato Excel (`.xlsx`) con:
  - Una fila por periodo con todas las columnas
  - Fila de totales al final
  - Encabezados con color de marca, filas alternadas, formato moneda
  - Segunda hoja "Ganancias empleados" con desglose por empleado
- Exportación de trabajos de carro a Excel con filtro por fechas y VIN.
- Formato de moneda: `$#,##0.00`.

### 4.8 Autenticación y Seguridad

- **Login obligatorio** con JWT + bcrypt.
- **Sin registro público** — la ruta `/register` fue eliminada. Solo cuentas existentes pueden iniciar sesión.
- **Bloqueo por fuerza bruta:** 5 intentos fallidos bloquean la cuenta por 30 minutos. HTTP 423 LOCKED.
- **Middleware acepta `token` query param** como fallback para abrir PDFs en nueva pestaña (no envía Authorization header).
- **CORS:** soporta múltiples orígenes (variable `CORS_ORIGINS` separada por comas) y Vercel preview subdomains via `CORS_ALLOW_VERCEL_PREVIEWS`.
- Todas las rutas protegidas excepto `/auth/login`.
- Contraseñas con hash bcrypt, nunca en texto plano.

### 4.9 Módulo de Facturación

- Generación de facturas/garantías desde uno o varios `CarJob`.
- Auto-numeración consecutiva (`FAC-0001`, `FAC-0002`, ...).
- PDF estilo **ticket POS 80mm** (227pt ancho, luego ajustado a 204pt):
  - Fuente Courier / CourierPrime (si existe la fuente TTF empaquetada)
  - Todo **Helvetica-Bold** (Courier), 9pt mínimo
  - **Todo negro** (#000), sin colores, sin grises
  - Logo opcional (centrado, 200px, escala de grises via `sharp`)
  - **Sin QR** (removido)
  - Teléfono: 786 793 4440
  - Tabla de servicios: solo fecha + monto por ítem (sin descripción ni especificaciones de papel)
  - Total grande y prominente
  - Texto de garantía en inglés, simplificado
  - Footer con fecha de generación
- **Vista inline:** botón "Ver factura" abre PDF en nueva pestaña con token en URL (`?token=...`).
- **Filtro por nombre de cliente** (búsqueda case-insensitive) en el listado de facturas.
- Permite eliminar facturas.

### 4.10 Reportes PDF de Empleados

- Desde la página de empleados, se puede descargar un PDF con el historial de pagos de un empleado en un mes específico.
- **Formato ticket térmico 80mm** (204pt ancho, mismo diseño que las facturas):
  - Fuente Courier / CourierPrime
  - Todo #000, sin logo, sin QR, sin tagline, sin teléfono
  - Encabezado: "Windows Tinting" + "JD" (dos líneas)
  - "Historial de pagos — {nombre empleado}"
  - Mes seleccionado
  - Por periodo quincenal: tabla con FECHA | GANANCIA
  - La ganancia se calcula como `job.payment / totalIncome * employeeShare.amount`
  - Total por periodo y total general del mes
  - Footer: "Generado por Tinting-JD"
- **Vista inline y descarga:** icono de ojo (ver) + icono de descarga. El PDF inline abre en nueva pestaña con token en URL.
- Selector de mes/año en modal antes de generar.

### 4.11 Módulos Futuros (fuera de alcance, solo referencia arquitectónica)

- Módulos ERP a futuro: inventario, clientes/proveedores, roles y permisos avanzados.
- El diseño de la arquitectura (capas, dominios separados por módulo) debe facilitar agregar estos módulos sin reescribir los existentes.

---

## 5. Requerimientos No Funcionales

### 5.1 Tecnología

- **Backend:** Node.js con Express + TypeScript, ESM (`module: "esnext"`, `"type": "module"`).
- **Persistencia:** Mongoose (ODM para MongoDB).
- **Base de datos:** MongoDB Atlas (conexión directa a shards, no SRV — para evitar fallos de resolución DNS).
- **Frontend:** Next.js 16.2.9 + React 19 + TypeScript + Tailwind CSS v4.
- **Autenticación:** JWT + bcrypt + middleware Express.
- **Gestor de dependencias:** npm (monorepo con carpetas backend/ y frontend/).

### 5.1.1 Despliegue

- **Backend:** Render (Node.js service, puerto interno 4000). `.npmrc` con `include=dev` para instalar devDependencies. tsconfig con `"types": ["node"]`.
- **Frontend:** Vercel.
- **CORS:** configurado para aceptar orígenes en `CORS_ORIGIN`/`CORS_ORIGINS` (coma-separados) y Vercel preview subdomains.
- **Variables de entorno:** `MONGODB_URI` (shards directos), `JWT_SECRET`, `NEXT_PUBLIC_API_URL`, etc.

### 5.2 Arquitectura

- Arquitectura modular: cada dominio funcional en su propio módulo dentro del backend.
- Backend en capas: rutas → controladores → servicios → modelos.
- Frontend organizado por features (`features/accounting/`, `features/carJobs/`, etc.), componentes reutilizables.
- Separación estricta de responsabilidades (SRP).

### 5.3 Persistencia de Datos

Colecciones de MongoDB:
- `employees`
- `accounting_periods` (con subdocumentos embebidos: `expenseItems`, `employeeDistribution`, `fixedExpenses`)
- `carjobs`
- `invoices`
- `fixedexpenses`
- `admin_users`

### 5.4 Usabilidad

- Interfaz en español, estilo ERP (sidebar ODOO-style, tablas, dashboards).
- Valores monetarios con formato colombiano (miles y decimales).
- Fechas en formato `DD/MM/YYYY`.
- **Responsive:** sidebar con hamburger toggle, `overflow-x-auto` para tablas, columnas ocultas en pantallas pequeñas.
- Confirmación antes de eliminar/cerrar registros críticos.
- **DateInput** componente custom para iOS (placeholder con `<span>` superpuesto porque Safari no muestra placeholder nativo en `<input type="date">`).

### 5.5 Rendimiento

- Consultas y dashboard deben responder en menos de 2 segundos con historial de varios años.

### 5.6 Seguridad

- Autenticación JWT obligatoria en todas las rutas excepto `/auth/login`.
- Middleware acepta `token` query param para PDFs en nueva pestaña.
- Contraseñas con hash bcrypt.
- **Bloqueo por fuerza bruta:** 5 intentos / 30 min, HTTP 423.
- Sin registro público (ruta `/register` eliminada).
- HTTPS en producción (Render + Vercel).
- Validación de datos de entrada en todos los endpoints.

### 5.7 Mantenibilidad

- TypeScript estricto en backend y frontend.
- Módulos separados por dominio funcional.
- Toda lógica de negocio en servicios, desacoplada de controladores.
- `AGENTS.md` documenta comandos de lint/typecheck y convenciones.

---

## 6. Modelo de Datos (Documentos Principales)

### Empleado (Employee)
| Campo | Tipo | Descripción |
|---|---|---|
| id | String (ObjectId) | Identificador único |
| name | String | Nombre completo del empleado |
| percentage | BigDecimal | Porcentaje de participación sobre el neto a repartir |
| active | Boolean | Estado activo/inactivo |

### Periodo Contable (AccountingPeriod)
| Campo | Tipo | Descripción |
|---|---|---|
| id | String (ObjectId) | Identificador único |
| periodStartDate | LocalDate | Fecha de inicio del periodo (día 1 o 16) |
| periodEndDate | LocalDate | Fecha de fin del periodo (día 15 o último del mes) |
| periodNumber | Integer | Número de quincena (1 = 1-15, 2 = 16-fin) |
| income | BigDecimal | Ingresos del periodo (auto-calculado desde CarJobs) |
| expenseItems | List<ExpenseItem> | Ítems de gasto del periodo (descripción + monto) |
| fixedExpenses | List<FixedExpenseItem> | Gastos fijos automáticos (nombre + monto mitad) |
| expenses | BigDecimal | Calculado: suma de expenseItems + fixedExpenses |
| dddg | BigDecimal | Calculado: Ingresos - Gastos (mínimo 0) |
| companyProfit | BigDecimal | Calculado: DDDG * 20% |
| netToDistribute | BigDecimal | Calculado: DDDG - Ganancia Empresa |
| employeeDistribution | List<EmployeeShare> | Detalle del monto repartido por empleado en ese periodo |
| bossAmount | BigDecimal | Calculado: Neto a Repartir - suma de EmployeeShare |
| closed | Boolean | Indica si el periodo está cerrado |

### Detalle de Reparto por Empleado (EmployeeShare) — subdocumento embebido
| Campo | Tipo | Descripción |
|---|---|---|
| employeeId | String | Referencia al empleado |
| employeeName | String | Nombre (copia histórica) |
| percentageApplied | BigDecimal | Porcentaje aplicado en ese momento (copia histórica) |
| amount | BigDecimal | Monto calculado para ese empleado en esa semana |

### Ítem de Gasto Fijo (FixedExpenseItem) — subdocumento embebido
| Campo | Tipo | Descripción |
|---|---|---|
| name | String | Nombre del gasto fijo |
| amount | BigDecimal | Monto del periodo (mitad del mensual) |

### Ítem de Gasto (ExpenseItem) — subdocumento embebido
| Campo | Tipo | Descripción |
|---|---|---|
| id | String | Identificador único del ítem |
| description | String | Descripción del gasto |
| amount | BigDecimal | Monto del gasto |

### Administrador (AdminUser)
| Campo | Tipo | Descripción |
|---|---|---|
| id | String (ObjectId) | Identificador único |
| email | String | Correo electrónico (único, usado para login) |
| passwordHash | String | Contraseña almacenada con hash (BCrypt) |
| fullName | String | Nombre del administrador |
| createdAt | LocalDateTime | Fecha de creación de la cuenta |
| lastLogin | LocalDateTime | Fecha del último inicio de sesión |
| failedLoginAttempts | Integer | Intentos fallidos consecutivos |
| lockedUntil | LocalDateTime (nullable) | Fecha/hora hasta bloqueo; null = no bloqueado |

### Factura (Invoice)
| Campo | Tipo | Descripción |
|---|---|---|
| id | String (ObjectId) | Identificador único |
| invoiceNumber | String | Número auto-generado (`FAC-0001`) |
| clientName | String | Nombre del cliente |
| date | LocalDate | Fecha de emisión |
| items | List<InvoiceItem> | Servicios incluidos |
| total | BigDecimal | Suma de todos los items |
| notes | String | Notas adicionales (opcional) |

### Ítem de Factura (InvoiceItem) — subdocumento embebido
| Campo | Tipo | Descripción |
|---|---|---|
| description | String | Descripción del servicio |
| amount | BigDecimal | Valor del servicio |
| carJobId | String (opcional) | Referencia al CarJob que originó el ítem |

### Trabajo de Carro (CarJob)
| Campo | Tipo | Descripción |
|---|---|---|
| id | String (ObjectId) | Identificador único |
| date | LocalDate | Fecha del trabajo |
| vin | String | VIN del vehículo |
| description | String | Descripción del trabajo realizado |
| payment | BigDecimal | Monto cobrado por el trabajo |
| paperTypes | List<String> | Tipos de papel aplicados |
| employeeShares | List<EmployeeJobShare> | Snapshot de empleados activos + % al crearse |
| closed | Boolean | Indica si el periodo contable al que pertenece está cerrado |

### EmployeeJobShare — subdocumento embebido en CarJob
| Campo | Tipo | Descripción |
|---|---|---|
| employeeId | String | Referencia al empleado |
| employeeName | String | Nombre (copia histórica) |
| percentage | BigDecimal | Porcentaje del empleado al momento de crear el trabajo |

### Gasto Fijo (FixedExpense) — documento independiente
| Campo | Tipo | Descripción |
|---|---|---|
| id | String (ObjectId) | Identificador único |
| name | String | Nombre del gasto fijo |
| amount | BigDecimal | Monto mensual (se divide en 2 por periodo) |

---

## 7. Reglas de Negocio

- `DDDG = income - expenses` (mínimo 0).
- `Ganancia Empresa = DDDG * 20%` (fijo en código como `COMPANY_RATE = 0.20`), solo si `DDDG > 0`.
- `Neto a Repartir = DDDG - Ganancia Empresa`.
- `Monto Empleado = Neto a Repartir * (% del Empleado / 100)`, calculado individualmente por cada empleado activo usando snapshot del trabajo.
- `Monto Jefe = Neto a Repartir - Suma de Montos de Empleados`.
- La suma de los porcentajes de todos los empleados activos no puede superar el 100%.
- Periodo quincenal: día 1-15 (Q1) o 16-fin de mes (Q2), calculado con `Date.UTC` medianoche.
- No se permite más de un registro de contabilidad por quincena.
- **El ingreso se calcula automáticamente** sumando los `payment` de todos los `CarJob` en el rango.
- **Un periodo se auto-crea** al registrar un `CarJob` si no existe quincena para esa fecha.
- **Los periodos se cierran manualmente.** Una vez cerrado: no se puede modificar nada.
- **Solo los gastos (expenseItems) son editables** en un periodo abierto.
- **Los cambios en % de empleado NO afectan periodos existentes.** Cada `CarJob` almacena snapshot de `employeeShares`. El recálculo manual agrega usando snapshots.
- **Gastos fijos:** se dividen en 2 automáticamente (mitad por periodo). Se cargan desde la colección `FixedExpense`.
- **Al eliminar un trabajo** en periodo abierto, si el periodo queda vacío (income=0, sin expenseItems, sin fixedExpenses), se elimina automáticamente.
- **El sistema solo permite acceso al administrador autenticado.** Sin auto-registro.
- **Límite de intentos de login:** 5 fallidos → bloqueo 30 min → HTTP 423.
- **Al cerrar un periodo,** los `CarJob` dentro del rango se marcan `closed=true`.
- **Escáner VIN foto-based:** getUserMedia → video en vivo → "Tomar foto" → captura frame → decode con `@zxing/library`. No continuo.
- **PDF factura:** Courier/CourierPrime, 204pt ancho, todo #000, 9pt mínimo, sin QR, sin logo (opcional), teléfono 786 793 4440.
- **PDF empleado:** mismo formato térmico, sin logo/sin QR/sin teléfono, solo fecha + ganancia.
- **Dashboard:** carga mes actual por defecto, filtra solo al hacer clic en "Filtrar".
- **Submit de CarJob** se deshabilita mientras la petición está en curso para evitar duplicados.
- **Paper types:** multi-select con opciones "Premium Film", "Ceramic Film", "Ultra Ceramic Film", "DOES NOT APPLY".
- **`toLocaleDateString`** usa `timeZone: 'UTC'` en toda la app para consistencia.

---

## 8. Casos de Uso Principales

| ID | Caso de Uso | Actor |
|---|---|---|
| CU-01 | Registrar nuevo empleado y su porcentaje | Jefe |
| CU-02 | Editar porcentaje o estado de un empleado | Jefe |
| CU-03 | Ver historial de pagos por empleado | Jefe |
| CU-04 | Calcular automáticamente DDDG, ganancia, neto y reparto | Sistema |
| CU-05 | Ver listado de contabilidad quincenal con totales | Jefe |
| CU-06 | Ver dashboard general (gráficos, totales por período) | Jefe |
| CU-07 | Exportar reporte de contabilidad en Excel | Jefe |
| CU-08 | Registrar trabajo de carro (fecha, VIN, descripción, pago, papel) | Jefe |
| CU-09 | Editar trabajo de carro existente | Jefe |
| CU-10 | Eliminar trabajo de carro | Jefe |
| CU-11 | Ver trabajos de carro con filtros por fechas y VIN | Jefe |
| CU-12 | Ver trabajos de la quincena en el detalle de contabilidad | Jefe |
| CU-13 | Exportar trabajos de carro a Excel | Jefe |
| CU-14 | Editar gastos de un periodo abierto | Jefe |
| CU-15 | Cerrar periodo (bloquear edición) | Jefe |
| CU-16 | Validar que la suma de porcentajes de empleados no supere el 100% | Sistema |
| CU-17 | Iniciar sesión (login) | Administrador |
| CU-18 | Cerrar sesión (logout) | Administrador |
| CU-19 | Bloquear cuenta por intentos fallidos de login | Sistema |
| CU-20 | Desbloquear cuenta manualmente desde configuración | Administrador |
| CU-21 | Cambiar contraseña desde configuración | Administrador |
| CU-22 | Ver información de cuenta (email, nombre, estado bloqueo) | Administrador |
| CU-23 | Escanear VIN con cámara al crear trabajo de carro | Administrador |
| CU-24 | Cerrar trabajos de carro automáticamente al cerrar periodo | Sistema |
| CU-25 | Descargar PDF de pagos por empleado con ganancia proporcional | Administrador |
| CU-26 | Ver detalle completo de un periodo contable (trabajos, gastos, resumen) | Administrador |
| CU-27 | Ver detalle completo de un trabajo de carro en modal | Administrador |
| CU-28 | Buscar trabajos por VIN en el listado | Administrador |
| CU-29 | Generar factura/garantía desde un trabajo de carro | Administrador |
| CU-30 | Generar factura agrupando múltiples trabajos | Administrador |
| CU-31 | Ver listado de facturas con detalle en modal | Administrador |
| CU-32 | Descargar PDF de factura (estilo ticket POS 80mm) | Administrador |
| CU-33 | Eliminar factura | Administrador |
| CU-34 | Recalcular manualmente un periodo abierto | Administrador |
| CU-35 | Gestionar gastos fijos (crear, editar, eliminar) | Administrador |
| CU-36 | Ver PDF de empleado inline (vista previa en pestaña) | Administrador |
| CU-37 | Ver PDF de factura inline (vista previa en pestaña) | Administrador |
| CU-38 | Filtrar dashboard por mes, filtrar solo con botón | Administrador |
| CU-39 | Ver ganancias empleados por trabajo con acordeón | Administrador |

---

## 9. Criterios de Aceptación

- Al crear/editar un trabajo, el sistema calcula automáticamente DDDG, Ganancia, Neto, montos y monto del jefe.
- El sistema impide crear dos registros de contabilidad para la misma quincena.
- El sistema impide guardar empleados activos cuya suma de porcentajes supere el 100%.
- Los ingresos se calculan automáticamente desde los `CarJob` en el rango de fechas.
- Si no existe quincena para la fecha de un `CarJob`, se crea automáticamente.
- La exportación a Excel genera un archivo `.xlsx` válido con estilos profesionales.
- El dashboard muestra correctamente los totales acumulados y gráficos.
- Ningún endpoint (excepto login) responde sin token JWT válido.
- Usuario no autenticado es redirigido al login.
- Contraseñas nunca en texto plano.
- Tras 5 intentos fallidos de login → HTTP 423.
- Al cerrar un periodo, todos los `CarJob` del rango se marcan como cerrados.
- El escáner VIN captura códigos Code 128/Code 39: foto manual, decode con `@zxing/library`.
- El PDF de pagos por empleado se genera en formato térmico, sin logo ni QR, solo fecha + ganancia.
- El PDF de factura se genera en formato ticket POS 80mm (Courier, #000, 9pt min).
- Los textos en el PDF de factura no se cortan; descripciones hacen wrap, precios alineados a la derecha.
- Al hacer clic en "Generar factura" en modal de trabajo, se crea factura inmediatamente.
- Botón "Recalcular" en detalle del periodo funciona y actualiza los valores en pantalla.
- Gastos fijos se dividen en 2 automáticamente por periodo.
- Dashboard carga mes actual por defecto, filtra solo al hacer clic en "Filtrar".
- Submit de CarJob se deshabilita mientras se guarda.
- Paper types se muestran en inglés, con "DOES NOT APPLY" como opción.
- Periodos vacíos se eliminan automáticamente al remover el último trabajo.
- Los cambios en % de empleado no afectan trabajos ya creados (snapshot).
- Vista inline de PDFs (factura y empleado) funciona en nueva pestaña con token.

---

## 10. Entregables

- Código fuente del backend (Node.js + Express + TypeScript, ESM).
- Código fuente del frontend (Next.js 16 + TypeScript + Tailwind CSS v4).
- Documentación de la API REST (endpoints documentados en código).

---

## 11. Sistema de Diseño

El diseño completo (colores, tipografía, layout, componentes, login, responsive, animaciones) está documentado en `Contexto/diseno.md`.

---

## 12. Decisiones de Diseño Confirmadas

1. **Income auto-calculado:** desde `CarJob.payment`.
2. **Gastos:** desglosados en ítems de gasto (descripción + monto).
3. **Periodo auto-creado:** al registrar un `CarJob`, si no existe quincena, se crea automáticamente.
4. **Periodos editables:** solo expenseItems son modificables en periodo abierto.
5. **Cierre manual:** el sistema no forza cierre automático.
6. **Fórmulas:** DDDG = income - expenses (mín 0), companyProfit = DDDG * 20%, netToDistribute = DDDG - companyProfit.
7. **Autenticación:** JWT + bcrypt, sin registro público.
8. **Despliegue:** backend (Render), frontend (Vercel), CORS configurable.
9. **Diseño:** paleta indigo/saffron, sidebar ODOO-style, gráficos recharts.
10. **Exportación:** Excel con exceljs (estilos profesionales).
11. **Quincena con UTC midnight:** `getQuincena()` usa `Date.UTC`, `getUTCDate()` etc., para evitar desfase de zona horaria.
12. **Cierre en cascada:** al cerrar periodo, se marcan `CarJob.closed = true`.
13. **Escáner VIN foto-based con `@zxing/library`:** sin escaneo continuo. Usuario presiona "Tomar foto" → captura frame → decode.
14. **Bloqueo por fuerza bruta:** 5 intentos / 30 min, HTTP 423. Desbloqueo manual desde Settings.
15. **Login oscuro vs app clara:** login fondo oscuro profesional, app fondo claro funcional.
16. **PDF de pagos proporcional:** `job.payment / totalIncome * employeeAmount`. Solo muestra ganancia del empleado.
17. **Modal de detalle de trabajo:** al hacer clic en fila → modal con todos los detalles.
18. **Selector de mes/año para PDF empleado:** modal antes de descargar.
19. **Dashboard filtra solo con botón:** `useEffect` no depende de fechas. Carga mes actual por defecto.
20. **Búsqueda de VIN:** regex, case-insensitive.
21. **Factura desde trabajo:** modal con nombre del cliente, descripción y monto desde el trabajo.
22. **Múltiples trabajos por factura:** checkboxes en formulario de creación.
23. **PDF factura estilo ticket POS 80mm (Courier, #000, 9pt min, 204pt ancho):** sin QR, sin logo (opcional), sin colores. Solo Courier/CourierPrime.
24. **Logo opcional en PDF:** `backend/assets/logo.PNG` (extensión mayúscula, sensible en Linux). Centrado 200px, escala de grises con `sharp`.
25. **iOS date input fix:** componente `DateInput` con `<span>` superpuesto como placeholder.
26. **Fechas UTC en toda la app:** todos los `toLocaleDateString` usan `timeZone: 'UTC'`.
27. **Snapshot de porcentajes por trabajo:** `CarJob.employeeShares[]`. Cambiar % de empleado no afecta trabajos ya creados.
28. **Gastos fijos automáticos:** se gestionan en Settings, se dividen en 2 por periodo, se muestran como solo lectura en detalle.
29. **Recalcular manual:** botón en página de detalle del periodo. Única forma de refrescar cálculos (no hay recálculo automático al cambiar empleados).
30. **Periodos vacíos se eliminan:** al borrar el último `CarJob` de un periodo con income=0, sin expenseItems, sin fixedExpenses, el periodo se elimina.
31. **Paper types en inglés:** "Premium Film", "Ceramic Film", "Ultra Ceramic Film", "DOES NOT APPLY". Multi-select.
32. **Submit button deshabilitado mientras guarda:** evita duplicados de CarJob.
33. **PDF empleado formato térmico:** mismo estilo que factura (Courier, 204pt, #000), sin logo/QR/teléfono. Solo fecha + ganancia por trabajo.
34. **PDF inline view:** botón "Ver" (ojo) abre PDF en nueva pestaña con `?token=` en URL.
35. **CORS multi-origen + Vercel previews:** `CORS_ORIGINS` coma-separados, `CORS_ALLOW_VERCEL_PREVIEWS` para wildcard `.vercel.app`.
36. **ESM migration:** `module: "esnext"`, `"type": "module"`, imports con `.js`. tsconfig `"types": ["node"]`.
37. **`.npmrc` con `include=dev`** para que Render instale devDependencies (necesarias para TypeScript).
38. **Sin ruta `/register`:** eliminada para evitar creación de cuentas no autorizadas.

---

*Documento elaborado como base para el desarrollo del ERP. Sujeto a revisión y ajustes durante la fase de diseño.*
