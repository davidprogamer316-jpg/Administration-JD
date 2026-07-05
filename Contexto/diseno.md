# Sistema de Diseño — Tinting-JD ERP

> Documentación visual y de componentes de la interfaz.

---

## 1. Filosofía

Dos caras de una misma identidad:

- **Login**: oscuro, profesional, automotriz. Transmite solidez y seguridad (taller especializado).
- **App interior**: clara, funcional, tipo ERP. Prioriza legibilidad de datos y eficiencia operativa.

La paleta se inspira en un taller nocturno: el indigo del uniforme de trabajo, el saffron de la iluminación sobre la herramienta, y el linen del piso limpio.

---

## 2. Paleta de Colores

| Token            | Hex       | Uso |
|------------------|-----------|-----|
| `brand`          | `#1B1B2F` | Sidebar, login completo |
| `brand-hover`    | `#2A2A45` | Hover de elementos brand |
| `accent`         | `#D4A84B` | Botones principales, indicadores activos, highlights |
| `accent-light`   | `#E8C87A` | Hover/light variant de accent |
| `bg-page`        | `#F5F2ED` | Fondo de páginas interiores |
| `surface`        | `#FFFFFF` | Fondo de tarjetas y contenedores |
| `text-body`      | `#2D2A3D` | Texto principal |
| `text-muted`     | `#8B7D8B` | Texto secundario, etiquetas, placeholders |
| `success`        | `#5B8C6B` | Estados exitosos |
| `danger`         | `#B85C5C` | Errores, alertas |
| `border`         | `#E5E0D8` | Bordes de tarjetas, inputs, divisores ligeros |

### Login (oscuro) — variantes sobre brand

| Elemento          | Clase/Valor               |
|-------------------|---------------------------|
| Fondo página      | `bg-brand` (`#1B1B2F`)   |
| Tarjeta           | `bg-white/5`, `border-white/10` |
| Inputs            | `bg-white/5`, `border-white/10`, `text-white`, `placeholder-white/20` |
| Input iconos      | `text-white/30`           |
| Labels            | `text-white/50`           |
| Botón submit      | `bg-accent` (`#D4A84B`), `text-brand` (`#1B1B2F`) |
| Banner bloqueo    | `bg-orange-500/10`, `border-orange-400/30`, `text-orange-300/400` |
| Error             | `bg-red-500/10`, `border-red-500/20`, `text-red-400` |
| Footer            | `text-white/20`           |

### App interior (claro)

| Elemento          | Clase/Valor                        |
|-------------------|------------------------------------|
| Fondo página      | `bg-bg-page` (`#F5F2ED`)          |
| Tarjetas          | `bg-surface` (`#FFFFFF`), `border border-border` (`#E5E0D8`) |
| Inputs            | `bg-bg-page` (`#F5F2ED`), `border-border` |
| Texto labels      | `text-text-muted` (`#8B7D8B`)     |
| Texto valores     | `text-text-body` (`#2D2A3D`)      |
| Botones           | `bg-accent` (`#D4A84B`), `text-white` |
| Badge activo      | `bg-emerald-100 text-emerald-700`  |
| Badge bloqueado   | `bg-orange-100 text-orange-700`    |
| Badge cerrado     | `bg-gray-100 text-gray-500`        |

---

## 3. Tipografía

| Rol        | Fuente              | Variable CSS           | Uso |
|------------|---------------------|------------------------|-----|
| Headings   | Plus Jakarta Sans   | `--font-heading`       | Títulos, logo, headers de sección |
| Body       | Inter               | `--font-body`          | Texto general, inputs, tablas, etiquetas |

Ambas cargadas desde Google Fonts via `next/font/google` en `layout.tsx`.

**PDFs (facturas y empleados):** Courier / CourierPrime (TTF empaquetado en `backend/assets/fonts/`). Todo #000, 9pt mínimo, 204pt de ancho.

---

## 4. Layout y Estructura

### Sidebar (ODOO-style)
- **Ancho**: 224px (`w-56`)
- **Fijo**: `fixed top-0 left-0 h-full`
- **Fondo**: `bg-brand` (`#1B1B2F`)
- **Overlay mobile**: `fixed inset-0 z-30 bg-black/50`
- **Z-index sidebar**: `z-40`
- **Transición**: `duration-200 ease-in-out` en translate X
- **Responsive**: mobile oculto con `-translate-x-full`, desktop siempre visible con `md:translate-x-0`
- **Sombra**: `shadow-lg`
- **Hamburger toggle**: botón para abrir/cerrar en mobile

