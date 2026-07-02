# Tinting-JD ERP

**Versión:** 0.7.0 (MVP - Contabilidad quincenal + Trabajos + Facturación + Seguridad mejorada + iOS fixes)
**Fecha:** Julio 2026
**Tipo:** Aplicación Web (ERP modular)
**Tecnología Backend:** Node.js / Express + TypeScript
**Tecnología Frontend:** React 19 + TypeScript + Tailwind CSS v4
**Base de Datos:** MongoDB Atlas

---

## 1. Descripción General

Sistema ERP web, de uso interno, orientado a llevar la gestión administrativa y financiera de una empresa de tinting automotriz. Actualmente cuenta con tres módulos principales:

1. **Contabilidad Quincenal** — registra ingresos (auto-calculados desde trabajos) y gastos por quincena (1-15 / 16-fin de mes), calcula automáticamente la utilidad y distribuye ganancias entre empleados y jefe según porcentajes configurables.
2. **Trabajos de Carros** — registra trabajos por vehículo (fecha, VIN, descripción, pago), que alimentan automáticamente los ingresos semanales de contabilidad.
3. **Facturación** — genera facturas/garantías (PDF estilo ticket POS 80mm) a partir de los trabajos registrados, permitiendo agrupar múltiples servicios en una misma factura.

El sistema está diseñado para crecer de forma modular (estilo Odoo), agregando en versiones futuras módulos como inventario, etc.

---

## 2. Alcance

- Aplicación web accesible desde navegador, con backend centralizado y base de datos MongoDB.
- Arquitectura pensada para múltiples módulos futuros (ERP), aunque en esta fase solo se implementa Contabilidad.
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

### 4.2 Registro Quincenal de Contabilidad

- El sistema debe auto-calcular los ingresos de la quincena sumando todos los pagos (`payment`) de trabajos de carro (`CarJob`) en el rango de la quincena.
- El sistema permite crear un registro por quincena con:
  - Rango de fechas (día 1-15 o 16-fin de mes, auto-calculado)
  - Gastos de la quincena, desglosados en **uno o más ítems de gasto**, cada uno con:
    - Descripción (ej. "gasolina", "repuestos", "almuerzos")
    - Monto
  - El sistema calcula automáticamente el **total de gastos** como suma de todos los ítems.
- El sistema debe permitir agregar, editar y eliminar ítems de gasto dentro de una quincena abierta.
- El sistema debe impedir crear más de un registro de contabilidad para la misma quincena.
- El sistema auto-crea una quincena cuando se registra un `CarJob` y no existe quincena para esa fecha.
- Al editar una quincena, solo los gastos son modificables; las fechas y el ingreso son de solo lectura.
- Al editar, todos los valores derivados (DDDG, ganancia, neto, reparto) se recalculan automáticamente.

### 4.3 Cálculo Automático de Contabilidad

Por cada quincena registrada, el sistema debe calcular automáticamente, en este orden:

1. **D.D.D.G (Disponible Después De Gastos)**
   `DDDG = Ingresos Semana - Gastos Semana (suma de ítems de gasto)`

2. **Ganancia Empresa**
   `Ganancia Empresa = DDDG * 20%` (porcentaje **fijo** en el sistema, definido en configuración interna del backend, no editable desde la interfaz en esta versión)

3. **Neto a Repartir**
   `Neto a Repartir = DDDG - Ganancia Empresa`

4. **Reparto por Empleado**
   Para cada empleado activo:
   `Monto Empleado = Neto a Repartir * (Porcentaje Empleado / 100)`

5. **Reparto del Jefe**
   `Monto Jefe = Neto a Repartir - Suma de Montos de todos los Empleados`
   (equivalente a `Neto a Repartir * (100% - Suma de Porcentajes Empleados) / 100`)

Todos estos valores deben recalcularse automáticamente cada vez que se modifique el ingreso, los ítems de gasto, o el porcentaje/cantidad de empleados activos, **siempre y cuando la semana en cuestión sea la semana actual** (ver regla de bloqueo en 4.3.1).

#### 4.3.1 Cierre Manual de Periodos

- Los periodos se cierran manualmente mediante `PATCH /api/accounting/{id}/close`.
- Un periodo cerrado no puede editarse (ni gastos, ni ingreso, ni recalcular).
- Un periodo abierto permite editar gastos; el ingreso siempre se recalcula desde `CarJob`.
- El sistema no forza cierre automático al cambiar de quincena.
- Si un empleado cambia su porcentaje o se activa/desactiva, ese cambio **solo aplica a periodos abiertos** al recalcular.

