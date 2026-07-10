# SPRINTS — Plan de implementación Miga

Derivado de `ANALISIS-PROYECTO.md` (2026-07-03). Cada tarea está descompuesta para que un agente la ejecute sin adivinar: archivos exactos, columnas exactas, pasos ordenados y criterios de aceptación verificables.

---

## Convenciones obligatorias (leer antes de cualquier tarea)

Estas reglas aplican a TODAS las tareas. Vienen de `HANDOFF.md` y del código existente:

1. **DB en snake_case, app en camelCase.** El mapeo se hace dentro del hook (ver `hooks/useOrders.ts:34-59` como referencia canónica). Nunca exponer snake_case a componentes.
2. **Sesión**: siempre `const { data: { session } } = await supabase.auth.getSession()` y early-return si no hay sesión. Nunca asumir usuario logueado.
3. **Alerts**: usar `const { showAlert } = useAlert()` de `context/AlertContext.tsx` con `{ title, message, type: 'error' | 'success' | 'warning' }`. Nunca `Alert.alert` de RN.
4. **Theming**: `const colorScheme = useColorScheme(); const colors = Colors[colorScheme ?? 'light'];` + `Spacing`, `Typography`, `BorderRadius`, `Shadows` de `constants/Colors.ts`. Toda pantalla nueva debe verse bien en dark mode.
5. **Fechas**: `delivery_date` se guarda como string `YYYY-MM-DD`. Para parsear a `Date`: `const [y, m, d] = dateStr.split('-').map(Number); new Date(y, m - 1, d)`. NUNCA `new Date(dateStr)` (produce shift de timezone).
6. **Moneda**: `const { currency } = useSettings(); const symbol = CURRENCIES[currency].symbol;` de `context/SettingsContext.tsx`.
7. **Premium gate**: `const { isPremium } = useSubscription();` → si feature es premium y `!isPremium`, renderizar pantalla de gate con lista de features + botón a `/premium` (copiar patrón de `app/(tabs)/analytics.tsx` o `finances.tsx`).
8. **Rutas nuevas**: `router.push('/ruta' as any)` hasta que Expo regenere tipos.
9. **Migraciones**: en `supabase/migrations/`, numeración secuencial. La última es `020_add_currency_to_profiles.sql` → la próxima empieza en `021_`. Toda tabla nueva lleva RLS habilitado con políticas por `user_id = auth.uid()`.
10. **No agregar features no pedidas. Match del estilo existente. Comentarios solo para el porqué no obvio.**

Tablas existentes relevantes (columnas confirmadas en código):
- `orders`: `id, user_id, order_number, client_name, client_phone, address, delivery_date, delivery_time, size, servings, filling, cover, occasion, cake_type, description, total_price, deposit_amount, payment_method, payment_status, status, reminder_days, created_at, updated_at`
- `inventory_items`: `id, user_id, name, quantity, unit, min_stock, cost_per_unit, category, is_archived, last_updated, created_at`
- `inventory_movements`: `id, user_id, inventory_item_id, order_id, movement_type, quantity, notes, created_at` (`movement_type: 'deduccion' | 'agregado' | 'ajuste' | 'importacion'`)
- `order_items`: `id, order_id, quantity, recipe_id, product_name`
- `recipe_ingredients`: `recipe_id, inventory_item_id, quantity, unit`
- `profiles`: `id, currency, ...` (campos premium en migración 012)
- `options_dictionary`: `user_id, category, value` (unique en los tres)

---

# SPRINT 0 — Blindaje (estabilidad y seguridad)

> Objetivo: que escalar usuarios no queme dinero (API key), no rompa confianza (regresiones en lógica de dinero) y que los crashes sean visibles. **Ningún feature nuevo hasta cerrar este sprint.**

## S0.1 — Integrar Sentry

**Objetivo**: visibilidad de crashes y errores JS en producción.

**Archivos**: `app/_layout.tsx` (modificar), `app.json` (modificar), `package.json`.

**Pasos**:
1. `npx expo install @sentry/react-native`.
2. Crear proyecto en sentry.io tipo React Native → obtener DSN. El DSN va en `.env` como `EXPO_PUBLIC_SENTRY_DSN` (el DSN de Sentry es público por diseño, no es secreto).
3. En `app/_layout.tsx`, antes del componente root:
   ```ts
   import * as Sentry from '@sentry/react-native';
   Sentry.init({
     dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
     enabled: !__DEV__,
     tracesSampleRate: 0.2,
   });
   ```
   y envolver el export default: `export default Sentry.wrap(RootLayout);`.
4. Agregar el plugin en `app.json` → `expo.plugins`: `"@sentry/react-native/expo"` con `organization` y `project` (para upload de sourcemaps en EAS build).
5. Reemplazar los `console.error` de los catch en hooks críticos (`useOrders`, `useInventory`, `useFinances`, `useSubscription`) por `console.error(...)` + `Sentry.captureException(error)`. No tocar la lógica de los catch.
6. Identificar usuario tras login: en `context/AuthContext.tsx`, dentro del listener de auth, `Sentry.setUser({ id: session.user.id })` al loguear y `Sentry.setUser(null)` al desloguear. NO enviar email (privacidad).

**Aceptación**:
- [ ] Build de dev: lanzar `Sentry.captureMessage('test')` desde settings y verlo en el dashboard.
- [ ] Un `throw` forzado en un hook aparece en Sentry con user id.
- [ ] `enabled: !__DEV__` → no hay eventos desde Expo Go / dev client.

---

## S0.2 — Mover Gemini a Supabase Edge Function

**Objetivo**: eliminar `EXPO_PUBLIC_GEMINI_API_KEY` del bundle. La key vive solo en el servidor.

**Archivos**: crear `supabase/functions/gemini-ocr/index.ts`; modificar `lib/ocr.ts`; limpiar `.env.example` y `README.md`.

**Pasos**:
1. Crear la Edge Function:
   ```
   supabase functions new gemini-ocr
   ```
   Contenido de `supabase/functions/gemini-ocr/index.ts`:
   - Recibe POST JSON: `{ imageBase64: string, mimeType: string, prompt: string }`.
   - Valida JWT: la función corre con `verify_jwt = true` (default). Además, dentro de la función, crear cliente supabase con el header Authorization entrante y llamar `supabase.rpc('check_premium_status')` — si `!data.is_premium`, responder 403 `{ error: 'PREMIUM_REQUIRED' }`. (El OCR es feature premium; esto además refuerza el gate del lado servidor.)
   - Límite de tamaño: si `imageBase64.length > 4_500_000` (~3.3MB decodificado), responder 413.
   - Llama a `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}` con el mismo body que hoy arma `lib/ocr.ts:67-74` (`contents[0].parts = [{text: prompt}, {inline_data: {mime_type, data}}]`).
   - Devuelve `{ text: extractedText }` o `{ error: ... }` con el status correspondiente. No loguear el base64.