### Páginas interiores
- **Contenedor**: margen izquierdo igual al sidebar (`md:ml-56`) + `p-6` o `px-6 pb-8`
- **Ancho máximo formularios**: `max-w-2xl` (672px centrado)
- **Tablas**: `overflow-x-auto` con scroll horizontal en mobile
- **Columnas responsive en tablas**: DDDG/Ganancia ocultas en `<sm`, columnas empleados/Jefe ocultas en `<lg`

### Tarjetas
- `rounded-xl border border-border p-6 shadow-sm bg-surface`

### Inputs (app interior)
- `rounded-lg border border-border bg-bg-page px-3.5 py-2.5 text-sm text-text-body`
- Focus: `outline-none ring-2 ring-accent/40 focus:border-accent transition-colors`

### Inputs (login)
- `rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white`
- Focus: `outline-none ring-2 ring-accent/40 focus:border-accent/50`
- Con icono: `pl-10` (icono absoluto en `left-3.5`)

### Botones
- **Primario (accent)**: `rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50`
- **Submit login**: `rounded-xl bg-accent text-brand font-semibold px-4 py-3 w-full`
- **Eliminar**: `text-danger hover:text-danger/80`
- **Borde (secundario)**: `rounded-lg border border-border text-text-muted px-4 py-2 text-sm hover:bg-bg-page transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`
- **Con spinner**: el icono `RefreshCw` gira con `animate-spin` mientras hay una operación en curso, y el texto cambia (ej. "Recalculando...", "Cerrando...")

---

## 5. Componentes Visuales

### Logo
- **Contenedor**: `w-8 h-8 rounded-lg bg-accent/20 text-accent text-sm font-bold font-heading` (sidebar)
- **Login**: `w-14 h-14 rounded-2xl bg-accent/15 text-accent text-2xl font-bold font-heading ring-1 ring-accent/20`
- Letra "T" centrada, misma tipografía heading

### Sidebar: navegación
- Item activo: `bg-white/15 text-accent font-medium` + indicador `w-1 h-5 rounded-r-full bg-accent` (posición absoluta)
- Item inactivo: `text-white/60 hover:bg-white/5 hover:text-white/90`
- Gap entre items: `gap-0.5`
- Padding item: `px-4 py-2.5`

### Sidebar: usuario
- Avatar: `w-8 h-8 rounded-full bg-white/10 text-white/60` (primera letra del nombre)
- Nombre: `text-white/80 text-sm font-medium`
- Email: `text-white/40 text-xs`
- Logout: `text-white/40 hover:text-white/60`
- Divisor: `border-t border-white/10`

### Badges de estado
- `rounded-full px-3 py-1 text-xs font-medium`

### Tablas
- Encabezados: `text-text-muted text-xs font-medium uppercase tracking-wider`
- Celdas: `text-text-body text-sm`
- Filas alternadas: opcional vía `even:bg-bg-page`

### Indicador de carga
- Spinner SVG con `animate-spin` (rotación infinita)

### Secciones colapsables
- **Botón header** con `w-full flex items-center justify-between px-6 py-4 text-left hover:bg-bg-page transition-colors`
- Icono `ChevronDown` que rota `-rotate-90` cuando está colapsado
- Contenido con `border-t border-border px-6 py-4`
- Usado en: trabajos del periodo, ganancias empleados por trabajo

### Acordeón por empleado (ganancias)
- Cada empleado es un `rounded-lg border border-border overflow-hidden`
- Header clickeable con `flex items-center justify-between px-4 py-3 text-left hover:bg-bg-page transition-colors`
- Chevron que rota al abrir
- Tabla interna con `border-t border-border`

### DateInput (iOS placeholder fix)
- Wrapper `<div>` de `relative` con `<input type="date">`
- `<span>` superpuesto como placeholder (se oculta cuando hay valor)
- Clases: `absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-text-muted`
- Se oculta con `hidden` cuando el input tiene valor

### VinScanner
- **Modal** con video en vivo via `getUserMedia`
- Botón "Tomar foto": captura frame del video a un canvas
- Decodifica con `@zxing/library` `decodeFromImageUrl`
- No hay escaneo continuo — solo se decodifica al presionar el botón
- Input oculto de tipo file como fallback

---

## 6. Pantalla de Login — Diseño Específico

La pantalla de login es intencionalmente diferente al resto de la app:

- Fondo **completamente oscuro** (`bg-brand`) con tres esferas de glow saffron:
  - Centro: `w-[600px] h-[600px] rounded-full bg-accent/8 blur-3xl`
  - Top-right: `w-[400px] h-[400px] bg-accent/5 blur-3xl`
  - Bottom-left: `w-[400px] h-[400px] bg-accent/5 blur-3xl`
