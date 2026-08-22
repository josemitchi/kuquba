# Estado del proyecto KUQUBA

Ultima actualizacion: 2026-08-22

## Estado actual

- Monorepo inicial creado con `apps/web`, `apps/api` y `packages/config`.
- Landing publica y portales base disponibles en `/`, `/stay`, `/owner` y `/ops`.
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
- Flujo passwordless dev con `guest.dev@kuquba.local` y OTP `000000`.

## Siguiente incremento recomendado

Construir la experiencia publica de busqueda y seleccion de estancia en el sitio, sin introducir reglas comerciales definitivas.

Alcance propuesto:

- Crear una seccion de resultados para `/stay` o una ruta nueva `/stay/search`.
- Usar datos mock tipados para propiedades, unidades y disponibilidad.
- Mostrar tarjetas de estancias con destino, capacidad, amenidades, imagen, disponibilidad y CTA.
- Conectar el formulario de busqueda de la landing con esa experiencia.
- Mantener precios, pagos, politicas de cancelacion y contratos como placeholders explicitos.

## Criterios de aceptacion del siguiente incremento

- La navegacion desde la landing hacia busqueda de estancias funciona.
- La UI es responsive y consistente con el lenguaje visual actual.
- No se presentan inventarios, tarifas ni reglas financieras como datos reales.
- `npm run lint`, `npm run typecheck` y `npm run build` pasan.

