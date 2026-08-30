# Plan de mejoras UI/UX MVP KUQUBA

Ultima actualizacion: 2026-08-30

Este plan da seguimiento a mejoras de experiencia sobre portales ya funcionales. No reemplaza la bitacora de cierre MVP; organiza el pulido visual, navegacion y usabilidad antes de demo extendida.

## Estado general

| #   | Frente                                 | Estado      | Criterio de cierre                                                                                                     |
| --- | -------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Reserva publica: disponibilidad guiada | Cerrado dev | El huesped puede identificar fechas ocupadas/disponibles antes de cotizar y recibe sugerencias de fechas alternativas. |
| 2   | Portal guest: detalle ergonomico       | Cerrado dev | `Ver detalle` selecciona reserva, muestra detalle embebido en mobile/tablet y conserva panel lateral en desktop.       |
| 3   | Portal owner: navegacion por modulos   | Cerrado dev | Owner navega por Propiedades, Reservas, Finanzas, Bloqueos y Documentos sin tarjetas extensas mezclando acciones.      |
| 4   | Ops: consola operativa                 | Cerrado dev | Ops tiene navegacion compacta, ultimo modulo persistente, contadores por modulo y contenido operativo mejor separado.  |
| 5   | Tablas Ops: escaneo y acciones         | Cerrado dev | Tablas con headers sticky, acciones claras, busqueda/filtros compactos y estados consistentes.                         |
| 6   | Sesion y cuenta                        | Cerrado dev | Datos de sesion salen de tarjetas principales y pasan a menu de cuenta/estado compacto.                                |
| 7   | Lenguaje final por audiencia           | Cerrado dev | Guest/owner no muestran terminos dev (`hold`, `dev`, `persistidas`) y Ops conserva lenguaje tecnico interno.           |

## 1. Reserva publica: disponibilidad guiada

Problema observado:

- El panel de cotizacion acepta fechas sin mostrar ocupacion previa.
- Cuando una fecha esta ocupada, el usuario solo descubre el problema despues de calcular.
- Fechas bloqueadas por reservas, mantenimiento u owner hold no se explican visualmente.

Implementado:

- Endpoint `GET /api/public/stays/:stayId/availability` con ventana configurable, capacidad, tarifa minima, conflictos de reservas y bloqueos operativos/owner/mantenimiento.
- Calendario compacto en el panel publico de cotizacion con leyenda de estados, seleccion de fecha disponible y sugerencia de proxima ventana disponible.
- La cotizacion final sigue pasando por `POST /api/public/stay-quotes` como fuente de verdad antes de bloqueo/pago.

Archivos probables:

- `apps/api/src/routes/public.ts`
- `apps/web/src/components/stay-quote-panel.tsx`
- `apps/web/src/components/stay-detail-page.tsx`

## 2. Portal guest: detalle ergonomico

Implementado:

- `Ver detalle` selecciona reserva y muestra el detalle debajo de la tarjeta seleccionada en mobile/tablet.
- En desktop se conserva el panel lateral de detalle con scroll/foco.
- Paneles secundarios se mueven debajo de la lista en pantallas pequenas para evitar que el detalle quede escondido.
- Textos visibles para huesped reemplazan `hold`, `dev` y `persistidas` por lenguaje final de reserva temporal, pagos y llegada.

Archivos probables:

- `apps/web/src/components/guest-portal-home-page.tsx`

## 3. Portal owner: navegacion por modulos

Problema observado:

- Cada propiedad concentra resumen, reservas, finanzas y bloqueo en una tarjeta amplia.
- El owner necesita revisar tareas concretas por contexto, no recorrer toda la pagina.

Implementado:

- Navegacion modular con `Propiedades`, `Reservas`, `Finanzas`, `Bloqueos` y `Documentos`.
- Propiedades pasan a lista compacta con detalle seleccionado y operaciones resumidas.
- Reservas pasan a una tabla global por propiedad, fecha, huesped, estado, pago y total.
- Bloqueos viven en un modulo propio con formulario por propiedad y listado de bloqueos visibles.
- Contratos y gobernanza quedan dentro de `Documentos`; liquidaciones quedan dentro de `Finanzas`.

Archivos probables:

- `apps/web/src/components/owner-portal-home-page.tsx`
- `apps/web/src/data/owner-portal.ts`