### 4.4 Módulo de Trabajos de Carros

- El sistema debe permitir registrar trabajos por vehículo con:
  - Fecha del trabajo
  - VIN (número de identificación vehicular)
  - Descripción del trabajo realizado
  - Pago (monto)
- El sistema debe mostrar un listado con filtros por rango de fechas y búsqueda por VIN (búsqueda parcial, case-insensitive).
- El sistema debe permitir editar y eliminar trabajos.
- Al crear/editar/eliminar un trabajo, se recalcula automáticamente el ingreso y todos los valores derivados (DDDG, ganancia, neto, reparto) de la quincena correspondiente.
- Si no existe una quincena para la fecha del trabajo, se crea automáticamente (1-15 o 16-fin de mes).
- Los trabajos de la quincena se muestran en el detalle de la quincena de contabilidad.
- Al hacer clic en cualquier celda de una fila de trabajo se abre un modal con los detalles completos (fecha, VIN, descripción, pago, estado), sin necesidad de navegar a otra página.
- Al hacer clic en el nombre del periodo en la tabla de contabilidad, se navega a una página de detalle (`/accounting/[id]`) que muestra: tarjetas resumen (ingresos, gastos, DDDG, ganancia, neto, cada empleado, jefe), la lista de trabajos del periodo y el editor de gastos.
- El botón "Recalcular" manual fue eliminado de la tabla, ya que el recálculo ocurre automáticamente al crear/editar/eliminar trabajos o al modificar gastos/empleados.

### 4.6 Vista de Contabilidad Quincenal

- El sistema debe mostrar una tabla/listado con todos los periodos registrados, incluyendo las columnas:
  - Periodo (número 1 o 2 + rango de fechas)
  - Ingresos
  - Gastos
  - D.D.D.G
  - Ganancia Empresa
  - Neto a Repartir
  - Monto por cada Empleado (columna dinámica por empleado activo)
  - Monto Jefe
- El sistema debe permitir filtrar por rango de fechas (ej. por mes, por trimestre, por año).
- El sistema debe mostrar totales acumulados (ingresos, gastos, ganancia empresa, neto repartido, total por empleado, total jefe) para el rango filtrado.

### 4.5 Resumen y Dashboard

- El sistema debe ofrecer un dashboard general con:
  - Ingresos y gastos totales del período seleccionado
  - Ganancia acumulada de la empresa
  - Total repartido a empleados (general y por empleado individual)
  - Total acumulado del jefe
  - Gráfico de evolución semanal de ingresos vs. gastos vs. ganancia (línea o barras)
  - Filtro por rango de fechas con actualización automática al cambiar los valores del calendario (sin necesidad de botón "Filtrar")

### 4.7 Exportación a Excel

- El sistema debe permitir exportar la contabilidad quincenal (con filtro por fechas) en formato Excel (`.xlsx`) con:
  - Una fila por periodo con todas las columnas
  - Fila de totales al final
  - Encabezados con color de marca, filas alternadas, formato moneda
  - Segunda hoja "Ganancias empleados" con desglose por empleado
- El sistema debe permitir exportar trabajos de carro (con filtro por fechas y VIN) a Excel con diseño similar.
- Formato de moneda: `$#,##0.00`.

### 4.7 Autenticación y Seguridad (Administrador)

- El sistema debe estar protegido mediante **login obligatorio**, ya que se desplegará en internet y será de uso exclusivo del administrador (jefe/dueño de la empresa).
- El sistema debe contar con una pantalla de **registro inicial** para crear la cuenta del administrador (correo electrónico y contraseña).
  - Para el MVP se contempla un único usuario administrador. El registro puede limitarse a permitir la creación de una sola cuenta (o protegerse con una clave de invitación/registro), para evitar que cualquier persona en internet pueda crear una cuenta nueva.
