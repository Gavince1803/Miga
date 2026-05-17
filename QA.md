# QA Checklist — Miga

Cubre todo lo de este PR + features existentes. Marca cada ítem con ✅ / ❌ / ⚠️.

---

## 0. Setup

- [ ] App arranca sin crash en iOS
- [ ] App arranca sin crash en Android
- [ ] Login con cuenta existente funciona
- [ ] Registro de cuenta nueva funciona
- [ ] Reset de contraseña recibe email
- [ ] Dark mode visual correcto en todas las tabs

---

## 1. Pantalla Inicio (Dashboard)

- [ ] Stats del día cargan: pedidos hoy, pendientes de cobro, ingresos mes, gastos mes
- [ ] Lista de próximos pedidos muestra urgency colors (rojo = hoy/mañana, naranja = 2-3 días, verde = futuro)
- [ ] Pull-to-refresh actualiza datos
- [ ] Banner de re-engagement no aparece si el usuario tiene plan activo
- [ ] Banner de trial expira correctamente pasados los días de prueba

---

## 2. Pedidos

### Lista
- [ ] Lista carga y muestra pedidos ordenados por fecha de entrega
- [ ] Filtro por estado funciona: Pendiente / En proceso / Completado / Pagado / Cancelado
- [ ] Búsqueda por nombre de cliente filtra en tiempo real
- [ ] Pedido sin descripción muestra fallback (size u otro campo)

### Nuevo Pedido (`/orders/new`)
- [ ] Formulario vacío — campos requeridos marcados con *
- [ ] Autocompletado de cliente: escribir 2+ letras muestra sugerencias
- [ ] Seleccionar sugerencia pre-llena nombre, teléfono y dirección
- [ ] Chips de tamaño funcionan; seleccionar "Otro" muestra campo libre
- [ ] EditableDropdown de cakeType, relleno, cubierta y ocasión funcionan
- [ ] Precio total / abono / restante calculan correctamente
- [ ] Estado (pendiente/abonado/pagado) se auto-asigna según abono
- [ ] Guardar pedido sin nombre → muestra error
- [ ] Guardar pedido válido → navega de regreso y aparece en la lista
- [ ] Límite de 10 pedidos/mes para usuarios free muestra alert y botón a Premium

#### Pre-fill desde "Pedir de nuevo" (PR nuevo)
- [ ] Llegar desde historial: nombre, teléfono, dirección están pre-llenados
- [ ] cakeType pre-llenado aparece seleccionado en EditableDropdown
- [ ] Relleno y cubierta pre-llenados correctamente
- [ ] Precio pre-llenado en campo Total
- [ ] Size estándar (ej "20 cm") → chip seleccionado
- [ ] Size custom (ej "25 cm") → activa campo "Otro" con el valor escrito
- [ ] Sin params (apertura normal) → formulario vacío con defaults normales
- [ ] El autocompletado NO muestra sugerencias cuando viene pre-llenado desde params

### Detalle de Pedido (`/orders/[id]`)
- [ ] Carga correctamente todos los campos del pedido
- [ ] Botón de estado abre selector con opciones correctas
- [ ] Cambiar a "pagado" actualiza estado y deduce inventario
- [ ] Botón Llamar abre app de teléfono
- [ ] Botón WhatsApp abre con mensaje pre-armado
- [ ] Botón Editar navega a edit.tsx
- [ ] Eliminar pedido pide confirmación y borra
- [ ] Conversiones a Bolívares (solo visible si moneda = VES)

#### Historial de cliente (PR nuevo)
- [ ] Tocar nombre del cliente abre modal de historial
- [ ] Tocar nombre rápido dos veces NO lanza dos requests (botón se deshabilita)
- [ ] **Stats grid 2×2** muestra datos correctos:
  - [ ] Total pedidos incluye el pedido actual
  - [ ] Total gastado incluye el pedido actual, con 2 decimales
  - [ ] Pagados / Pendientes cuenta correcto (status='pagado' O payment_status='pagado')
  - [ ] Torta favorita muestra el cake_type más repetido
  - [ ] Con empate, muestra el más reciente
  - [ ] Si cliente no tiene historial de cake_type → muestra "—"
- [ ] Lista de pedidos anteriores: tocar navega al detalle de ese pedido
- [ ] Primer pedido del cliente muestra estado vacío correcto
- [ ] **Botón "Pedir de nuevo"** en cada pedido pasado:
  - [ ] Cierra el modal
  - [ ] Navega a `/orders/new` con datos pre-llenados
  - [ ] Campos pre-llenados correctos (ver sección Pre-fill arriba)

### Editar Pedido (`/orders/edit`)
- [ ] Carga con datos actuales del pedido
- [ ] Modificar campos y guardar persiste cambios
- [ ] Cambiar fecha funciona

---

## 3. Calendario

- [ ] Vista mensual muestra días con entregas coloreados por urgencia
- [ ] Tocar día muestra pedidos de ese día
- [ ] Navegar entre meses funciona
- [ ] Pull-to-refresh actualiza

---

## 4. Inventario

- [ ] Lista de items con cantidades y alertas de stock bajo
- [ ] Botones +/- actualizan cantidad directamente
- [ ] Badge "Stock bajo" aparece cuando está por debajo del mínimo
- [ ] Archivar item lo oculta de la lista principal
- [ ] Agregar item: formulario guarda correctamente
- [ ] Importar Excel (premium) → muestra gate si free
- [ ] Exportar Excel (premium) → muestra gate si free

