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

### Páginas interiores (dashboard layout)
- **Contenedor**: margen izquierdo igual al sidebar (`md:ml-56`) + `p-6` o `px-6 pb-8`
- **Ancho máximo formularios**: `max-w-2xl` (672px centrado)
- **Tablas**: `overflow-x-auto` con scroll horizontal en mobile

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

Esta ruptura visual marca el contraste entre "acceso" (experiencia profesional, premium) y "trabajo" (app funcional y clara).

---

## 7. Responsive

- **Mobile**: sidebar oculto, se abre con botón hamburger + overlay oscuro
- **Tablet/media**: sidebar visible en md+
- **Tablas**: `overflow-x-auto` en todos los listados
- **Formularios**: stack vertical (`flex-col`) con inputs a ancho completo
- **Tarjetas**: `max-w-2xl mx-auto` para centrar en pantallas grandes

---

## 8. Animaciones y Transiciones

| Elemento        | Efecto                          |
|-----------------|----------------------------------|
| Sidebar         | `translate-x` con `duration-200 ease-in-out` |
| Botones         | `transition-colors duration-200` |
| Inputs          | `transition-colors` en focus     |
| Botón submit    | `active:scale-[0.98]` (press)    |
| Spinner         | `animate-spin`                   |

Sin animaciones decorativas superfluas — solo las necesarias para feedback funcional.

---

## 9. Iconos

Librería: **lucide-react** (v0.x). Todos los iconos son inline SVGs, color heredado del texto padre.

| Página         | Iconos usados                                    |
|----------------|--------------------------------------------------|
| Sidebar        | `LayoutDashboard`, `Users`, `Car`, `Calculator`, `FileText`, `Settings`, `LogOut`, `X` |
| Login          | `Mail`, `Lock`, `Eye`, `EyeOff`, `ShieldOff`     |
| Settings       | `Shield`, `ShieldOff`, `Key`, `Check`            |
| CarJobList     | `Plus`, `Pencil`, `Trash2`, `Search`, `FileDown`, `FileText` |
| EmployeeList   | `Pencil`, `Trash2`, `UserCheck`, `UserX`, `Plus`, `FileDown` |
| InvoiceList    | `Plus`, `FileDown`, `Trash2` |

## 11. Modales

- **Modal genérico** (`frontend/src/components/Modal.tsx`): backdrop oscuro `bg-black/40 backdrop-blur-sm`, tarjeta centrada `max-w-lg`, título con botón X, cierra con Escape o click fuera.
- Usado en: detalle de trabajo (CarJobList), selector mes/año PDF (EmployeeList), generar factura desde trabajo (CarJobList), detalle de factura (InvoiceList).
- **Modal de generar factura:** formulario simple con nombre del cliente + resumen del trabajo seleccionado. Cierra automáticamente tras 2s al crear la factura exitosamente.
- **Modal de detalle de factura:** muestra cliente, fecha, lista de servicios con precios, total, y botón para descargar PDF.

---

## 12. Fuentes y Referencias

- Design tokens definidos en `frontend/src/app/globals.css` via `@theme` (Tailwind v4 CSS-based config)
- Tipografía cargada en `frontend/src/app/layout.tsx` con `next/font/google`
- Sidebar: `frontend/src/components/Sidebar.tsx`
- Login: `frontend/src/app/login/page.tsx`
- Settings: `frontend/src/app/settings/page.tsx`
- Modal: `frontend/src/components/Modal.tsx`
- CarJobList: `frontend/src/features/carJobs/CarJobList.tsx`
- EmployeeList: `frontend/src/features/employees/EmployeeList.tsx`
- InvoiceList: `frontend/src/features/invoices/InvoiceList.tsx`
- Invoice PDF service: `backend/src/modules/invoices/services/invoiceService.ts`
- Invoice routes: `backend/src/modules/invoices/routes/invoiceRoutes.ts`