## 4. Ops: consola operativa

Problema observado:

- Ops ya tiene modulos, pero la navegacion ocupa mucho alto y se percibe como pagina larga.
- Las acciones operativas compiten con metricas y paneles de auditoria.

Implementado:

- Barra compacta de modulos Ops con iconos, badges y resumen en tooltip.
- Encabezado del modulo activo para separar navegacion, metricas y contenido operativo.
- Persistencia del ultimo modulo activo en `localStorage`.
- IAM queda oculto para sesiones sin permiso y vuelve a Solicitudes si el modulo persistido no es accesible.
- Auditoria se mantiene como modulo propio y no compite con solicitudes/reservas/operaciones.

Archivos probables:

- `apps/web/src/components/ops-workbench-page.tsx`

## 5. Tablas Ops: escaneo y acciones

Problema observado:

- Las tablas ya existen, pero pueden mejorar para operacion diaria.
- Acciones y estados no siempre quedan visibles cuando hay scroll horizontal.

Implementado:

- Headers sticky en tablas operativas de Ops, IAM, reservas y editor de propiedades.
- Columnas de accion fijas a la derecha donde hay scroll horizontal.
- Columnas finales de estado fijas en tablas de housekeeping y mantenimiento para acelerar cambios.
- Filtros de reservas compactados en una banda propia sobre la tabla.
- Contenedores con alto maximo y scroll interno para conservar contexto de modulo.

Archivos probables:

- `apps/web/src/components/ops-reservations-panel.tsx`
- `apps/web/src/components/ops-iam-panel.tsx`
- `apps/web/src/components/ops-property-editor-panel.tsx`
- `apps/web/src/components/ops-workbench-page.tsx`

## 6. Sesion y cuenta

Problema observado:

- Guest y owner muestran datos de sesion en tarjetas grandes.
- Esto ocupa espacio que deberia priorizar reservas, bloqueos, contratos o tareas.

Implementado:

- Menu compacto de cuenta en headers guest y owner con nombre, correo enmascarado, rol y expiracion.
- Estado de sesion reducido a badge cuando no hay sesion activa o se esta validando.
- Tarjetas principales de sesion retiradas del hero para dar prioridad al contenido operativo.
- Conteo de permisos oculto en guest/owner; queda reservado para Ops/IAM.

Archivos probables:

- `apps/web/src/components/guest-portal-home-page.tsx`
- `apps/web/src/components/owner-portal-home-page.tsx`
- `apps/web/src/components/use-dev-portal-session.ts`

## 7. Lenguaje final por audiencia

Problema observado:

- Guest/owner todavia ven terminos internos como `hold`, `dev` o `persistidas`.
- El lenguaje tecnico debe quedar en Ops.

Implementado:

- Guest/publico: checkout y pago ya no muestran `dev`; `hold` visible queda como reserva temporal.
- Owner: textos visibles reemplazan `owner hold`, `dev`, `persistidas` y `owner` tecnico por lenguaje de propietario.
- API guest/owner/public devuelve labels finales para estados visibles.
- Ops conserva lenguaje tecnico interno como `hold`, confirmacion dev y auditoria.

Archivos probables:

- `apps/web/src/components/guest-portal-home-page.tsx`
- `apps/web/src/components/owner-portal-home-page.tsx`
- `apps/web/src/components/stay-quote-panel.tsx`
- `apps/api/src/routes/guest.ts`
- `apps/api/src/routes/owner.ts`

## Validacion por entrega

Cada mejora debe cerrar con:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:mvp:http
```

Ademas, validar manualmente estas rutas:

- `http://127.0.0.1:3000/`
- `http://127.0.0.1:3000/stay/search?destination=&arrival=&departure=&guests=2`
- `http://127.0.0.1:3000/stay/properties/atitlan-villa-luz`
- `http://127.0.0.1:3000/stay/home`
- `http://127.0.0.1:3000/owner/home`
- `http://127.0.0.1:3000/ops/home`

## Orden recomendado de implementacion

1. Reserva publica con disponibilidad guiada.
2. Portal guest con detalle responsive y lenguaje final.
3. Portal owner por modulos.
4. Ops como consola compacta.
5. Normalizacion de tablas y estados.
6. Menu de cuenta/sesion.
7. Relectura final de textos por audiencia.