- El sistema debe contar con una pantalla de **login** (correo y contraseña) que dé acceso al resto de la aplicación.
- Ninguna ruta de la aplicación (frontend) ni endpoint de la API (backend) debe ser accesible sin sesión válida, excepto las rutas de login y registro.
- Las contraseñas deben almacenarse de forma segura (hash con algoritmo robusto, ej. BCrypt), nunca en texto plano.
- El sistema debe permitir cerrar sesión (logout).
- El sistema debe permitir recuperar el acceso ante olvido de contraseña (al menos un mecanismo básico, ej. restablecimiento por correo electrónico), a definir en detalle según el proveedor de correo disponible.
- El sistema debe proteger las contraseñas y tokens contra ataques comunes (fuerza bruta, inyección, XSS, CSRF), aplicando las prácticas estándar de Spring Security.
- El acceso a la API debe estar protegido con un mecanismo de sesión basado en **JWT** (token con expiración), enviado en cada petición desde el frontend.
- La conexión entre frontend y backend, y el sitio en general, debe servirse mediante **HTTPS** en producción.

### 4.8 Módulo de Facturación

- El sistema debe permitir generar facturas/garantías a partir de trabajos de carro (`CarJob`) registrados.
- El sistema debe permitir seleccionar **uno o varios trabajos** al crear una factura, agrupando múltiples servicios para un mismo cliente.
- El sistema debe auto-generar el número de factura consecutivo (`FAC-0001`, `FAC-0002`, ...).
- El sistema debe calcular el total automáticamente como suma de los valores de los servicios incluidos.
- El PDF de la factura debe tener estilo **ticket POS 80mm** con:
  - Encabezado centrado: nombre de la empresa, NIT, dirección, teléfono
  - Número de factura grande en color saffron
  - Tabla de servicios con wrap de descripción larga y precios alineados a la derecha
  - Total grande y resaltado
  - Texto de garantía en cursiva
  - Footer con fecha de generación
  - Todo en inglés
- El sistema debe permitir descargar el PDF de la factura desde la página de facturación y desde el modal de detalle.
- El sistema debe permitir eliminar facturas.
- El sistema debe mostrar el detalle de la factura en un modal al hacer clic en la fila.

### 4.9 Módulos Futuros (fuera de alcance, solo referencia arquitectónica)

- Módulos ERP a futuro: inventario, clientes/proveedores, roles y permisos avanzados.
- El diseño de la arquitectura (capas, dominios separados por módulo) debe facilitar agregar estos módulos sin reescribir los existentes.

---

## 5. Requerimientos No Funcionales

### 5.1 Tecnología

- **Backend / Lógica de negocio:** **Node.js** con **Express + TypeScript**.
- **Persistencia:** Mongoose (ODM para MongoDB).
- **Base de datos:** MongoDB (puede ser local en desarrollo, y MongoDB Atlas u otro servicio administrado en producción).
- **Frontend:** Aplicación **React 19** con TypeScript, consumiendo la API REST del backend.
- **Comunicación Frontend-Backend:** API REST (JSON), con posibilidad de evolucionar a GraphQL si el ERP crece en complejidad.
- **Autenticación (futura/inicial):** JWT, con posibilidad de roles (Jefe / Empleado) desde etapas tempranas si se decide incluir control de acceso ya en el MVP.
- **Gestor de dependencias:** npm o pnpm (monorepo o carpetas separadas).

### 5.1.1 Despliegue

- **Backend (Node.js / Express):** desplegado en **Render** (como servicio web Node), conectado a la base de datos MongoDB (ej. MongoDB Atlas).
- **Frontend (Next.js / React):** desplegado en **Vercel**.
- Al estar frontend y backend en dominios/servicios distintos, el backend debe configurar correctamente **CORS** para aceptar peticiones únicamente desde el dominio del frontend en Vercel.
- Las variables sensibles (cadena de conexión a MongoDB, secreto para firmar JWT, credenciales) deben manejarse mediante variables de entorno en Render y Vercel, nunca hardcodeadas en el repositorio.
- Se debe documentar en el `README.md` el proceso de configuración de variables de entorno y despliegue en ambas plataformas.

### 5.2 Arquitectura

- Arquitectura modular pensada para ERP, separando cada dominio funcional (Contabilidad, y en el futuro Vehículos, Inventario, etc.) en sus propios módulos/dominios dentro del backend.
- Backend en capas:
  - **Capa de rutas (API):** Definición de endpoints Express con enrutadores modulares (`express.Router()`)
  - **Capa de controladores:** Manejo de request/response, validación de entrada
  - **Capa de servicio:** Lógica de negocio desacoplada de la capa web (cálculo de DDDG, ganancia, reparto, validaciones de porcentajes)
  - **Capa de repositorio:** Acceso a datos mediante Mongoose Models
  - **Capa de modelo:** Schemas de Mongoose (AccountingPeriod, Employee, ExpenseItem)
