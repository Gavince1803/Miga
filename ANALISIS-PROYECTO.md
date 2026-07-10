# Análisis del Proyecto — Miga

Fecha: 2026-07-03 · Base: rama `feature/i18n-regional-settings` · ~12.700 líneas de código propio
Contexto: **190 usuarios activos en LATAM y USA** — reposteras independientes y pequeños negocios.

---

## 1. Fortalezas

### Producto
- **Enfoque de nicho muy claro.** No es un "CRM genérico": el modelo de datos habla el idioma de la repostera (relleno, cubierta, tipo de ponqué, abono, motivo). Eso es una ventaja competitiva real frente a apps genéricas de pedidos.
- **Ciclo operativo completo cubierto.** Pedido → agenda del día → calendario → inventario con deducción automática → finanzas → analytics. Pocas apps de este tamaño cierran el círculo entre operación y dinero.
- **Localización financiera LATAM genuina.** Soporte VES con tasas BCV/Paralelo (`useExchangeRates`, `ExchangeRateTicker`), métodos de pago regionales (Pago Móvil, Zelle), concepto de "abono" como flujo de primera clase. Esto es difícil de copiar para un competidor gringo.
- **Monetización ya montada y con doble vía.** RevenueCat (IAP) + códigos de activación manuales vía Supabase RPC. Los códigos manuales son inteligentes para LATAM, donde muchas usuarias no tienen tarjeta para pagar en la tienda de apps.
- **Free tier con límites sensatos** (10 pedidos/mes, 20 items inventario, 5 recetas) que empujan naturalmente al upgrade cuando el negocio crece — el gate crece con el éxito de la usuaria.
- **Features "premium" con valor percibido real**: OCR de recetas con Gemini, export Excel, finanzas, analytics. No es premium de relleno.

### Ingeniería
- **Arquitectura limpia y consistente**: Expo Router file-based, un hook por dominio (`useOrders`, `useInventory`, `useFinances`…), design system centralizado en `constants/Colors.ts`, theming claro/oscuro en todas las pantallas.
- **Buenas prácticas puntuales**: cache optimista del estado premium en AsyncStorage (UI instantánea), actualización optimista de settings, deduplicación de notificaciones locales, manejo defensivo del parseo JSON del OCR.
- **Proceso de trabajo documentado**: `HANDOFF.md` (continuidad entre sesiones), `QA.md` (checklist manual exhaustiva por pantalla), backlog priorizado por impacto. Para un proyecto de una persona, esto es disciplina poco común.
- **Migraciones SQL versionadas** en `supabase/migrations` — el esquema tiene historia rastreable.

---

## 2. Debilidades

### Críticas (atender antes de escalar más usuarios)

1. **API key de Gemini expuesta en el cliente** (`lib/ocr.ts:3`). Todo `EXPO_PUBLIC_*` se empaqueta en el binario; cualquiera puede extraer la key y quemar la cuota (o generar costos). Con 190 usuarios ya es un riesgo real. Solución: mover la llamada a Gemini a una Supabase Edge Function que valide sesión + estado premium en el servidor.
2. **Gates premium y límites free solo del lado del cliente** (`canUseFeature` en `hooks/useSubscription.ts`). Un cliente modificado puede saltarse el límite de 10 pedidos/mes. Mientras el volumen es bajo no importa; si el free tier es el embudo de conversión, conviene reforzar los límites con RLS o triggers en Supabase.
3. **Cero tests automatizados.** Solo existe el test de plantilla de Expo. La lógica más delicada (deducción de inventario, cálculos de finanzas, conversión de unidades en `lib/units.ts`, parseo de fechas) se verifica solo con el QA manual. Con 190 usuarios, una regresión en deducción de inventario o en totales de finanzas erosiona confianza rápido. Prioridad: tests unitarios de `inventoryDeduction`, `units`, y los cálculos de `useFinances`/`useAnalytics`.
4. **Sin monitoreo de errores en producción** (no hay Sentry ni equivalente). Hoy los crashes se conocen solo si la usuaria escribe. Es la inversión con mejor relación costo/beneficio del listado: una tarde de setup.

### Importantes

5. **"Clientes" no es una entidad real.** La cartera se deriva agrupando `client_name` (string) de los pedidos. "María Pérez" y "Maria Perez" son dos clientas distintas; un typo fragmenta el historial y las stats. A mediano plazo: tabla `clients` con FK desde `orders` + migración de datos con matching difuso.
6. **Sin modo offline.** Todo depende de Supabase en vivo; no hay NetInfo, ni cola de escritura, ni cache de lectura (salvo el estado premium). Para la audiencia LATAM con conectividad irregular, que la app no abra la agenda del día sin señal es un dolor real. Aunque sea cache de solo lectura de pedidos del día sería un salto de calidad percibida.
7. **i18n inexistente pese al mercado USA.** Todos los strings están hardcodeados en español y la rama se llama `i18n-regional-settings` pero no hay infraestructura de traducción. Si USA es parte del crecimiento, el inglés es la barrera número uno de adquisición. Además hay usuarias latinas en USA cuyo *cliente final* habla inglés → el PDF/comprobante del pedido en inglés importa incluso antes que la UI.
8. **Símbolo de moneda ambiguo**: las 6 monedas usan `$` (`SettingsContext.tsx`). Un reporte que dice "$ 45.000" no distingue COP de CLP de USD. Usar símbolos/códigos locales (`Bs.`, `COP$`, etc.) es un cambio pequeño con impacto en confianza. Nota: `QA.md` menciona EUR pero `SettingsContext` no lo soporta — documentación desincronizada.
9. **Pantallas monolíticas**: `inventory.tsx` (1.326 líneas), `orders/[id].tsx` (1.144), `new.tsx` (879). Funciona, pero cada feature nueva sobre esos archivos es más cara y más riesgosa. No urge refactor masivo; sí conviene extraer componentes al tocar cada pantalla.
10. **Deuda menor acumulada**: nombre del negocio no persistido (solo `console.log`, notado en HANDOFF), migraciones con numeración duplicada (`013_` dos veces), sin ESLint configurado, manejo de fechas manual y frágil a timezones (la convención del split existe, pero es fácil de olvidar).

