# Estado del proyecto KUQUBA

Ultima actualizacion: 2026-08-22

## Estado actual

- Monorepo inicial creado con `apps/web`, `apps/api` y `packages/config`.
- Landing publica y portales base disponibles en `/`, `/stay`, `/owner` y `/ops`.
- Experiencia publica inicial de busqueda y seleccion disponible en `/stay/search`.
- API Fastify disponible con healthcheck, bootstrap publico y kernel inicial de identidad.
- Prisma configurado con migraciones versionadas y seed IAM dev.
- PostgreSQL y Redis corren en Docker Compose.
- Web y API dev corren localmente con `npm run dev`, fuera de Docker por ahora.
- Commit inicial creado: `eee774c chore: bootstrap kuquba platform`.

## Validacion reciente

- `npm run prisma:generate`
- `npm run prisma:deploy`
- `npm run prisma:seed`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm audit`
- `GET /health`
- `GET /stay/search?destination=Antigua&guests=2`
- Flujo passwordless dev con `guest.dev@kuquba.local` y OTP `000000`.

## Incremento publico implementado

Se agrego una experiencia de descubrimiento de estancias para huespedes, sin introducir reglas comerciales definitivas.

Alcance entregado:

- Ruta publica `/stay/search` para resultados de estancias.
- Datos mock tipados para propiedades, unidades conceptuales y disponibilidad.
- Tarjetas de estancias con destino, capacidad, amenidades, imagen, disponibilidad y CTA.
- Formulario de busqueda de la landing conectado por `GET` a `/stay/search`.
- Precios, pagos, politicas de cancelacion e inventario real marcados como pendientes de confirmacion.

## Siguiente incremento recomendado

Construir el detalle publico de estancia y la solicitud de propuesta.

Alcance propuesto:

- Crear ruta `/stay/search/[id]` o `/stay/properties/[id]` para detalle de estancia.
- Reutilizar el dataset mock tipado hasta tener catalogo persistido.
- Mostrar galeria, reglas operativas conceptuales, amenidades extendidas y calendario no definitivo.
- Agregar formulario de solicitud con nombre, contacto, fechas, huespedes e interes.
- Persistir solicitudes en API solo si se define el modelo minimo de lead, o dejarlas como mock si aun no se abre captura.

## Criterios de aceptacion del siguiente incremento

- Cada resultado publico puede abrir un detalle consistente.
- La solicitud no promete disponibilidad, precio ni reserva confirmada.
- La UI es responsive y mantiene separada la busqueda publica del portal `/stay`.
- `npm run lint`, `npm run typecheck` y `npm run build` pasan.