- Frontend organizado por features/módulos (carpeta `accounting/`, y futuras carpetas `vehicles/`, etc.), con componentes reutilizables de UI tipo ERP (tablas, dashboards, formularios).
- Separación estricta de responsabilidades (SRP) y aplicación de principios SOLID en el backend.
- Diseño preparado para crecer en número de módulos sin acoplar la lógica de Contabilidad con las futuras funcionalidades.

### 5.3 Persistencia de Datos

- Los datos se almacenan en colecciones de MongoDB, por ejemplo:
  - `employees`
  - `weekly_accounting`
  - `expense_items` (si se decide modelar los gastos como ítems independientes en vez de un solo valor)
- Se debe definir una estrategia de respaldo (backup) de la base de datos, acorde al entorno donde se despliegue (local, servidor propio o nube).

### 5.4 Usabilidad

- La interfaz debe ser intuitiva, en español, con estilo visual tipo panel administrativo/ERP (similar a Odoo: menú lateral de módulos, tablas, dashboards).
- Los valores monetarios deben mostrarse con formato de miles (ej. $30.000,00), moneda colombiana.
- Las fechas deben mostrarse en formato `DD/MM/YYYY`.
- El sistema debe confirmar antes de eliminar o modificar registros que afecten cálculos ya cerrados.
- El sistema debe mostrar mensajes de validación claros (ej. si la suma de porcentajes de empleados supera el 100%).

### 5.5 Rendimiento

- Las consultas del listado semanal y dashboard deben responder en menos de 2 segundos con varios años de historial.
- La aplicación debe soportar el crecimiento futuro en número de módulos sin degradar el rendimiento del módulo de Contabilidad.

### 5.6 Seguridad

- El sistema **requiere autenticación obligatoria** desde el MVP, ya que estará desplegado en internet y debe estar protegido de accesos no autorizados.
- Modelo de un único rol: **Administrador** (el jefe), responsable de todo el manejo del software. No se contemplan roles adicionales (ej. empleados con acceso propio) en esta versión.
- Autenticación basada en **JWT + bcrypt + middleware Express**:
  - Login con correo y contraseña.
  - Token JWT con expiración, renovable o que obligue a re-login al expirar.
  - Middleware `authenticateToken` en Express que valida el JWT en cada ruta protegida.
  - Todas las rutas de la API (excepto `/auth/login` y `/auth/register`) deben validar el token.
- Las contraseñas deben almacenarse con hash (bcrypt) y nunca en texto plano ni en logs.
- El registro de administrador debe estar restringido (ej. solo se permite un usuario administrador, o el registro requiere una clave/código de invitación), para que no quede expuesto como un registro público abierto en internet.
- El despliegue en producción debe usar **HTTPS** obligatoriamente.
- Los endpoints de la API deben validar los datos de entrada (porcentajes, montos no negativos, semanas no duplicadas, credenciales bien formadas, etc.) para mitigar inyección y datos corruptos.
- Se debe aplicar protección estándar contra CSRF, XSS y fuerza bruta en el login (ej. límite de intentos fallidos).

### 5.7 Mantenibilidad

- El código backend debe seguir convenciones estándar de TypeScript/Node (camelCase, PascalCase para interfaces/tipos, organización por módulos).
- El código frontend debe seguir las convenciones del ecosistema React/Next.js (componentes, hooks, organización por features).
- Toda lógica de negocio del backend (cálculo de DDDG, ganancia, reparto) debe tener pruebas unitarias (Vitest o Jest).
- Uso de inyección de dependencias en el backend para facilitar pruebas y mantenimiento.
- El proyecto debe contar con un archivo `README.md` con instrucciones de instalación, configuración de MongoDB y ejecución de backend y frontend.

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
| expenses | BigDecimal | Calculado: suma de todos los expenseItems |
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
| employeeName | String | Nombre (copia histórica, para no depender de cambios futuros del empleado) |
| percentageApplied | BigDecimal | Porcentaje aplicado en ese momento (copia histórica) |
| amount | BigDecimal | Monto calculado para ese empleado en esa semana |