- Patrón de puntos tenue (`radial-gradient` con puntos blancos al 3% de opacidad)
- Tarjeta con efecto **glassmorphism** (`backdrop-blur-sm`, `bg-white/5`, `border-white/10`)
- Logo grande y glow, inputs transparentes sobre fondo oscuro
- **Sin enlace de registro** ni texto "ERP"

Esta ruptura visual marca el contraste entre "acceso" (experiencia profesional, premium) y "trabajo" (app funcional y clara).

---

## 7. Responsive

- **Mobile**: sidebar oculto, se abre con botón hamburger + overlay oscuro
- **Tablet/media**: sidebar visible en md+
- **Tablas**: `overflow-x-auto` en todos los listados (accounting, car jobs, invoices, employees)
- **Columnas ocultas**: DDDG y Ganancia ocultas en `<sm`, columnas empleados/Jefe ocultas en `<lg` (AccountingList)
- **Formularios**: stack vertical (`flex-col`) con inputs a ancho completo
- **Tarjetas de resumen**: grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` en detalle de periodo
- **Detalle de periodo**: grid `grid-cols-1 lg:grid-cols-2` para trabajos/gastos

---

## 8. Animaciones y Transiciones

| Elemento        | Efecto                          |
|-----------------|----------------------------------|
| Sidebar         | `translate-x` con `duration-200 ease-in-out` |
| Botones         | `transition-colors duration-200` |
| Inputs          | `transition-colors` en focus     |
| Botón submit    | `active:scale-[0.98]` (press)    |
| Spinner         | `animate-spin`                   |
| Chevron colapsable | `transition-transform` con `-rotate-90` |
| Modal backdrop  | no animación (aparece/desaparece instantáneo) |

Sin animaciones decorativas superfluas — solo las necesarias para feedback funcional.

---

## 9. Iconos

Librería: **lucide-react** (v0.x). Todos los iconos son inline SVGs, color heredado del texto padre.

| Página              | Iconos usados |
|---------------------|--------------------------------------------------|
| Sidebar             | `LayoutDashboard`, `Users`, `Car`, `Calculator`, `FileText`, `Settings`, `LogOut`, `X` |
| Login               | `Mail`, `Lock`, `Eye`, `EyeOff`, `ShieldOff` |
| Settings            | `Shield`, `ShieldOff`, `Key`, `Check`, `Plus`, `Trash2` |
| CarJobList          | `Plus`, `Pencil`, `Trash2`, `Search`, `FileDown`, `FileText`, `Camera` |
| EmployeeList        | `Pencil`, `Trash2`, `UserCheck`, `UserX`, `Plus`, `FileDown`, `Eye` |
| InvoiceList         | `Plus`, `FileDown`, `Trash2`, `Eye`, `Search` |
| AccountingDetail    | `ArrowLeft`, `Lock`, `RefreshCw`, `ChevronDown` |
| Dashboard           | `Filter` (botón Filtrar) |

---

## 10. Modales

- **Modal genérico** (`frontend/src/components/Modal.tsx`): backdrop oscuro `bg-black/40 backdrop-blur-sm`, tarjeta centrada `max-w-lg`, título con botón X, cierra con Escape o click fuera.
- **Responsivo en mobile:** `max-h-[70vh] overflow-y-auto`, `items-start sm:items-center`, `pt-10 sm:pt-0`, título con `truncate`.
- Usado en:
  - Detalle de trabajo (CarJobList): clic en fila
  - Selector mes/año PDF empleado (EmployeeList)
  - Generar factura desde trabajo (CarJobList)
  - Detalle de factura (InvoiceList)
  - Editar gasto fijo (SettingsView)
  - Escáner VIN (CarJobList)
- **Modal de generar factura:** formulario simple con nombre del cliente + resumen del trabajo seleccionado. Cierra automáticamente tras 2s al crear la factura exitosamente.
- **Modal de detalle de factura:** muestra cliente, fecha, lista de servicios con precios, total, y botón para descargar PDF.
- **Modal de escáner VIN:** video en vivo con botón "Tomar foto". Al decodificar, cierra y rellena el campo VIN.

---

## 11. Componentes de Página

### AccountingDetail (página de detalle de periodo)
- Breadcrumb "Volver a contabilidad"
- Header con número de periodo + fechas + badge abierto/cerrado
- Botones (si abierto): **Recalcular** (con spinner + texto "Recalculando...") y **Cerrar periodo** (con texto "Cerrando...")
- Ambos botones tienen `cursor-pointer` y `disabled` state (opacidad reducida, cursor not-allowed)
- Tarjetas resumen en grid 1/2/4 columnas: Ingresos, Gastos, DDDG, Ganancia, Neto, cada empleado, Jefe
- Grid 2 columnas en lg:
  - **Trabajos del periodo**: sección colapsable con tabla (fecha, VIN, descripción, pago)
  - **Gastos del periodo**: gastos fijos (solo lectura) + ExpenseEditor (editable si abierto)
- **Ganancias empleados por trabajo**: sección colapsable con acordeón por empleado
  - Cada empleado expandible: tabla con Trabajo, %, Ganancia

### Settings
- **Account section**: email, nombre, fecha creación, bloqueo (con botón desbloquear)
- **Cambiar contraseña**: formulario con contraseña actual + nueva
- **Fixed Expenses section**: lista de gastos fijos con nombre + monto mensual, botones editar/eliminar, botón agregar
  - Modal para crear/editar: nombre + monto

### Dashboard
- **Filtro de fechas**: inputs de fecha con botón "Filtrar" (icono `Filter`)
- **No se actualiza al cambiar fechas** — solo al presionar el botón
- **Carga por defecto**: mes actual
- Tarjetas de resumen: Ingresos, Gastos, Ganancia, Neto, Total Empleados, Jefe, Total Empleados individuales
- Gráfico de barras (ingresos vs gastos vs ganancia) + gráfico dona (distribución empleados)

---

## 12. PDFs

### Factura (invoice)
- **Formato:** ticket POS 80mm, 204pt ancho, Courier/CourierPrime
- **Colores:** solo #000 (negro), sin grises, sin colores
- **Fuente:** Courier 9pt mínimo, todo Helvetica-Bold
- **Logo:** centrado 200px, escala de grises via `sharp`. Opcional — si no existe el archivo `backend/assets/logo.PNG`, se omite.
- **Sin QR**
- **Teléfono:** 786 793 4440
- **Tabla de items:** solo fecha + monto (sin descripción, sin especificaciones de papel)
- **Total:** grande, prominente
- **Garantía:** texto simplificado en inglés
- **Botones:** "Ver factura" (ojo → inline en nueva pestaña con `?token=`), "Descargar" (download)
- Archivo: `backend/src/modules/invoices/services/invoiceService.ts`

### Empleado (employee payment PDF)
- **Mismo formato que factura:** 204pt ancho, Courier/CourierPrime, solo #000
- **Sin logo, sin QR, sin tagline, sin teléfono**
- **Encabezado:** "Windows Tinting" + "JD" (dos líneas separadas)
- **Contenido:** "Historial de pagos — {nombre}", mes, tabla FECHA | GANANCIA por periodo, total por periodo, total general
- **Ganancia:** solo fecha + monto (sin VIN, sin descripción del trabajo)
- **Footer:** "Generado por Tinting-JD"
- **Botones:** ojo (ver inline en nueva pestaña con `?token=`), descarga
- Archivo: `backend/src/modules/employees/services/pdfService.ts`

---

## 13. Tipos de Papel (CarJob)

Selector multi-checkbox con opciones en inglés:
- `Premium Film`
- `Ceramic Film`
- `Ultra Ceramic Film` (solar rejection 98%)
- `DOES NOT APPLY` (en mayúsculas)

---

## 14. Fuentes y Referencias

- Design tokens definidos en `frontend/src/app/globals.css` via `@theme` (Tailwind v4 CSS-based config)
- Tipografía cargada en `frontend/src/app/layout.tsx` con `next/font/google`
- Sidebar: `frontend/src/components/Sidebar.tsx`
- Login: `frontend/src/app/login/page.tsx`
- Settings: `frontend/src/app/settings/page.tsx`
- Modal: `frontend/src/components/Modal.tsx`
- DateInput: `frontend/src/components/DateInput.tsx`
- VinScanner: `frontend/src/components/VinScanner.tsx`
- CarJobList: `frontend/src/features/carJobs/CarJobList.tsx`
- EmployeeList: `frontend/src/features/employees/EmployeeList.tsx`
- InvoiceList: `frontend/src/features/invoices/InvoiceList.tsx`
- AccountingDetail: `frontend/src/app/accounting/[id]/page.tsx`
- AccountingList: `frontend/src/features/accounting/AccountingList.tsx`
- Dashboard: `frontend/src/features/dashboard/DashboardView.tsx`
- SettingsView: `frontend/src/features/settings/SettingsView.tsx`
- ExpenseEditor: `frontend/src/features/accounting/ExpenseEditor.tsx`
- Invoice PDF service: `backend/src/modules/invoices/services/invoiceService.ts`
- Employee PDF service: `backend/src/modules/employees/services/pdfService.ts`
- Invoice routes: `backend/src/modules/invoices/routes/invoiceRoutes.ts`
- Employee routes: `backend/src/modules/employees/routes/employeeRoutes.ts`