---

## 5. Recetario

- [ ] Lista de recetas carga con imagen o placeholder
- [ ] Filtro por categoría funciona
- [ ] Nueva receta: guardar con campos vacíos muestra error
- [ ] Guardar receta válida aparece en la lista
- [ ] Detalle de receta muestra ingredientes, costo, precio sugerido
- [ ] Editar receta persiste cambios
- [ ] Scan de receta (OCR con cámara) — solo premium:
  - [ ] Free → muestra gate
  - [ ] Premium → abre cámara y parsea receta

---

## 6. Finanzas (Premium)

- [ ] Free → muestra gate correctamente con features listadas
- [ ] Premium → carga pantalla
- [ ] Selector de mes navega meses anteriores y futuros
- [ ] Cards de Ingresos y Gastos muestran totales correctos
- [ ] Bar chart de ingresos diarios se renderiza
- [ ] Balance total y % margen correctos
- [ ] Lista de movimientos recientes carga
- [ ] Tocar ingreso → alert con opción de revertir
- [ ] Revertir ingreso → pedido vuelve a "pendiente"
- [ ] Tocar gasto → alert con opción de revertir
- [ ] Revertir gasto → stock se devuelve al inventario y movimiento se elimina
- [ ] Pull-to-refresh actualiza
- [ ] Botón calendario en header → vuelve a mes actual

---

## 7. Analytics (PR nuevo — Premium)

- [ ] Free → muestra gate con 4 features listadas
- [ ] Premium → carga pantalla sin crash

### Resumen del mes
- [ ] Total pedidos: cuenta solo pagados del mes actual
- [ ] Ingresos: suma de total_price de pagados del mes
- [ ] Ticket promedio: ingresos / total pedidos (sin NaN si hay 0 pedidos)

### Bar chart 6 meses
- [ ] Muestra exactamente los últimos 6 meses (incluyendo el actual)
- [ ] Meses sin datos muestran barra en 0
- [ ] Labels de meses en español abreviado (Ene, Feb…)
- [ ] Barras animadas al cargar
- [ ] Con 0 datos totales: chart no crashea

### Top 5 productos
- [ ] Agrupa por cake_type correctamente
- [ ] Ordena de mayor a menor
- [ ] Barra de progreso relativa al #1
- [ ] Con menos de 5 tipos: muestra solo los que hay
- [ ] Sin datos: muestra "Sin datos aún"

### Top 3 clientes
- [ ] Agrupa por client_name
- [ ] Inicial del nombre en el avatar
- [ ] Barra de progreso relativa al #1
- [ ] Sin datos: muestra "Sin datos aún"

### Día más ocupado
- [ ] Muestra el día de la semana con más entregas
- [ ] Sin datos: muestra "—"

### General
- [ ] Pull-to-refresh funciona
- [ ] Loading spinners visibles mientras carga
- [ ] Tab "Analytics" visible en tab bar con icono bar-chart

---

## 8. Ajustes

- [ ] Nombre y teléfono del negocio se guardan
- [ ] Cambiar moneda (USD/VES/EUR) actualiza símbolos en toda la app
- [ ] Permisos de notificaciones: botón abre config del sistema
- [ ] Exportar datos funciona (premium)
- [ ] Cerrar sesión funciona
- [ ] Eliminar cuenta pide confirmación y ejecuta

---

## 9. Premium / Suscripción

- [ ] Pantalla `/premium` muestra features y precio
- [ ] Compra via IAP (RevenueCat) fluye correctamente
- [ ] Canjear código de activación: código válido activa premium
- [ ] Canjear código inválido muestra error
- [ ] Estado premium persiste al cerrar y reabrir la app (cache)
- [ ] Usuario premium NO ve ningún gate en Finanzas, Analytics, ni Recetario scan

---

## 10. Edge Cases Generales

- [ ] Sin conexión a internet: app no crashea, muestra datos cacheados donde aplica
- [ ] Sesión expirada: redirige a login
- [ ] Pedido con precio 0: no rompe ningún cálculo
- [ ] Nombre de cliente con caracteres especiales (ñ, tildes): se guarda y busca bien
- [ ] Fecha de entrega en el pasado: se puede guardar sin bloqueo
- [ ] Cambio de moneda a VES: aparecen conversiones BCV/Paralelo/Euro en detalle del pedido
- [ ] Cambio de moneda de VES a USD: conversiones desaparecen

---

## Features por implementar (backlog)

Estas no están en el QA porque aún no existen, pero son las siguientes en el roadmap:

| Feature | Valor | Complejidad |
|---|---|---|
| Cartera de clientes (pantalla dedicada) | Alto — ya tenemos `getOrdersByClient` como base | Media |
| Export de pedido como imagen/PDF | Alto — útil para compartir resumen al cliente | Media |
| Foto del pedido terminado | Medio — `decorationImageUrl` ya existe en el tipo | Baja |
| Notas internas por pedido | Medio — timeline de cambios o comentarios | Baja |
| Gastos manuales (no solo inventario) | Medio — caja de gastos generales | Media |
| Búsqueda global (cliente + torta + fecha) | Medio | Baja |
| Agenda del día: vista operativa | Medio — pedidos de hoy en formato checklist | Baja |
| Stats de recetas: costo vs precio real vendido | Bajo-Medio | Media |