### Ítem de Gasto (ExpenseItem) — subdocumento embebido dentro de WeeklyAccounting
| Campo | Tipo | Descripción |
|---|---|---|
| id | String | Identificador único del ítem (dentro de la semana) |
| description | String | Descripción del gasto (ej. "gasolina", "repuestos") |
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
| failedLoginAttempts | Integer | Intentos fallidos consecutivos de login (para bloqueo por fuerza bruta) |
| lockedUntil | LocalDateTime (nullable) | Fecha/hora hasta la cual la cuenta está bloqueada; null = no bloqueada |

### Factura (Invoice)
| Campo | Tipo | Descripción |
|---|---|---|
| id | String (ObjectId) | Identificador único |
| invoiceNumber | String | Número auto-generado (`FAC-0001`, `FAC-0002`, ...) |
| clientName | String | Nombre del cliente |
| date | LocalDate | Fecha de emisión |
| items | List<InvoiceItem> | Servicios incluidos (descripción + monto + carJobId opcional) |
| total | BigDecimal | Suma de todos los items |
| notes | String | Notas adicionales (opcional) |

### Ítem de Factura (InvoiceItem) — subdocumento embebido
| Campo | Tipo | Descripción |
|---|---|---|
| description | String | Descripción del servicio (copia desde el CarJob) |
| amount | BigDecimal | Valor del servicio (copia desde CarJob.payment) |
| carJobId | String (ObjectId, opcional) | Referencia al CarJob que originó el ítem |

### Trabajo de Carro (CarJob)
| Campo | Tipo | Descripción |
|---|---|---|
| id | String (ObjectId) | Identificador único |
| date | LocalDate | Fecha del trabajo |
| vin | String | VIN del vehículo (escaneable con cámara Code 128/Code 39) |
| description | String | Descripción del trabajo realizado |
| payment | BigDecimal | Monto cobrado por el trabajo |
| closed | Boolean | Indica si el periodo contable al que pertenece está cerrado |

---

## 7. Reglas de Negocio

- `DDDG = Ingresos Semana - Gastos Semana` (si el resultado es negativo, se trunca a 0).
- `Ganancia Empresa = DDDG * 20%` (fijo en código como `COMPANY_RATE = 0.20`), solo si `DDDG > 0`.
- `Neto a Repartir = DDDG - Ganancia Empresa`.
- `Monto Empleado = Neto a Repartir * (% del Empleado / 100)`, calculado individualmente por cada empleado activo.
- `Monto Jefe = Neto a Repartir - Suma de Montos de Empleados` (el jefe recibe siempre el remanente).
- La suma de los porcentajes de todos los empleados activos no puede superar el 100%.
- Un periodo contable es quincenal: del día 1 al 15 (quincena 1) o del 16 al último día del mes (quincena 2), auto-calculado con `accountingService.quincenaStart()` / `quincenaEnd()`.
- No se permite más de un registro de contabilidad por quincena.
- **El ingreso se calcula automáticamente** sumando los `payment` de todos los `CarJob` cuya fecha caiga dentro del rango de la quincena. No se ingresa manualmente.
- **Un periodo se auto-crea** cuando se registra un trabajo (`CarJob`) cuya fecha no pertenece a ninguna quincena existente.
- **Los periodos se pueden cerrar manualmente** (PATCH `…/close`). Una vez cerrado no se puede modificar.
- **Solo los gastos son editables** en un periodo abierto; las fechas y el ingreso siempre son de solo lectura.
- Los cambios en el porcentaje o estado (activo/inactivo) de un empleado **solo afectan a trabajos nuevos**. Los periodos ya existentes (abiertos o cerrados) mantienen los porcentajes con los que fueron calculados originalmente.
- Al desactivar un empleado, se conserva su historial de reparto en periodos anteriores (los `EmployeeShare` ya guardados no se modifican).
- El porcentaje aplicado a cada empleado se almacena de forma histórica en cada `EmployeeShare`, de modo que cambios futuros en el porcentaje del empleado no alteran periodos ya calculados.
- El sistema solo permite el acceso al administrador autenticado; ninguna funcionalidad de contabilidad (ver, crear, editar, exportar) es accesible sin sesión válida.
- El registro de nuevas cuentas de administrador está restringido (no es un registro público abierto), dado que la aplicación estará en internet.
- **Límite de intentos de login (fuerza bruta):** tras 5 intentos fallidos de login, la cuenta se bloquea por 30 minutos (configurable vía `login.max-attempts` y `login.lock-duration-minutes`). El endpoint devuelve HTTP 423 LOCKED con `locked: true`. Se puede desbloquear manualmente desde la página de configuración (`/settings`).
- **Al cerrar un periodo contable**, todos los `CarJob` cuya fecha caiga dentro de ese rango se marcan automáticamente con `closed=true`. Una vez cerrado, no se pueden crear, editar ni eliminar trabajos en ese periodo.
- **Escáner VIN:** durante la creación de un `CarJob`, se puede escanear el código de barras del VIN (Code 128/Code 39). Abre la cámara trasera, muestra el video en vivo, el usuario presiona "Tomar foto", captura un frame y lo decodifica con `@zxing/library`. El VIN escaneado se rellena automáticamente en el campo correspondiente.
- **PDF de pagos por empleado:** desde la página de empleados se puede descargar un PDF con el historial de pagos de un empleado en un mes específico. Al hacer clic en el icono de PDF se abre un modal donde se selecciona mes y año antes de descargar. El PDF muestra los periodos quincenales, los trabajos del periodo y la ganancia proporcional del empleado por cada trabajo. La ganancia se calcula como `job.payment / totalIncome * employeeAmount`. No se muestra el precio del servicio (solo la ganancia del empleado).
- **Generación de facturas desde trabajos:** al hacer clic en "Generar factura" en el modal de detalle de un trabajo (`CarJob`), se abre un modal para ingresar el nombre del cliente y se crea la factura usando los datos del trabajo (descripción, monto, carJobId).
- **Múltiples servicios por factura:** desde el formulario de creación de facturas se pueden seleccionar varios trabajos mediante checkboxes. Cada trabajo se convierte en un ítem de la factura.
- **Auto-numeración de facturas:** el número de factura se genera como `FAC-XXXX` donde XXXX es el consecutivo (count de documentos + 1), padding a 4 dígitos.
- **El total de la factura** se calcula como suma de los `amount` de todos sus items al momento de crear la factura, y se almacena como campo calculado.
- **PDF sin logo:** el PDF de factura incluye un espacio para logo en la parte superior central. Si existe `backend/assets/logo.png` se muestra; si no, se omite sin error.

