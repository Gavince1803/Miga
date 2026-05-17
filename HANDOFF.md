# HANDOFF — Miga App

Documento de continuidad. Actualizar al final de cada sesión de trabajo.
Última actualización: 2026-05-17

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

---

## Lo que está local SIN commitear

Tres archivos modificados/nuevos que hay que commitear:

1. **`app/agenda.tsx`** (nuevo) — Agenda del Día
   - Vista operativa de pedidos de hoy
   - Ordena por `deliveryTime`, filtra cancelados
   - Cards con: hora chip, status badge, nombre cliente, descripción, acciones (Ver / Llamar / WhatsApp)
   - Progress pills: "X listas / Y pendientes"
   - Empty state con 🎉
   - NO es tab — se accede desde el stat card "Para Hoy" en home

2. **`app/(tabs)/index.tsx`** (modificado)
   - `StatCard` ahora acepta `onPress?: () => void`
   - Cuando tiene `onPress` → renderiza `TouchableOpacity` + chevron derecho
   - Stat card "Para Hoy" navega a `/agenda`
   - Importa `router` de expo-router

3. **`app/orders/[id].tsx`** (modificado)
   - Sección "Foto del Resultado" entre Payment y Delete button
   - Muestra imagen si `order.decorationImageUrl` existe, con hint "Cambiar foto"
   - Placeholder dashed si no hay foto, con spinner mientras sube
   - `handlePickPhoto(useCamera)` — pide permiso, comprime a 1200px JPEG 0.75, sube a bucket `order-photos`, actualiza DB y estado local
   - `handlePhotoOptions()` — alert con Cámara / Galería / Eliminar foto / Cancelar
   - Nuevos estilos: `photoPreview`, `photoChangeHint`, `photoChangeText`, `photoPlaceholder`, `photoPlaceholderText`

---

## Pendiente antes de hacer PR

- [ ] **Crear bucket `order-photos` en Supabase Storage** — lo hace el usuario en el dashboard
  - Políticas: INSERT y SELECT para usuarios autenticados
- [ ] Commitear los 3 archivos de arriba
- [ ] Hacer PR a `main`

---

## Backlog ordenado por impacto

| Feature | Por qué importa | Complejidad |
|---------|----------------|-------------|
| Export pedido como imagen/PDF | Compartir resumen al cliente por WhatsApp | Media |
| Gastos manuales | Caja de gastos generales, no solo inventario | Media |
| Notas internas por pedido | Timeline de cambios o comentarios del pedido | Baja |
| Búsqueda global | Por cliente + torta + fecha desde cualquier pantalla | Baja |
| Stats de recetas | Costo real vs precio vendido | Media |

---

## Arquitectura rápida

- **Framework**: React Native + Expo Router (file-based routing)
- **Backend**: Supabase (auth, DB, storage)
- **Design system**: `constants/Colors.ts` → `Colors`, `Spacing`, `Typography`, `BorderRadius`, `Shadows`
- **Theming**: `Colors[colorScheme ?? 'light']` en cada pantalla
- **Premium gate**: `useSubscription()` → `isPremium` → gate con `colors.primary` background
- **Rutas nuevas**: requieren `as any` cast hasta que Expo regenere los tipos
- **Fechas**: siempre `dateStr.split('-').map(Number)` → `new Date(y, m-1, d)` para evitar timezone shifts
- **Fotos**: `fetch(uri) → blob → supabase.storage.upload` funciona en React Native para `file://` URIs
- **Moneda**: `useSettings()` → `currency` → `CURRENCIES[currency].symbol`

---

## Convenciones del proyecto

- No agregar features no pedidas
- No comentar qué hace el código, solo el porqué si no es obvio
- Match del estilo existente
- Caveman mode activo en respuestas (terse, sin fluff)