---

## 3. Features futuras sugeridas

Basadas en la audiencia real (reposteras independientes y negocios, LATAM + USA) y en cómo se usa la app. Ordenadas por relación impacto/esfuerzo.

### Alto impacto, corto plazo

| Feature | Por qué | Esfuerzo |
|---|---|---|
| **Comprobante de pedido para el cliente vía WhatsApp** (extender el PDF actual con branding del negocio, bilingüe ES/EN) | El PDF ya existe; WhatsApp es EL canal de venta de esta audiencia. Cada comprobante enviado es marketing gratis con el logo de Miga → loop viral orgánico | Bajo |
| **Recordatorios de cobro** ("María debe $30 del pedido de mañana", con botón WhatsApp con mensaje pre-armado) | El dato ya existe (`depositAmount` vs `totalPrice`); cobrar es el dolor #1 del negocio informal | Bajo |
| **Gastos manuales** (ya en backlog) | Sin esto, "Finanzas" miente: solo ve gastos de inventario. Gas, delivery, empaques quedan fuera | Medio |
| **Scanner de facturas de proveedor → inventario** (ya planificado, ver memoria del proyecto) | Reutiliza el pipeline Gemini del OCR de recetas; elimina la carga manual de inventario, que es la fricción de adopción de esa tab | Medio |
| **Inglés (i18n)** | Puerta de entrada al mercado USA; la rama ya apunta ahí | Medio |

### Alto impacto, mediano plazo

| Feature | Por qué | Esfuerzo |
|---|---|---|
| **Link público de pedido** (formulario web donde el cliente final arma su pedido y le llega a la repostera como "pendiente de aprobar") | Convierte a Miga de agenda a canal de ventas; es el feature que justifica premium por sí solo y el que más citan apps análogas (Bakesy, CakeBoss) como driver de crecimiento | Alto |
| **Portafolio de tortas terminadas** (activar la foto del pedido en standby → galería filtrable por tipo/ocasión, compartible) | Las reposteras venden por fotos; hoy su portafolio vive desordenado en el carrete del teléfono. El código de foto ya está escrito, falta el bucket | Medio |
| **Tabla real de clientes** + notas por cliente (alergias, preferencias, fecha de cumpleaños → recordatorio "el cumple de la hija de Ana es en 2 semanas") | Arregla la debilidad #5 y habilita re-venta proactiva, que para negocios recurrentes es oro | Medio |
| **Reportes fiscales exportables** (resumen mensual/anual de ingresos, CSV/PDF) | Las usuarias USA lo necesitan para taxes (Schedule C); en LATAM sirve para formalización. Diferenciador serio frente a "apps de agenda" | Medio |

### Apuestas a explorar (validar con usuarias antes)

- **Multi-usuario / equipo**: los "negocios" del user base eventualmente tienen ayudante o socio. Un plan "Negocio" con 2-3 asientos es la vía natural para subir el ARPU sin tocar el precio individual.
- **Cotizador inteligente**: la calculadora de costos ya existe (`app/calculator`); conectarla con recetas + precios reales vendidos (stats de recetas, ya en backlog) → "estás vendiendo la torta de chocolate 15% por debajo de tu costo real". Ese insight fideliza más que cualquier chart.
- **Pagos integrados**: links de pago (Stripe para USA, referencias de Pago Móvil verificables en LATAM) adjuntos al comprobante. Complejo por la fragmentación regional, pero cierra el ciclo cobro→pedido.
- **Plantillas de temporada**: la demanda de repostería es estacional (Día de la Madre, diciembre, San Valentín). Notificaciones de preparación de temporada + análisis de "qué vendiste el diciembre pasado" usan datos que ya existen.

### Sugerencia de secuencia

1. **Estabilizar** (2 semanas): Sentry + Edge Function para Gemini + tests de deducción/finanzas/unidades.
2. **Monetizar el canal WhatsApp** (2-4 semanas): comprobante con branding + recordatorios de cobro + gastos manuales. Todo con datos que ya existen.
3. **Crecer** (1-2 meses): i18n inglés + link público de pedido + portafolio. Son los features de adquisición.

---

## 4. Resumen ejecutivo

Miga tiene lo más difícil ya resuelto: **product-market fit visible** (190 usuarios reales en un nicho desatendido), un dominio modelado con conocimiento genuino del oficio, y monetización operativa con doble vía de pago adaptada a LATAM. La deuda es la típica de una app que creció más rápido que su infraestructura: sin tests, sin monitoreo, una API key expuesta y límites de negocio confiados al cliente.

La recomendación central: **antes de más features, una quincena de blindaje** (Sentry, Edge Function, tests de la lógica de dinero). Después, priorizar los features que viven donde ya viven las usuarias — WhatsApp — porque cada comprobante y cada recordatorio enviado es a la vez retención y adquisición.