---

## 8. Casos de Uso Principales

| ID | Caso de Uso | Actor |
|---|---|---|---|
| CU-01 | Registrar nuevo empleado y su porcentaje | Jefe |
| CU-02 | Editar porcentaje o estado de un empleado | Jefe |
| CU-03 | Ver historial de pagos por empleado | Jefe |
| CU-04 | Calcular automáticamente DDDG, ganancia, neto y reparto | Sistema |
| CU-05 | Ver listado de contabilidad quincenal con totales | Jefe |
| CU-06 | Ver dashboard general (gráficos, totales por período) | Jefe |
| CU-07 | Exportar reporte de contabilidad en Excel | Jefe |
| CU-08 | Registrar trabajo de carro (fecha, VIN, descripción, pago) | Jefe |
| CU-09 | Editar trabajo de carro existente | Jefe |
| CU-10 | Eliminar trabajo de carro | Jefe |
| CU-11 | Ver trabajos de carro con filtros por fechas | Jefe |
| CU-12 | Ver trabajos de la quincena en el detalle de contabilidad | Jefe |
| CU-13 | Exportar trabajos de carro a Excel | Jefe |
| CU-14 | Editar gastos de una semana abierta | Jefe |
| CU-15 | Cerrar semana (bloquear edición) | Jefe |
| CU-16 | Validar que la suma de porcentajes de empleados no supere el 100% | Sistema |
| CU-17 | Registrar cuenta de administrador (inicial / restringida) | Administrador |
| CU-18 | Iniciar sesión (login) | Administrador |
| CU-19 | Cerrar sesión (logout) | Administrador |
| CU-20 | Bloquear cuenta por intentos fallidos de login | Sistema |
| CU-21 | Desbloquear cuenta manualmente desde configuración | Administrador |
| CU-22 | Cambiar contraseña desde configuración | Administrador |
| CU-23 | Ver información de cuenta (email, nombre, estado bloqueo) | Administrador |
| CU-24 | Escanear VIN con cámara al crear trabajo de carro | Administrador |
| CU-25 | Cerrar trabajos de carro automáticamente al cerrar periodo | Sistema |
| CU-26 | Descargar PDF de pagos por empleado con ganancia proporcional | Administrador |
| CU-27 | Ver historial de pagos por empleado con selector de mes/año y detalle expandible por periodo | Administrador |
| CU-28 | Ver detalle completo de un periodo contable (trabajos, gastos, resumen) desde la tabla | Administrador |
| CU-29 | Ver detalle completo de un trabajo de carro en modal | Administrador |
| CU-30 | Buscar trabajos por VIN en el listado | Administrador |
| CU-31 | Filtrar dashboard por rango de fechas con actualización automática | Administrador |
| CU-32 | Descargar PDF de empleado seleccionando mes y año en un modal | Administrador |
| CU-33 | Generar factura/garantía desde un trabajo de carro | Administrador |
| CU-34 | Generar factura agrupando múltiples trabajos | Administrador |
| CU-35 | Ver listado de facturas con detalle en modal | Administrador |
| CU-36 | Descargar PDF de factura (estilo ticket POS 80mm) | Administrador |
| CU-37 | Eliminar factura | Administrador |

