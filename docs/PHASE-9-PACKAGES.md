# Fase 9 — Bonos prepagados

Varios servicios pagados por adelantado, con saldo controlado y descuento
automático al terminar la visita. Es la continuación natural del depósito
(Fase 5) y de la tarjeta de fidelidad (Fase 8): el cliente paga antes y el
negocio asegura la vuelta.

## Flujo

1. El dueño configura los bonos en **Dashboard → Bonos**:
   - servicio incluido, nombre, usos, precio y vigencia en días;
   - puede pausar un bono sin borrar las ventas existentes;
   - `Configuración → Bonos prepagados` controla el interruptor general,
     la visibilidad en el micrositio y los mensajes de WhatsApp.
2. Venta:
   - **En el local:** el dueño elige el bono, nombre, celular y método
     (efectivo/Yape/Plin/tarjeta). Se crea una compra `active`, se registra el
     ingreso en `payments` y se envía el recibo con el enlace de saldo.
   - **Online:** la página pública `/bono/:packageId` abre MercadoPago
     Checkout Pro. La compra queda `pending` hasta que el webhook aprobado la
     activa y envía el recibo.
3. El cliente abre `/bono/t/:token` y ve usos restantes, vencimiento e
   historial. El mismo enlace llega por WhatsApp. En **Hoy**, la cita muestra
   una etiqueta `Bono · N` con el saldo del cliente.
4. Al terminar una cita o walk-in, el diálogo **Terminar y cobrar** consulta
   los bonos aplicables del cliente. Si el dueño elige uno:
   - se descuenta **un uso** y se registra en `package_redemptions`;
   - el monto sugerido pasa a S/ 0 (el servicio ya está pagado);
   - el ledger es único por cita: reintentos no descuentan dos veces.
5. Recordatorios:
   - al usar un bono, WhatsApp indica cuántos quedan;
   - cuando queda 1 uso, se envía un aviso de renovación;
   - 7 días antes del vencimiento (si quedan usos), se envía otro aviso.
   Los avisos son idempotentes por `purchaseId + type` en la tabla
   `whatsapp_messages`, y corren cada 6 horas.

## Datos

| Tabla | Rol |
| --- | --- |
| `service_packages` | Plantilla del negocio: servicio, usos, precio, vigencia, estado |
| `package_purchases` | Bono vendido: cliente, token, saldo, pago, estado, vencimiento |
| `package_redemptions` | Consumo por cita; índice único en `appointment_id` |

Estados de una compra: `pending` (esperando pago online), `active`, `used`
(sin usos), `expired` y `cancelled`.

La vigencia se evalúa de forma perezosa en las lecturas y en el canje; no hace
falta un job para marcar vencidos.

## APIs

### Dueño (`requireAuth` + ownership)

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/dashboard/businesses/:id/packages` | Plantillas, ventas y stats |
| POST | `/api/dashboard/businesses/:id/packages` | Crear plantilla |
| PATCH | `/api/dashboard/businesses/:id/packages/:packageId` | Activar/pausar |
| POST | `/api/dashboard/businesses/:id/packages/:packageId/sell` | Venta manual |
| GET | `/api/dashboard/businesses/:id/appointments/:appointmentId/package` | Bonos aplicables al cobrar |
| POST | `/api/dashboard/businesses/:id/packages/reminders/run` | Ejecutar avisos (soporte/pruebas) |

`PATCH .../appointments/:id/finish` acepta `packagePurchaseId` y devuelve
`packageRedemption: { purchaseId, usesRemaining, status, alreadyRedeemed }`.

### Público

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/public/packages/by-business/:businessId` | Bonos activos del micrositio |
| GET | `/api/public/packages/:packageId` | Detalle + `checkoutAvailable` |
| POST | `/api/public/packages/:packageId/purchase` | Checkout Pro (CSRF) |
| GET | `/api/public/packages/t/:token` | Tarjeta de saldo |

Sin `MERCADOPAGO_ACCESS_TOKEN` la compra online responde `503`
`gateway_not_configured`; la página muestra “compra en el local” y el dueño
puede vender manualmente.

## Pago y contabilidad

- Venta manual: fila en `payments` con `provider = "manual"`, estado
  `approved`, `metadata.type = "service_package"` y `purchaseId`.
- Compra online: preferencia de Checkout Pro con
  `metadata.type = "service_package"`; el webhook actualiza `payments` y llama
  a `activatePackagePurchase()`.
- Un bono usado no genera `service_transactions`: el ingreso ya se reconoció
  al venderlo. Las propinas siguen el flujo normal si el dueño las cobra.

## Configuración (`desk_settings`)

| Campo | Default |
| --- | --- |
| `packagesEnabled` | `true` |
| `showPackagesOnMicrosite` | `true` |
| `packageSaleMessageTemplate` | recibo con `{paquete}`, `{usos}`, `{link}` |
| `packageUseMessageTemplate` | consumo con `{restantes}` |
| `packageLowBalanceMessageTemplate` | aviso “queda 1 uso” |
| `packageExpiryMessageTemplate` | aviso con `{fecha}` y `{restantes}` |

## Migración

```bash
npm run db:ensure-auth
# o: psql "$DATABASE_URL" -f migrations/add-packages.sql
```

Aplicar `add-packages.sql` en producción antes de desplegar el código.

## Verificación

```bash
npm run test:unit        # incluye package expiry/settings/templates
npm run smoke:packages   # 25 checks end-to-end
```

El smoke crea la plantilla, vende en efectivo, comprueba listado público, tarjeta
por token, canje al terminar, ledger, aviso de bajo saldo idempotente y rechazo
de un bono vencido. Limpia sus filas al final. Ejecutar los smokes en serie
(comparten la configuración del negocio demo).