2. Setear el secreto: `supabase secrets set GEMINI_API_KEY=<key>` y deploy: `supabase functions deploy gemini-ocr`.
3. Modificar `lib/ocr.ts` → `extractTextFromImage()`:
   - Mantener firma pública idéntica (`(imageUri, inventoryItems) => Promise<string | null>`) para no tocar a los llamadores (`app/recipes/scan.tsx`).
   - El armado del prompt (líneas 33-65) queda igual, en el cliente.
   - Reemplazar el `fetch` directo a Gemini por:
     ```ts
     const { data, error } = await supabase.functions.invoke('gemini-ocr', {
       body: { imageBase64: base64Image, mimeType: 'image/jpeg', prompt },
     });
     if (error || data?.error) { console.error(...); return null; }
     return data.text.replace(/```json/g, '').replace(/```/g, '').trim();
     ```
   - Eliminar `GEMINI_API_KEY` y `API_URL` del archivo.
4. Quitar `EXPO_PUBLIC_GEMINI_API_KEY` de `.env.example`, `README.md` (sección env vars) y de los secrets de EAS. **Rotar la key vieja en Google AI Studio** (ya está quemada en binarios distribuidos).
5. `parseRecipeText()` no se toca.

**Aceptación**:
- [ ] `grep -r "EXPO_PUBLIC_GEMINI" .` (fuera de node_modules) → 0 resultados.
- [ ] Scan de receta con usuario premium funciona igual que antes (flujo completo en `app/recipes/scan.tsx`).
- [ ] Usuario free llamando la función directamente (curl con su JWT) recibe 403.
- [ ] Request sin JWT recibe 401.

---

## S0.3 — Suite de tests para lógica de dinero e inventario

**Objetivo**: red de seguridad automatizada sobre lo que no puede romperse: conversión de unidades, deducción de inventario, cálculos financieros.

**Archivos**: `package.json` (jest config + script), crear `lib/__tests__/units.test.ts`, `lib/__tests__/inventoryDeduction.test.ts`, `hooks/__tests__/analytics.test.ts`.

**Pasos**:
1. Setup: `npx expo install jest-expo jest @types/jest --dev`. En `package.json`:
   ```json
   "scripts": { ..., "test": "jest" },
   "jest": { "preset": "jest-expo", "transformIgnorePatterns": ["node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@supabase/.*|@sentry/.*)" ] }
   ```
2. `lib/__tests__/units.test.ts` — testear `convertValue` (función pura, sin mocks):
   - `convertValue(1, 'kg', 'g') === 1000`; `convertValue(500, 'g', 'kg') === 0.5`
   - `convertValue(2, 'L', 'ml') === 2000`; `convertValue(1, 'ml', 'ml') === 1`
   - Incompatibles: `convertValue(1, 'kg', 'L') === null`; `convertValue(1, 'u', 'g') === null`
   - Unidad desconocida: `convertValue(1, 'taza', 'g') === null` (documenta el comportamiento actual: `cda`/`taza` de `UNIT_OPTIONS` no existen en `CONVERSION_RATES` — si esto falla como esperado, es un bug conocido: ver tarea S0.6).
3. `lib/__tests__/inventoryDeduction.test.ts` — mockear `@/lib/supabase` con `jest.mock`. El mock debe simular la cadena `supabase.from(x).select(...).eq(...)`. Casos:
   - Orden sin `order_items` → `{ success: true, deductedItems: [], errors: [] }`.
   - Item con receta de 2 ingredientes compatibles → 2 updates a `inventory_items` con `quantity = max(0, stock - necesario)` y 2 inserts en `inventory_movements` con `movement_type: 'deduccion'` y quantity negativa.
   - Ingrediente en `kg` con inventario en `g` → deduce convertido (0.5 kg → 500 g).
   - Ingrediente en `kg` con inventario en `L` → entra en `errors` con mensaje "Unidades incompatibles", NO actualiza inventario.
   - Stock insuficiente (necesita 500, hay 200) → update deja quantity en 0, no negativa.
   - `formatDeductionMessage`: null si ambas listas vacías; `type: 'warning'` si hay errores; `type: 'success'` si solo deducciones.
4. `hooks/__tests__/analytics.test.ts` — extraer primero la lógica de cálculo de `hooks/useAnalytics.ts` a funciones puras exportadas (agrupación por mes, top productos, top clientes, ticket promedio) SI aún están inline; si ya son puras, testear directo:
   - Ticket promedio con 0 pedidos → 0, no NaN.
   - 6 meses exactos incluyendo el actual; meses sin datos → 0.
   - Agrupación top-5 por `cake_type` ordena descendente.
5. Correr `npm test` → todo verde. Si el test de `taza`/`cda` revela el bug, NO arreglarlo aquí — documentarlo y pasa a S0.6.

**Aceptación**:
- [ ] `npm test` verde en local.
- [ ] Cobertura de `lib/units.ts` y `lib/inventoryDeduction.ts` ≥ 90% líneas.
- [ ] Ningún cambio de comportamiento en runtime (solo se permite extraer funciones puras de `useAnalytics` sin alterar resultados).

---

## S0.4 — Límites free tier del lado del servidor

**Objetivo**: que los límites de `FREE_TIER_LIMITS` (`hooks/useSubscription.ts:140-147`: 10 pedidos/mes, 20 items inventario, 5 recetas) se apliquen aunque el cliente esté modificado.

**Archivos**: crear `supabase/migrations/021_server_side_free_limits.sql`.

**Pasos**:
1. Crear función SQL `is_premium(uid uuid) returns boolean` que replique la lógica de la RPC `check_premium_status` existente (leer migración `012_subscription_system.sql` para conocer las columnas exactas de premium en `profiles` — usar las mismas). Marcarla `security definer, stable`.
2. Crear trigger `BEFORE INSERT ON orders`:
   ```sql
   create or replace function enforce_order_limit() returns trigger as $$
   begin
     if not is_premium(new.user_id) then
       if (select count(*) from orders
           where user_id = new.user_id
             and created_at >= date_trunc('month', now())) >= 10 then
         raise exception 'FREE_LIMIT_ORDERS' using errcode = 'P0001';
       end if;
     end if;
     return new;
   end; $$ language plpgsql security definer;
   ```
   Triggers análogos para `inventory_items` (≥ 20, contando solo `is_archived = false`) con `FREE_LIMIT_INVENTORY`, y `recipes` (≥ 5) con `FREE_LIMIT_RECIPES`.
3. Los límites (10/20/5) deben coincidir EXACTAMENTE con `FREE_TIER_LIMITS`. Dejar comentario en ambos lados: `-- keep in sync with hooks/useSubscription.ts FREE_TIER_LIMITS`.
4. Cliente: en los catch de `createOrder` (`hooks/useOrders.ts:165`), del create de inventario (`hooks/useInventory.ts`) y de recetas (`hooks/useRecipes.ts`), detectar `error.message?.includes('FREE_LIMIT')` y mostrar el mismo alert de límite que ya muestra el chequeo client-side (con botón a `/premium`). El chequeo client-side existente NO se elimina (evita el round-trip en el caso común).
5. Aplicar migración en el proyecto Supabase (`supabase db push` o SQL editor).

**Aceptación**:
- [ ] Con usuario free y 10 pedidos ya creados este mes, un INSERT directo por API REST de Supabase (curl con anon key + JWT del usuario) falla con `FREE_LIMIT_ORDERS`.
- [ ] Usuario premium no tiene límite.
- [ ] El flujo normal de la app (crear pedido 11 siendo free) muestra el alert de upgrade, no un error genérico.

---

## S0.5 — Símbolos de moneda correctos + persistir nombre del negocio

**Objetivo**: dos deudas pequeñas de confianza. Reportes distinguibles por moneda; nombre del negocio guardado de verdad (hoy solo hace `console.log`, ver HANDOFF).

**Archivos**: `context/SettingsContext.tsx`, `app/(tabs)/settings.tsx`, crear `supabase/migrations/022_add_business_name_to_profiles.sql`.

**Pasos**:
1. En `context/SettingsContext.tsx`, actualizar `CURRENCIES`:
   ```ts
   VES: { symbol: 'Bs.', label: 'Bolívares (VES)' },
   USD: { symbol: '$',   label: 'Dólares (USD)' },
   MXN: { symbol: 'MX$', label: 'Pesos Mexicanos (MXN)' },
   ARS: { symbol: 'AR$', label: 'Pesos Argentinos (ARS)' },
   COP: { symbol: 'CO$', label: 'Pesos Colombianos (COP)' },
   CLP: { symbol: 'CL$', label: 'Pesos Chilenos (CLP)' },
   ```
   Buscar con `grep -rn "CURRENCIES\[" app components` todos los puntos de render y verificar que ninguno asuma símbolo de 1 carácter (paddings/anchos fijos).
2. Migración `022`:
   ```sql
   alter table profiles add column if not exists business_name text;
   alter table profiles add column if not exists business_phone text;
   ```
3. Extender `SettingsContext` con `businessName: string`, `updateBusinessName(name: string)` siguiendo EXACTAMENTE el patrón de `currency`/`updateCurrency` (carga en `loadSettings` con `select('currency, business_name, business_phone')`, update optimista).
4. En `app/(tabs)/settings.tsx`, conectar el input de nombre del negocio (hoy termina en `console.log`) a `updateBusinessName`. Igual para teléfono si el campo existe.
5. Donde haya fallback `"Miga"` como business name (buscar `grep -rn '"Miga"' app`), usar `businessName || 'Miga'`.

**Aceptación**:
- [ ] Cambiar moneda a COP → home, finanzas y detalle de pedido muestran `CO$`.
- [ ] Guardar nombre de negocio, cerrar app, reabrir → persiste.
- [ ] QA.md sección 8 ítem "Nombre y teléfono del negocio se guardan" pasa.

---

## S0.6 — Fix: unidades de cocina (`cda`, `taza`) no convertibles

**Objetivo**: `UNIT_OPTIONS` en `types/index.ts:170-178` ofrece `cda` y `taza`, pero `lib/units.ts` no las conoce → `convertValue` devuelve `null` y la deducción de inventario falla silenciosamente como "unidades incompatibles".

**Archivos**: `lib/units.ts`, actualizar `lib/__tests__/units.test.ts`.

**Pasos**:
1. Agregar a `CONVERSION_RATES` y `UNIT_TYPES` en `lib/units.ts`:
   ```ts
   'cda': 15,    // volume, 1 cucharada = 15 ml
   'taza': 240,  // volume, 1 taza = 240 ml
   ```
   ambas como `'volume'`.
2. Actualizar tests de S0.3: `convertValue(1, 'taza', 'ml') === 240`, `convertValue(4, 'cda', 'ml') === 60`, `convertValue(1, 'taza', 'L') === 0.24`.
3. Nota: la conversión cda/taza→masa (g) sigue siendo `null` (correcto: depende de densidad). El mensaje de error existente en `inventoryDeduction` ya lo cubre.

**Aceptación**:
- [ ] Receta con ingrediente en `taza` deduce inventario en `ml`/`L` correctamente.
- [ ] Tests verdes.

---

# SPRINT 1 — Cobro y WhatsApp (retención)

> Objetivo: monetizar el canal donde ya viven las usuarias. Todo con datos que ya existen.

## S1.1 — Comprobante de pedido con branding (PDF v2)

**Objetivo**: el PDF de `handleSharePDF` (`app/orders/[id].tsx:320-433`) pasa de nota interna a comprobante presentable para el cliente final, con branding del negocio.

**Depende de**: S0.5 (business name persistido).

**Archivos**: crear `lib/orderPdf.ts`; modificar `app/orders/[id].tsx`.

**Pasos**:
1. Extraer la generación de HTML de `handleSharePDF` a `lib/orderPdf.ts`:
   ```ts
   export function buildOrderReceiptHtml(params: {
     order: Order;
     businessName: string;
     businessPhone?: string;
     currencySymbol: string;
   }): string
   ```
   El HTML actual sirve de base; rediseñar con: header con `businessName` prominente + teléfono, número de pedido (`order.orderNumber`), bloque cliente (nombre/teléfono/dirección), bloque producto (tipo, tamaño, relleno, cubierta, ocasión, porciones, descripción), bloque pago con tres filas — Total, Abonado (`depositAmount`), **Restante** (`totalPrice - depositAmount`) resaltado si > 0 —, fecha/hora de entrega destacada, footer "Generado con Miga" (loop viral, no quitar).
2. Usar `Intl.NumberFormat('es', { minimumFractionDigits: 2 })` para montos + `currencySymbol` del parámetro.
3. En `app/orders/[id].tsx`, `handleSharePDF` queda: obtener `businessName` de `useSettings()`, llamar `buildOrderReceiptHtml`, `Print.printToFileAsync({ html })`, `Sharing.shareAsync(uri)` — igual que hoy.
4. Test unitario `lib/__tests__/orderPdf.test.ts`: el HTML contiene nombre del negocio, restante calculado correcto, y montos formateados; con `depositAmount === totalPrice` no muestra bloque "Restante".

**Aceptación**:
- [ ] Compartir PDF desde detalle de pedido → documento con branding, restante correcto, moneda correcta.
- [ ] Pedido sin dirección/ocasión → esas filas no aparecen (sin "undefined").
- [ ] Tests verdes.

---

## S1.2 — Recordatorios de cobro

**Objetivo**: superficie que lista pedidos con saldo pendiente y permite reclamar el pago por WhatsApp con mensaje pre-armado.

**Archivos**: crear `app/cobros.tsx`, crear `hooks/usePendingPayments.ts`; modificar `app/(tabs)/index.tsx` (stat card navegable).

**Pasos**:
1. `hooks/usePendingPayments.ts`:
   - Query: `supabase.from('orders').select('*').eq('user_id', session.user.id).neq('status', 'cancelado').neq('payment_status', 'pagado').order('delivery_date', { ascending: true })`.
   - Mapear a `Order[]` (patrón de `useOrders.ts:34-59`) y calcular por pedido `pendingAmount = totalPrice - depositAmount`; filtrar `pendingAmount > 0`.
   - Exponer `{ pendingOrders, totalPending, loading, refreshing, onRefresh }`.
2. `app/cobros.tsx` (NO es tab; patrón de `app/agenda.tsx`):
   - Header con total pendiente de cobro grande.
   - Card por pedido: cliente, descripción/cakeType, fecha de entrega con urgency color (mismo esquema del home: rojo hoy/mañana, naranja 2-3 días, verde futuro), monto restante, botones **Ver** (`router.push('/orders/' + id)`) y **WhatsApp**.
   - Botón WhatsApp: `Linking.openURL('https://wa.me/' + phoneDigits + '?text=' + encodeURIComponent(msg))` donde `phoneDigits = clientPhone.replace(/\D/g, '')` y
     ```
     msg = `¡Hola ${clientName}! 😊 Te escribo de ${businessName} para recordarte que tu pedido para el ${fechaLegible} tiene un saldo pendiente de ${symbol}${pendingAmount.toFixed(2)}. ¡Gracias!`
     ```
     Copiar el manejo de WhatsApp existente en `app/orders/[id].tsx` (ya hay botón WhatsApp ahí — reutilizar su helper; si está inline, extraerlo a `lib/whatsapp.ts` como `openWhatsApp(phone: string, message: string)` y usarlo en ambos lugares).
   - Empty state: "🎉 Nada pendiente de cobro".
3. En home (`app/(tabs)/index.tsx`): la stat card "pendientes de cobro" ya existe (QA sección 1) — hacerla navegable con `router.push('/cobros' as any)`, patrón idéntico a la card "Para Hoy" → `/agenda`.

**Aceptación**:
- [ ] Pedido con abono parcial aparece en `/cobros` con restante correcto; pagado o cancelado no aparece.
- [ ] Botón WhatsApp abre chat con mensaje pre-armado con monto y moneda correctos.
- [ ] Card del home navega a `/cobros`.
- [ ] Dark mode correcto.

---

## S1.3 — Gastos manuales

**Objetivo**: registrar gastos que no son de inventario (gas, delivery, empaques). Hoy `hooks/useFinances.ts` deriva gastos solo de `inventory_movements` → Finanzas subestima gastos reales.

**Archivos**: crear `supabase/migrations/023_expenses.sql`, crear `hooks/useExpenses.ts`, modificar `hooks/useFinances.ts` y `app/(tabs)/finances.tsx`.

**Pasos**:
1. Migración `023`:
   ```sql
   create table expenses (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     description text not null,
     amount numeric not null check (amount > 0),
     category text not null default 'otro', -- 'ingredientes'|'empaques'|'transporte'|'servicios'|'equipos'|'otro'
     expense_date date not null default current_date,
     created_at timestamptz not null default now()
   );
   alter table expenses enable row level security;
   create policy "own expenses" on expenses for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);
   create index expenses_user_date on expenses(user_id, expense_date);
   ```
2. `hooks/useExpenses.ts`: CRUD estándar (patrón `useOrders`): `fetchExpenses(month: Date)` filtrando `expense_date` entre inicio y fin de mes (`gte`/`lte` con strings `YYYY-MM-DD`), `createExpense`, `deleteExpense`. Tipo `Expense` en `types/index.ts` (camelCase: `id, description, amount, category, expenseDate, createdAt`).
3. En `hooks/useFinances.ts`: sumar los gastos manuales del mes al total de gastos existente y agregar los expenses a la lista de movimientos recientes (distinguibles por un campo `source: 'inventario' | 'manual'`). Revisar cómo arma hoy los movimientos (líneas ~56-220) y mantener el shape que consume `finances.tsx`.
4. UI en `app/(tabs)/finances.tsx`:
   - FAB o botón "+ Gasto" → modal con: descripción (requerido), monto (teclado numérico, requerido, > 0), categoría (chips con las 6 categorías), fecha (default hoy, `DateTimePickerField` existente).
   - En la lista de movimientos, los gastos manuales muestran su categoría; tocar → alert con opción "Eliminar" (patrón de revertir gasto existente, pero aquí es delete directo de `expenses`).
5. Los gastos manuales entran al cálculo de Balance y % margen del mes.

**Aceptación**:
- [ ] Crear gasto → aparece en movimientos y baja el balance del mes correcto (según `expense_date`, no `created_at`).
- [ ] Eliminar gasto → desaparece y balance se recalcula.
- [ ] Gasto de inventario sigue funcionando + revertir sigue funcionando (regresión QA sección 6).
- [ ] Usuario free: Finanzas ya es premium — sin cambios de gate.

---

## S1.4 — Modal de feedback (una vez) + embudo de reseña

**Objetivo**: capturar feedback cualitativo de los ~190 usuarios en la próxima update. Un solo prompt por usuario, disparado tras un momento de éxito, con embudo: contentos → reseña en tienda, descontentos → feedback interno. Acceso permanente adicional desde Settings.

**Archivos**: crear `supabase/migrations/0XX_feedback.sql` (usar el siguiente número libre al implementar), crear `components/FeedbackModal.tsx`, crear `hooks/useFeedbackPrompt.ts`; modificar `app/orders/[id].tsx`, `app/(tabs)/settings.tsx`, `context/SettingsContext.tsx`.

**Pasos**:
1. Migración:
   ```sql
   create table feedback (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     category text not null, -- 'pedidos'|'inventario'|'finanzas'|'precios'|'otro'
     message text,
     allow_contact boolean not null default false,
     created_at timestamptz not null default now()
   );
   alter table feedback enable row level security;
   create policy "own feedback insert" on feedback for insert
     with check (auth.uid() = user_id);
   create policy "own feedback select" on feedback for select
     using (auth.uid() = user_id);

   alter table profiles add column if not exists feedback_prompt_shown boolean not null default false;
   ```
   (El flag va en `profiles`, NO en AsyncStorage: debe sobrevivir reinstalación y cambio de teléfono.)
2. `npx expo install expo-store-review`.
3. `components/FeedbackModal.tsx` — modal con dos modos:
   - **Modo embudo** (`mode: 'prompt'`): paso 0 pregunta "¿Te está sirviendo Miga?" con 👍 / 👎.
     - 👍 → cerrar modal y llamar `StoreReview.requestReview()` de `expo-store-review` (el diálogo nativo de Apple/Google; el sistema decide si lo muestra — no garantizado, no insistir).
     - 👎 → avanza al formulario interno.
   - **Modo directo** (`mode: 'settings'`): salta el paso 0, va directo al formulario.
   - Formulario interno: chips single-select "¿Qué te gustaría mejorar?" (Pedidos / Inventario / Finanzas / Precios / Otra cosa), `TextInput` multiline opcional, checkbox "¿Podemos escribirte por WhatsApp para conversarlo?". Botón enviar → insert en `feedback` → `showAlert` de agradecimiento. Botón "Ahora no" siempre visible.
   - Estilo: card modal del design system (`Colors`, `BorderRadius`, `Shadows`), dark mode correcto.
4. `hooks/useFeedbackPrompt.ts`:
   - `shouldShowPrompt(): Promise<boolean>` → true solo si: `profiles.feedback_prompt_shown = false` **y** el usuario tiene ≥ 5 pedidos creados (`select count` a orders) — filtra usuarios nuevos sin contexto.
   - `markPromptShown()` → update `profiles.feedback_prompt_shown = true`. Se llama al MOSTRAR el modal, no al completarlo: una sola interrupción por usuario aunque lo cierre sin responder ("una sola vez" literal).
5. Trigger: en `app/orders/[id].tsx`, tras cambiar estado a `pagado` exitosamente (y después de que el alert de deducción de inventario se cierre, si apareció), llamar `shouldShowPrompt()` → si true, abrir el modal con delay de ~600ms y `markPromptShown()`. NUNCA disparar en cold start ni al abrir la app.
6. Settings: item "💬 Enviar sugerencia" en `app/(tabs)/settings.tsx` que abre el modal en `mode: 'settings'` — siempre disponible, sin flag.
7. (Manual, fuera de código) A quien deje mensaje detallado con `allow_contact = true`: contactar por WhatsApp y regalar mes premium con código de activación existente.

**Aceptación**:
- [ ] Usuario con ≥ 5 pedidos marca uno como pagado → modal aparece una única vez; cerrarlo sin responder y volver a pagar otro pedido → no reaparece.
- [ ] Usuario con < 5 pedidos → nunca ve el prompt.
- [ ] 👍 → intenta abrir el diálogo nativo de reseña; 👎 → formulario; enviar → fila en `feedback` con categoría y checkbox correctos.
- [ ] "Enviar sugerencia" en Settings funciona siempre, incluso con flag ya en true.
- [ ] Reinstalar la app con el mismo usuario → el prompt NO reaparece (flag en profiles).
- [ ] RLS: un usuario no puede leer feedback de otro.

---

# SPRINT 2 — Inventario sin fricción + detalle de pedido completo

## S2.1 — Scanner de facturas de proveedor → inventario

**Objetivo**: foto de factura → items parseados → actualizar/crear inventario. Reutiliza el pipeline Gemini de S0.2. (Feature ya planificado, ver memoria del proyecto.)

**Depende de**: S0.2 (Edge Function).

**Archivos**: crear `app/inventory/scan-invoice.tsx`, crear `lib/invoiceOcr.ts`; modificar `app/(tabs)/inventory.tsx` (entrada al flujo), `supabase/functions/gemini-ocr/index.ts` (nada — es genérica, recibe prompt).

**Pasos**:
1. `lib/invoiceOcr.ts`, siguiendo la estructura de `lib/ocr.ts`:
   - `extractInvoiceItems(imageUri: string, inventoryItems: {id, name, unit}[]): Promise<InvoiceParseResult | null>`.
   - Prompt (en el cliente, igual que ocr.ts): "Analyze this supplier invoice/receipt image" → JSON estricto:
     ```json
     {
       "items": [
         { "inventoryId": "uuid-o-new:Nombre", "name": "Harina de trigo", "quantity": 2, "unit": "kg", "totalPrice": 5.50 }
       ],
       "invoiceTotal": 23.40,
       "error": null
     }
     ```
     con las mismas reglas de fuzzy-match contra inventario que usa `ocr.ts:33-44` (match probable → uuid; sin match → `new:Nombre`). Si no es factura: `{ "error": "INVALID_IMAGE" }`.
   - Invocar `supabase.functions.invoke('gemini-ocr', ...)` y parsear con la misma estrategia defensiva de `parseRecipeText` (regex `/\{[\s\S]*\}/`, try/catch, arrays defensivos).
2. `app/inventory/scan-invoice.tsx` (registrar en `app/inventory/_layout.tsx`):
   - Gate premium (mismo patrón que scan de recetas — OCR es `canUseOCR: false` en free).
   - Paso 1: `expo-image-picker` cámara o galería (copiar configuración de `app/recipes/scan.tsx`, incluyendo `expo-image-manipulator` para reducir tamaño si scan.tsx lo hace).
   - Paso 2 (revisión — SIEMPRE, nunca aplicar directo): lista editable de items parseados. Por fila: nombre, cantidad (editable), unidad (dropdown `UNIT_OPTIONS`), precio total (editable), badge "Nuevo" si `inventoryId` empieza con `new:`, y switch para excluir la fila.
   - Paso 3 "Aplicar al inventario": por cada fila incluida:
     - Existente: `quantity = quantity + parsed.quantity` en `inventory_items`, actualizar `cost_per_unit = totalPrice / quantity` si vino precio, `last_updated = now()`.
     - Nueva: insert en `inventory_items` con `min_stock: 0`, `category: null`.
     - Insertar `inventory_movements` con `movement_type: 'agregado'`, quantity positiva, `notes: 'Factura escaneada - ' + name`.
     - Usar las funciones existentes de `hooks/useInventory.ts` si exponen add/update; si no, escribir los queries en el screen siguiendo su patrón.
   - Resultado: alert éxito con resumen (N actualizados, M creados) → `router.back()`.
3. Entrada: en `app/(tabs)/inventory.tsx`, junto a Importar Excel, botón "Escanear factura" con icono cámara.

**Aceptación**:
- [ ] Foto de factura real → items con match correcto contra inventario existente.
- [ ] Editar cantidad en revisión → se aplica el valor editado.
- [ ] Item nuevo se crea; existente suma stock; movimientos registrados como 'agregado'.
- [ ] Imagen que no es factura → alert claro, sin crash.
- [ ] Free → gate premium.

---

## S2.2 — Activar foto del pedido (código en STANDBY)

**Objetivo**: el código ya existe comentado en `app/orders/[id].tsx` con marcadores `// STANDBY: foto del pedido` (5 bloques: imports ImageManipulator/ImagePicker, import Image, estado `uploadingPhoto`, funciones `handlePickPhoto`/`handlePhotoOptions`, sección JSX). Solo falta el bucket.

**Archivos**: Supabase Dashboard (bucket), `app/orders/[id].tsx` (descomentar), posible migración `024_order_photos_storage.sql` para políticas.

**Pasos**:
1. Crear bucket `order-photos` en Supabase Storage (privado). Políticas (vía migración `024`, patrón de `013_recipe_images_storage.sql`):
   ```sql
   create policy "order photos insert" on storage.objects for insert
     with check (bucket_id = 'order-photos' and auth.uid()::text = (storage.foldername(name))[1]);
   create policy "order photos select" on storage.objects for select
     using (bucket_id = 'order-photos' and auth.uid()::text = (storage.foldername(name))[1]);
   ```
   (Verificar contra cómo `013_recipe_images_storage.sql` estructura paths — replicar EXACTAMENTE ese esquema de carpeta `user_id/...` y ajustar el código comentado si usa otro path.)
2. Descomentar los 5 bloques STANDBY. Buscar todos con `grep -n "STANDBY" app/orders/\[id\].tsx`.
3. Verificar que la columna de DB que usa el código descomentado existe (el tipo `Order` tiene `decorationImageUrl` → columna probable `decoration_image_url`; si el código usa otra, crear la columna en la migración 024).
4. La foto ya se incluye en el PDF si existe (HANDOFF) — verificar que `buildOrderReceiptHtml` de S1.1 la conserve.

**Aceptación**:
- [ ] Tomar/elegir foto en detalle del pedido → sube, se muestra, persiste tras reabrir.
- [ ] Usuario A no puede leer fotos de usuario B (probar con URL directa).
- [ ] PDF incluye la foto.
- [ ] `grep -n "STANDBY" app/orders/\[id\].tsx` → 0 resultados.

---

## S2.3 — Notas internas por pedido

**Objetivo**: notas privadas de la repostera en el detalle del pedido (backlog HANDOFF, complejidad baja).

**Archivos**: crear `supabase/migrations/025_order_notes.sql`; modificar `types/index.ts`, `hooks/useOrders.ts`, `app/orders/[id].tsx`.

**Pasos**:
1. Migración `025`: `alter table orders add column if not exists internal_notes text;`
2. `types/index.ts`: agregar `internalNotes?: string` a `Order` (NO a `OrderFormData` — no va en el formulario de creación).
3. `hooks/useOrders.ts`: mapear `internal_notes` en los DOS mapeos (fetchOrders y getOrdersByClient) + función `updateOrderNotes(id: string, notes: string)` que hace update solo de esa columna (sin refetch completo: actualizar el estado local con `setOrders(prev => prev.map(...))`).
4. `app/orders/[id].tsx`: sección "Notas internas" al final del scroll, antes de los botones de acción: `TextInput` multiline con el valor actual, guardado on-blur (o botón guardar pequeño), con hint "Solo tú ves esto". Estilo de card igual a las secciones existentes.
5. Las notas NO aparecen en el PDF ni en mensajes de WhatsApp (verificar `buildOrderReceiptHtml`).

**Aceptación**:
- [ ] Escribir nota, salir del detalle, volver → persiste.
- [ ] PDF compartido no contiene la nota.

---

## S2.4 — Búsqueda global

**Objetivo**: buscar por cliente, tipo de torta o descripción desde el home (backlog, complejidad baja).

**Archivos**: crear `app/search.tsx`; modificar `app/(tabs)/index.tsx` (icono lupa en header).

**Pasos**:
1. `app/search.tsx` (modal o push):
   - `TextInput` autofocus con debounce de 300ms (useEffect + setTimeout/clearTimeout).
   - Con query ≥ 2 caracteres: `supabase.from('orders').select('*').eq('user_id', uid).or('client_name.ilike.%' + q + '%,cake_type.ilike.%' + q + '%,description.ilike.%' + q + '%').order('delivery_date', { ascending: false }).limit(30)`. Escapar `%` y `,` del input (los `,` rompen la sintaxis `.or()` de PostgREST — sanitizar con `q.replace(/[%,]/g, '')`).
   - Resultado: cards compactas (cliente, cakeType/descripción, fecha, status badge) → tap navega a `/orders/[id]`.
   - Estados: vacío inicial ("Busca por cliente, torta…"), sin resultados, loading.
2. Home: icono `search` en el header → `router.push('/search' as any)`.

**Aceptación**:
- [ ] "marí" encuentra "María" (ilike es case-insensitive; los acentos exactos sí importan — aceptable v1).
- [ ] Tap en resultado abre el detalle correcto.
- [ ] Input con `%` o `,` no rompe la query.

---

# SPRINT 3 — Clientes de verdad

## S3.1 — Tabla `clients` real + migración de datos

**Objetivo**: eliminar la fragilidad de agrupar por string `client_name`. Tabla real con FK desde orders.

**Riesgo**: es la tarea más delicada del plan — toca datos de producción. Hacer en rama propia, probar contra un proyecto Supabase de staging con copia de datos reales antes de aplicar en prod.

**Archivos**: crear `supabase/migrations/026_clients_table.sql`; modificar `hooks/useClients.ts`, `hooks/useClientDetail.ts`, `hooks/useOrders.ts`, `app/orders/new.tsx`, `app/(tabs)/clients.tsx`, `app/clients/detail.tsx`, `types/index.ts`.

**Pasos**:
1. Migración `026` — esquema + backfill:
   ```sql
   create table clients (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     name text not null,
     phone text,
     address text,
     notes text,
     birthday date,
     created_at timestamptz not null default now(),
     unique (user_id, lower(name))
   );
   alter table clients enable row level security;
   create policy "own clients" on clients for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);

   alter table orders add column client_id uuid references clients(id) on delete set null;

   -- Backfill: un client por (user_id, lower(trim(name))), tomando el teléfono/dirección del pedido más reciente
   insert into clients (user_id, name, phone, address)
   select distinct on (user_id, lower(trim(client_name)))
          user_id, trim(client_name), client_phone, address
   from orders
   where client_name is not null and trim(client_name) <> ''
   order by user_id, lower(trim(client_name)), created_at desc;

   update orders o set client_id = c.id
   from clients c
   where c.user_id = o.user_id and lower(c.name) = lower(trim(o.client_name));
   ```
2. **Compatibilidad**: `orders.client_name` y `client_phone` NO se eliminan (denormalizados; todo el código actual los lee). Regla nueva: `client_id` es la fuente de verdad para agrupar; `client_name` sigue siendo lo que se muestra en listas sin join.
3. `hooks/useOrders.ts` → `createOrder`: antes del insert del pedido, resolver cliente:
   - Buscar `clients` por `user_id` + `lower(name) = lower(trim(clientName))` → si existe usar su id y actualizar phone/address si cambiaron; si no, insert y usar el id nuevo.
   - Incluir `client_id` en el insert del pedido. Igual en `updateOrder` si cambió `clientName`.
4. `hooks/useClients.ts`: reescribir para leer de `clients` + agregado de stats por `client_id` (un query a clients, otro a orders con `client_id in (...)`, agregación en JS manteniendo el shape actual que consume `app/(tabs)/clients.tsx` — revisar ese shape antes de tocar).
5. `hooks/useClientDetail.ts` y `getOrdersByClient`: filtrar por `client_id` en lugar de `ilike(client_name)`.
6. Autocompletado en `app/orders/new.tsx`: las sugerencias salen de `clients` (name, phone, address) en lugar de dedup de orders.
7. UI merge de duplicados (los que el backfill no unificó por typos): en `app/(tabs)/clients.tsx`, long-press → "Combinar con…" → selector de otro cliente → `update orders set client_id = target where client_id = source; delete from clients where id = source;` con alert de confirmación. (Simple, sin fuzzy automático — la usuaria decide.)

**Aceptación**:
- [ ] Backfill en staging: `select count(*) from orders where client_id is null and client_name is not null` → 0.
- [ ] Crear pedido con cliente nuevo → aparece en tab Clientes con 1 pedido.
- [ ] Crear pedido con nombre existente en distinta capitalización → NO crea cliente duplicado.
- [ ] "Pedir de nuevo" y modal de historial siguen funcionando (QA sección 2).
- [ ] Merge de duplicados reasigna pedidos y elimina el duplicado.

## S3.2 — Ficha de cliente enriquecida

**Objetivo**: notas, cumpleaños y datos editables por cliente (habilitado por S3.1 — las columnas ya existen).

**Archivos**: `app/clients/detail.tsx`, `hooks/useClientDetail.ts`.

**Pasos**:
1. En `app/clients/detail.tsx` agregar sección editable: teléfono, dirección, cumpleaños (`DateTimePickerField` modo date), notas (multiline). Guardar → update a `clients`.
2. Si el cliente tiene `birthday`, mostrar chip "🎂 Cumple en N días" cuando falten ≤ 30 días (calcular próximo cumpleaños: mismo mes/día, año actual o siguiente).
3. En la lista de clientes, badge 🎂 si cumple en ≤ 14 días.

**Aceptación**:
- [ ] Editar y persistir los 4 campos.
- [ ] Cumpleaños en 10 días → chip visible con N correcto (probar cruce de año: cumple en enero estando en diciembre).

## S3.3 — Stats de recetas: costo real vs precio vendido

**Objetivo**: "estás vendiendo la torta de chocolate por debajo de su costo" (backlog HANDOFF).

**Archivos**: modificar `app/recipes/[id].tsx`, crear `hooks/useRecipeStats.ts`.

**Pasos**:
1. `hooks/useRecipeStats.ts` → `useRecipeStats(recipeId: string)`:
   - Costo actual de la receta: sum(`recipe_ingredients.quantity` convertida a unidad del inventario × `inventory_items.cost_per_unit`) — reutilizar `convertValue` de `lib/units.ts`; si ya existe este cálculo en `hooks/useRecipeIngredients.ts` o el detalle de receta (el QA menciona "costo, precio sugerido"), reutilizarlo, no duplicarlo.
   - Ventas: `order_items` con ese `recipe_id` join a su order pagado → cantidad vendida, ingreso total, precio promedio por unidad.
   - Margen: `(precioPromedio - costo) / precioPromedio * 100`.
2. En `app/recipes/[id].tsx`, card "Rendimiento" (solo si hay ≥ 1 venta): unidades vendidas, ingreso, costo actual, margen % — margen en rojo si < 0, naranja si < 20%.
3. Gate premium: dentro de `canViewAdvancedStats` (free → card con candado + link a `/premium`).
4. Test unitario para el cálculo de margen (función pura): margen negativo, división por cero (precio 0 → margen 0, no NaN/Infinity).

**Aceptación**:
- [ ] Receta con ventas muestra números correctos verificables a mano.
- [ ] Receta sin ventas no muestra la card.
- [ ] Free ve candado.

---

# SPRINT 4 — i18n (inglés para USA)

## S4.1 — Infraestructura i18n

**Objetivo**: sistema de traducción sin cambiar aún ningún texto visible.

**Archivos**: crear `lib/i18n.ts`, `locales/es.json`, `locales/en.json`; modificar `app/_layout.tsx`, `context/SettingsContext.tsx`, migración `027_add_language_to_profiles.sql`.

**Pasos**:
1. `npx expo install expo-localization i18n-js`. (i18n-js y no react-i18next: cero deps extra de React, API simple, suficiente para una app de este tamaño.)
2. `lib/i18n.ts`:
   ```ts
   import { getLocales } from 'expo-localization';
   import { I18n } from 'i18n-js';
   import es from '@/locales/es.json';
   import en from '@/locales/en.json';
   export const i18n = new I18n({ es, en });
   i18n.defaultLocale = 'es';
   i18n.enableFallback = true; // en incompleto → cae a es
   i18n.locale = getLocales()[0]?.languageCode === 'en' ? 'en' : 'es';
   export const t = i18n.t.bind(i18n);
   ```
3. Migración `027`: `alter table profiles add column if not exists language text default null;` (null = auto por dispositivo).
4. `SettingsContext`: agregar `language: 'es' | 'en' | null` + `updateLanguage` (patrón currency). Al cargar/cambiar: `i18n.locale = language ?? deviceLocale`. Selector en `app/(tabs)/settings.tsx`: Auto / Español / English. Cambio aplica al re-render (los screens llaman `t()` en render, no en constantes de módulo — regla dura para S4.2).
5. Convención de keys: por dominio — `orders.title`, `orders.newOrder`, `common.save`, `common.cancel`, `finances.income`… Keys en inglés, minúscula camel.

**Aceptación**:
- [ ] App arranca idéntica a hoy (aún sin strings migrados).
- [ ] `t('common.save')` con selector en English devuelve "Save", en Español "Guardar".

## S4.2 — Migración de strings (mecánica, por lotes)

**Objetivo**: reemplazar strings hardcodeados por `t()`. Es la tarea más voluminosa — dividir en sub-PRs por área para que sea revisable.

**Orden de lotes** (un PR cada uno, la app compila y funciona tras cada lote):
1. `components/` + `context/AlertContext.tsx` (mensajes de error comunes)
2. `app/(tabs)/index.tsx` + `orders.tsx` + `app/orders/*` (flujo principal)
3. `app/(tabs)/calendar.tsx` + `agenda.tsx` + `cobros.tsx`
4. `app/(tabs)/inventory.tsx` + `app/inventory/*`
5. `app/(tabs)/recipes.tsx` + `app/recipes/*` + calculadora
6. `app/(tabs)/finances.tsx` + `analytics.tsx` + `clients.tsx` + `app/clients/*`
7. `app/(tabs)/settings.tsx` + `premium.tsx` + `app/auth/*` + `onboarding.tsx`

**Reglas por lote**:
- Extraer CADA string visible al usuario (incluye placeholders, alerts, empty states, labels de charts) a `locales/es.json`; en `en.json` va la traducción al inglés en el mismo PR.
- Interpolación: `t('cobros.reminder', { name, amount })` con `"reminder": "Hola %{name}, saldo pendiente %{amount}"`.
- Plurales simples con dos keys (`orders.one`, `orders.other`) — i18n-js soporta `count`.
- NO traducir: valores de DB (`'pendiente'`, `'pagado'` como status — traducir solo el LABEL al renderizar, p.ej. `ORDER_STATUS_OPTIONS` de `types/index.ts` pasa a labels con keys), categorías del dictionary del usuario, nombres propios.
- Fechas: reemplazar formateos manuales por `date-fns` con locale dinámico: `format(date, 'PPP', { locale: language === 'en' ? enUS : es })` (importar de `date-fns/locale`). Los labels de meses en `useAnalytics` ("Ene", "Feb"…) van a `locales/`.

**Aceptación por lote**:
- [ ] `grep` de strings en español en los archivos del lote → solo quedan valores de DB.
- [ ] Screens del lote correctos en ambos idiomas (screenshot ES + EN).
- [ ] QA manual de los flujos del lote en español (no-regresión).

## S4.3 — PDF y WhatsApp bilingües

**Objetivo**: el comprobante (S1.1) y los mensajes de WhatsApp (S1.2) salen en el idioma elegido — puede diferir del idioma de la UI (repostera hispana con cliente final angloparlante).

**Archivos**: `lib/orderPdf.ts`, `lib/whatsapp.ts`, `app/orders/[id].tsx`, `app/cobros.tsx`.

**Pasos**:
1. `buildOrderReceiptHtml` recibe `locale: 'es' | 'en'` y usa `i18n.t(key, { locale })` para todos los labels del PDF.
2. Al compartir PDF: action sheet (usar `showAlert` con botones o `ActionSheetIOS`/equivalente ya usado en el proyecto) "Español / English" antes de generar. Recordar la última elección por cliente en `clients.notes`? NO — simple: recordar última elección global en AsyncStorage key `receipt_locale`.
3. Mensajes de WhatsApp de cobro: misma elección (default = última usada).

**Aceptación**:
- [ ] PDF en inglés con labels correctos y números con formato en (1,234.56).
- [ ] La elección persiste entre sesiones.

---

# SPRINT 5 — Adquisición

## S5.1 — Link público de pedido (formulario web)

**Objetivo**: la repostera comparte `https://<dominio>/p/<slug>`; el cliente final llena el formulario; el pedido llega como solicitud "por aprobar". Es el feature de mayor alcance del plan — dividido en fases estrictas.

### Fase A — Backend

**Archivos**: `supabase/migrations/028_order_requests.sql`.

```sql
alter table profiles add column if not exists public_slug text unique;
alter table profiles add column if not exists public_form_enabled boolean not null default false;

create table order_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  client_phone text not null,
  delivery_date date not null,
  description text,
  size text,
  occasion text,
  reference_image_url text,
  status text not null default 'nueva', -- 'nueva' | 'aprobada' | 'rechazada'
  created_at timestamptz not null default now()
);
alter table order_requests enable row level security;
create policy "owner reads" on order_requests for select using (auth.uid() = user_id);
create policy "owner updates" on order_requests for update using (auth.uid() = user_id);
```
El INSERT público NO va por RLS directo (anon insertando con user_id arbitrario = spam dirigido). Va por función RPC con rate limit:
```sql
create or replace function submit_order_request(
  slug text, p_name text, p_phone text, p_date date,
  p_description text, p_size text, p_occasion text
) returns json as $$
declare v_user uuid;
begin
  select id into v_user from profiles
    where public_slug = slug and public_form_enabled = true;
  if v_user is null then return json_build_object('error', 'NOT_FOUND'); end if;
  if (select count(*) from order_requests
      where user_id = v_user and created_at > now() - interval '1 hour') >= 20 then
    return json_build_object('error', 'RATE_LIMIT');
  end if;
  insert into order_requests (user_id, client_name, client_phone, delivery_date, description, size, occasion)
  values (v_user, p_name, p_phone, p_date, p_description, p_size, p_occasion);
  return json_build_object('success', true);
end; $$ language plpgsql security definer;
grant execute on function submit_order_request to anon;
```

### Fase B — Formulario web público

Proyecto NUEVO y separado (`miga-web/`, repo aparte o carpeta `web/` — decidir con el usuario dónde hospedarlo; sugerido: Vercel + Vite/Next estático). Página `/p/[slug]`:
- Lee nombre del negocio: `select business_name from profiles where public_slug = $1 and public_form_enabled = true` (requiere policy `select` anon SOLO de `business_name` — crear vista `public_profiles(slug, business_name)` con `security_invoker = false` para no exponer la tabla).
- Formulario: nombre*, WhatsApp*, fecha deseada* (min = mañana), tamaño (chips `SIZE_OPTIONS`), ocasión, descripción libre. Envía vía `supabase.rpc('submit_order_request', ...)` con anon key.
- Página de gracias: "Tu solicitud llegó a {businessName}, te contactará por WhatsApp".
- Bilingüe ES/EN por `navigator.language`.

### Fase C — Bandeja de solicitudes en la app

**Archivos**: crear `app/requests.tsx`, `hooks/useOrderRequests.ts`; modificar `app/(tabs)/settings.tsx` (activar link + elegir slug + compartir), `app/(tabs)/index.tsx` (badge).

- Settings: sección "Mi link de pedidos" (PREMIUM — este es el gancho de conversión principal): toggle `public_form_enabled`, input de slug (validar `^[a-z0-9-]{3,30}$`, unicidad por error de constraint), botón compartir (`Share.share` con la URL).
- `hooks/useOrderRequests.ts`: fetch `status = 'nueva'`, `approveRequest(req)` → crea Order real vía `createOrder` de `useOrders` (mapear campos; `totalPrice: 0`, `paymentMethod: 'efectivo'`, `paymentStatus: 'pendiente'`, `deliveryTime: '12:00'` default) → navega a `/orders/edit` para completar precio → marca request `aprobada`. `rejectRequest(id)` → `rechazada`.
- Home: si hay solicitudes nuevas, banner/stat card "📥 N solicitudes nuevas" → `/requests`.
- Polling simple al focus (patrón `useFocusEffect` si ya se usa; si no, fetch en mount + pull-to-refresh). Realtime de Supabase queda fuera de alcance v1.

**Aceptación**:
- [ ] Flujo E2E: activar link en settings → abrir URL en browser sin sesión → enviar solicitud → aparece en `/requests` → aprobar → pedido en la lista con datos correctos → editar precio.
- [ ] Slug desactivado o inexistente → web muestra "no encontrado", RPC devuelve NOT_FOUND.
- [ ] 21ª solicitud en una hora → RATE_LIMIT.
- [ ] anon no puede leer `order_requests` ni `profiles` (solo la vista).
- [ ] Free no puede activar el link (gate premium).

## S5.2 — Portafolio de tortas

**Objetivo**: galería de fotos de pedidos terminados (depende de S2.2), filtrable y compartible.

**Archivos**: crear `app/portfolio.tsx`; modificar `app/(tabs)/index.tsx` o menú (entrada).

**Pasos**:
1. Query: orders con `decoration_image_url not null`, `status in ('completado','pagado')`, order by `delivery_date desc`.
2. Grid 2 columnas (FlatList `numColumns={2}`) de fotos con overlay (cakeType + ocasión). Filtro por chips de `occasion` y `cake_type` (valores del dictionary del usuario vía `getDictionaryOptions`).
3. Tap → vista completa con datos no sensibles (SIN precio ni cliente) + botón compartir imagen (`expo-sharing` con el archivo descargado vía `expo-file-system`).
4. Free: visible hasta 6 fotos, luego card de upgrade (decisión de producto: el portafolio genera fotos → retención; el límite empuja premium).

**Aceptación**:
- [ ] Solo pedidos con foto y completados/pagados aparecen.
- [ ] Compartir manda la imagen, no la URL firmada.
- [ ] Filtros combinables funcionan.

---

# Resumen de dependencias

```
S0.2 ──→ S2.1 (scanner facturas usa Edge Function)
S0.3 ──→ S0.6 (tests revelan/verifican bug de unidades)
S0.5 ──→ S1.1 (PDF necesita business name) ──→ S4.3 (PDF bilingüe)
S1.2 ──→ S4.3 (mensajes WhatsApp bilingües)
S2.2 ──→ S5.2 (portafolio necesita fotos)
S3.1 ──→ S3.2 (ficha necesita tabla clients)
S4.1 ──→ S4.2 ──→ S4.3
S5.1 Fase A ──→ Fase B ──→ Fase C
```

Orden de sprints pensado para: primero no romperse (S0), luego retener (S1-S3), luego crecer (S4-S5). Los sprints 1-3 son intercambiables entre sí si surge urgencia; S0 no es negociable antes que el resto.

# Qué queda explícitamente FUERA de este plan (no implementar sin pedir)

- Modo offline (evaluar tras Sentry: medir cuántos errores son de red).
- Multi-usuario / equipos.
- Pagos integrados (Stripe / verificación Pago Móvil).
- Realtime subscriptions de Supabase.
- Refactor de pantallas monolíticas como tarea propia (solo extraer componentes al tocar cada pantalla).