---

## 9. Criterios de Aceptación

- Al crear/editar una semana, el sistema calcula automáticamente DDDG, Ganancia Empresa, Neto a Repartir, montos por empleado y monto del jefe, mostrando los resultados sin recargar.
- El sistema impide crear dos registros de contabilidad para la misma semana.
- El sistema impide guardar empleados activos cuya suma de porcentajes supere el 100%.
- Los ingresos semanales se calculan automáticamente desde los `CarJob` en el rango de fechas de la semana.
- Si no existe semana para la fecha de un `CarJob`, se crea automáticamente.
- La exportación a Excel genera un archivo `.xlsx` válido con estilos profesionales (encabezados, filas alternadas, formato moneda, totales, 2 hojas para contabilidad).
- El dashboard muestra correctamente los totales acumulados, gráfico de barras (ingresos vs gastos) y gráfico dona (distribución empleados).
- Ningún endpoint de la API (excepto login/registro) responde sin un token JWT válido.
- Un usuario no autenticado es redirigido al login.
- Las contraseñas nunca se almacenan ni se transmiten en texto plano.
- El registro de administrador no permite la creación libre de múltiples cuentas.
- Tras 5 intentos fallidos de login, la cuenta se bloquea y el servidor responde HTTP 423 con `locked: true`.
- La página de configuración permite desbloquear la cuenta y cambiar la contraseña.
- Al cerrar un periodo contable, todos los trabajos dentro del rango se marcan como cerrados y no se pueden editar/eliminar.
- El escáner VIN captura correctamente códigos Code 128/Code 39: abre la cámara trasera, el usuario toma una foto manualmente y decodifica en esa imagen.
- El PDF de pagos por empleado descarga un archivo válido con header de empresa, periodos, trabajos y ganancia proporcional sin precio de servicio visible.
- Al hacer clic en el nombre de un periodo en la tabla de contabilidad, se abre una página de detalle con trabajos, gastos y resumen.
- Al hacer clic en una fila de trabajo, se abre un modal con todos los detalles del trabajo.
- El campo de búsqueda por VIN filtra los trabajos en tiempo real (búsqueda parcial, case-insensitive).
- Al cambiar las fechas del calendario en el dashboard, los datos se recargan automáticamente.
- Al descargar PDF de empleado, se muestra un modal para seleccionar mes y año antes de la descarga.
- Al crear una factura, se puede seleccionar uno o varios trabajos de la lista mediante checkboxes.
- El PDF de factura se genera en formato ticket POS (80mm de ancho) con la información de la empresa centrada, servicios en tabla, total resaltado, y texto de garantía en inglés.
- Los textos en el PDF de factura no se cortan ni se superponen; las descripciones largas hacen wrap y los precios se mantienen en una sola línea alineados a la derecha.
- Al hacer clic en "Generar factura" en el modal de detalle de un trabajo, se abre un formulario para ingresar el nombre del cliente y se crea la factura inmediatamente.

---

## 10. Entregables

- Código fuente del backend (Node.js + Express + TypeScript).
- Código fuente del frontend (Next.js + TypeScript + Tailwind CSS).
- Documentación de la API REST (disponible mediante endpoints documentados en código).

---

## 11. Sistema de Diseño

El diseño completo (colores, tipografía, layout, componentes, login, responsive, animaciones) está documentado en `Context/diseno.md`.

---

## 12. Decisiones de Diseño Confirmadas

