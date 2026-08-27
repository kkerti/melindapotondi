# Vendure Barion Plugin

Integrates the [Barion](https://www.barion.com/) payment gateway with Vendure.

## How it works

1. `initiateBarionPayment` (shop API mutation) transitions the order to `ArrangingPayment`
   and adds a `barion` payment via `orderService.addPaymentToOrder`.
   This invokes `barionPaymentHandler.createPayment`, which calls the Barion
   `v2/Payment/Start` API and marks the Vendure payment as `Authorized`, storing the
   Barion `GatewayUrl` in its metadata.
2. The storefront redirects the customer to that `GatewayUrl`. Upon completion Barion
   redirects back to `redirectUrl` and sends a server-to-server callback (IPN) to
   `callbackUrl` (`POST /payments/barion/callback`).
3. The callback controller resolves the payment state via Barion's
   `v4/payment/{id}/paymentstate` API and, when `Succeeded`, calls
   `orderService.settlePayment` so the order moves to `PaymentSettled`.

## Configuration

The plugin is initialized in `vendure-config.ts` from environment variables:

| Env var                | Description                                              | Default                                       |
| ---------------------- | -------------------------------------------------------- | --------------------------------------------- |
| `BARION_POS_KEY`       | POS key of the Barion shop                               |                                               |
| `BARION_PAYEE_EMAIL`   | Payee email for the transaction                          |                                               |
| `BARION_SANDBOX`       | `"true"` to use `api.test.barion.com`                    | `false`                                       |
| `BARION_CALLBACK_URL`  | Public URL Barion calls with payment state updates (IPN) | `http://localhost:3000/payments/barion/callback` |
| `BARION_REDIRECT_URL`  | URL the customer is redirected to after paying           | `http://localhost:4321/checkout/barion-return`  |

## Local development: you MUST run the local tunnel

Barion sends the payment callback (IPN) **server-to-server** to `BARION_CALLBACK_URL`.
`http://localhost:3000` is not reachable from Barion's servers, so in local/sandbox
development the callback URL must point at a publicly reachable tunnel to your machine.

Start the tunnel alongside the Vendure dev server and keep it running for the whole
checkout flow:

```sh
npx localtunnel --port 3000 --subdomain melinda-vendure
```

This forwards `https://melinda-vendure.loca.lt` to your local `:3000`, and
`milindapotondi`'s `.env` already sets:

```sh
BARION_CALLBACK_URL=https://melinda-vendure.loca.lt/payments/barion/callback
```

If the subdomain is taken, drop `--subdomain` (you get a random `.loca.lt` domain)
and update `BARION_CALLBACK_URL` in `vendure/.env` accordingly.

### What happens if the tunnel is down

The `Payment/Start` call still succeeds and the customer can pay on Barion's site, but
the callback is never delivered. The Vendure payment stays `Authorized` (the storefront
shows the pending screen indefinitely) and the order never settles on its own — it must
be settled manually in the Admin UI. Restart the tunnel, then either re-run the flow or
settle the payment from the admin.

### Caveats

- `loca.lt` may reject requests based on the `User-Agent` header. If Barion's callback
  gets a 403, the callback never arrives; switch to a tunnel that forwards headers
  verbatim (e.g. `cloudflared tunnel`) instead.
- `apiOptions.trustProxy` is `false` in dev (see `vendure-config.ts`), so the server
  ignores `X-Forwarded-*` headers from the tunnel. Absolute URLs the server generates
  will still use `localhost`. Toggle `trustProxy: 1` in dev if that matters.