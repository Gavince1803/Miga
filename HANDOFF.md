# HANDOFF — Miga App

Documento de continuidad. Actualizar al final de cada sesión de trabajo.
Última actualización: 2026-05-18

---

## Branch activa

`feature/i18n-regional-settings` — base para todos los features nuevos de esta sesión.

---

## Lo que está commiteado y pusheado

| Commit | Feature |
|--------|---------|
| `ac1efcd` | Analytics premium (`app/(tabs)/analytics.tsx` + `hooks/useAnalytics.ts`) |
| `057ef1b` | Modal historial de cliente enriquecido: stats 2×2 + botón "Pedir de nuevo" + pre-fill `/orders/new` |
| `2b3a315` | Cartera de clientes: tab `Clientes`, `app/(tabs)/clients.tsx`, `app/clients/detail.tsx`, `hooks/useClients.ts`, `hooks/useClientDetail.ts` |
| `1730045` | Agenda del día (`app/agenda.tsx`) + stat card "Para Hoy" navegable en home + foto del pedido en standby + export PDF |

---

## Estado actual del código

### Export PDF / Compartir pedido (`app/orders/[id].tsx`)
- Botón `share-alt` en el header derecho del detalle del pedido
- `handleSharePDF()` genera HTML estilizado → PDF con `expo-print` → share nativo con `expo-sharing`
- El PDF incluye: entrega, producto, descripción, precio, método de pago, foto si existe, footer con fecha
- `expo-print` instalado (`~15.0.8`)

### Foto del pedido — STANDBY (`app/orders/[id].tsx`)
- Código comentado con marcadores `// STANDBY: foto del pedido`
- Requiere crear bucket `order-photos` en Supabase Storage antes de activar
- Políticas necesarias: INSERT y SELECT para usuarios autenticados
- 5 lugares comentados: imports ImageManipulator/ImagePicker, import Image RN, estado `uploadingPhoto`, funciones `handlePickPhoto`/`handlePhotoOptions`, sección JSX

### Agenda del Día (`app/agenda.tsx`)
- NO es tab — accesible desde stat card "Para Hoy" en home (`router.push('/agenda')`)
- Filtra pedidos del día, excluye cancelados, ordena por `deliveryTime`
- Cards: hora chip, status badge, cliente, descripción, Ver / Llamar / WhatsApp
- Pills de progreso: "X listas / Y pendientes"

---

## Pendiente antes de hacer PR

- [ ] Hacer PR de `feature/i18n-regional-settings` → `main`
- [ ] (Opcional) Crear bucket `order-photos` en Supabase Storage para activar feature de foto

---

## Backlog ordenado por impacto

| Feature | Por qué importa | Complejidad | Estado |
|---------|----------------|-------------|--------|
| Gastos manuales | Caja de gastos generales, no solo inventario | Media | Pendiente |
| Notas internas por pedido | Comentarios/notas privadas en el detalle del pedido | Baja | Pendiente |
| Búsqueda global | Por cliente + torta + fecha desde cualquier pantalla | Baja | Pendiente |
| Stats de recetas | Costo real vs precio vendido | Media | Pendiente |
| Foto del pedido | Ya codificado, solo falta bucket Supabase | Baja | STANDBY |

---

## Arquitectura rápida

- **Framework**: React Native + Expo Router (file-based routing)
- **Backend**: Supabase (auth, DB, storage)
- **Design system**: `constants/Colors.ts` → `Colors`, `Spacing`, `Typography`, `BorderRadius`, `Shadows`
- **Theming**: `Colors[colorScheme ?? 'light']` en cada pantalla
- **Premium gate**: `useSubscription()` → `isPremium` → pantalla bloqueada con lista de features
- **Rutas nuevas**: requieren `as any` cast hasta que Expo regenere los tipos
- **Fechas**: siempre `dateStr.split('-').map(Number)` → `new Date(y, m-1, d)` para evitar timezone shifts
- **Moneda**: `useSettings()` → `currency` → `CURRENCIES[currency].symbol`
- **Business name**: NO está persistido (solo `console.log` en settings.tsx) — usar "Miga" como fallback

---

## Convenciones del proyecto

- No agregar features no pedidas
- No comentar qué hace el código, solo el porqué si no es obvio
- Match del estilo existente
- Caveman mode activo en respuestas (terse, sin fluff)