1. **Income auto-calculado:** los ingresos del periodo se calculan automáticamente desde `CarJob.payment`, no se ingresan manualmente.
2. **Gastos:** se desglosan en **varios ítems de gasto**, cada uno con descripción y monto.
3. **Periodo auto-creado:** al registrar un `CarJob`, si no existe quincena para la fecha, se crea automáticamente (1-15 o 16-fin de mes).
4. **Periodos editables:** solo los gastos se pueden modificar en un periodo abierto; fechas e ingreso son de solo lectura.
5. **Cierre manual:** los periodos se cierran manualmente; el sistema no forza cierre automático.
6. **Fórmulas:** `DDDG = income - expenses` (mínimo 0), `companyProfit = DDDG * 20%`, `netToDistribute = DDDG - companyProfit`.
7. **Autenticación:** login con JWT, registro restringido a un solo admin.
8. **Despliegue:** backend (Render), frontend (Vercel), CORS y variables de entorno.
9. **Diseño:** paleta indigo/saffron, sidebar ODOO-style siempre visible, gráficos recharts.
10. **Exportación:** Excel con `exceljs` (estilos: encabezados, filas alternadas, formato moneda, totales).
11. **Fechas límite con `$gte`/`$lt`:** al usar `LocalDate` como ISODate con offset UTC, `$lte` excluye documentos del día límite. Se usa `$gte`/`$lt` con `end.plusDays(1)` para incluir correctamente todo el rango.
12. **Cierre en cascada:** al cerrar un periodo, se marcan todos los `CarJob` del rango como `closed=true`, simplificando el modelo (sin relación many-to-many).
13. **Escáner VIN foto-based con `@zxing/library`:** el usuario abre la cámara, ve el video en vivo, presiona "Tomar foto" para capturar un frame, y el código se decodifica mediante `@zxing/library`. Compatible con iOS y Android. No usa escaneo continuo en vivo.
14. **Bloqueo por fuerza bruta:** 5 intentos / 30 min, configurable vía variables de entorno. Desbloqueo manual desde `/settings` (sin notificación por correo en MVP).
15. **Login oscuro vs app clara:** la pantalla de login usa fondo oscuro profesional (automotriz), la app interior usa fondo claro funcional.
16. **PDF de pagos proporcional:** `job.payment / totalIncome * employeeAmount`. El empleado ve su ganancia por trabajo sin conocer el precio total del servicio.
17. **Modal de detalle de trabajo:** al hacer clic en una fila de trabajo se abre un modal con todos los detalles. No es necesario navegar a otra página.
18. **Selector de mes/año para PDF:** el PDF de empleados requiere seleccionar mes y año en un modal antes de descargar, permitiendo consultar periodos pasados.
19. **Dashboard auto-filtro:** al cambiar las fechas del calendario en el dashboard, los datos se recargan automáticamente (useEffect), sin necesidad de botón.
20. **Búsqueda de VIN en trabajos:** filtro por VIN con búsqueda parcial (regex, case-insensitive) en el listado de trabajos y en la exportación a Excel.
21. **Factura desde trabajo:** desde el modal de detalle de un CarJob se puede generar una factura escribiendo el nombre del cliente. La descripción y el monto se toman del trabajo, simplificando el flujo.
22. **Múltiples trabajos por factura:** el formulario de creación de facturas usa checkboxes para seleccionar varios CarJobs, permitiendo agrupar servicios de un mismo cliente.
23. **PDF estilo ticket POS 80mm:** la factura se genera con ancho fijo 302pt, márgenes reducidos (8pt), encabezado centrado, tabla con wrap de descripción, precio alineado a la derecha, total grande. El alto de página se calcula dinámicamente según el contenido para que no sobre espacio en blanco. Texto en inglés.
24. **Logo opcional en PDF:** si existe `backend/assets/logo.PNG` se muestra centrado en la parte superior; si no, se omite sin errores. El usuario debe colocar el archivo manualmente. El nombre debe tener extensión mayúscula `.PNG` (sensible a mayúsculas en Linux/Render).
25. **iOS date input fix:** Safari iOS no muestra placeholder nativo en `<input type="date">`. Se creó un componente `DateInput` que superpone un `<span>` con el placeholder cuando el input está vacío.
26. **VIN scanner sin escaneo continuo:** se cambió de detección automática continua (video → `BarcodeDetector`/`@zxing/library`) a captura manual: el usuario ve el video en vivo, presiona "Tomar foto", se captura un frame y se decodifica. Más fiable en iOS.

---

*Documento elaborado como base para el desarrollo del módulo de Contabilidad del ERP. Sujeto a revisión y ajustes durante la fase de diseño.*
