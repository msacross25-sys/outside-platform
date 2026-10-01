# OUTSiiDE Payments and Creator Payouts

OUTSiiDE uses Stripe for two separate money flows:

1. buyers purchase OUTSiiDE coins through hosted Stripe Checkout
2. eligible creators receive approved payouts through Stripe Connect

OUTSiiDE remains the financial source of truth for coin balances, gifts, creator earnings, payout reservations and audit history.

## Required production environment

```
STRIPE_SECRET_KEY=<server-only Stripe secret>
STRIPE_WEBHOOK_SECRET=<signing secret for /api/webhooks/stripe>
STRIPE_TEST_MODE=false
```

Never expose the Stripe secret key or webhook signing secret to browser code.

## Coin purchases

Coin packages are defined only in `lib/coinPackages.ts`.

The browser sends only a package key.

OUTSiiDE creates a local `CoinPurchase` row before Checkout and sends Stripe:
- local purchase ID
- buyer user ID
- server-owned dollar amount
- server-owned coin quantity

The Checkout success page does not credit coins.

Coins are credited only when a valid signed Stripe webhook reports a paid Checkout Session.

## Webhook idempotency

`POST /api/webhooks/stripe` verifies the raw Stripe signature before processing.

A purchase can be credited only once. If Stripe retries the same event:
- the purchase is already PAID
- the wallet is not incremented again

Provider session, payment-intent and charge identifiers are stored for reconciliation.

## Refunds and chargebacks

Refund and dispute events reverse previously purchased coins.

For a full refund:
- the purchase becomes REFUNDED
- all purchased coins are reversed

For a partial refund:
- the corresponding proportional coin amount is reversed
- the purchase remains PAID until the full purchase amount has been refunded

For a chargeback:
- the purchase becomes CHARGEBACK
- all remaining purchased coins are reversed

The wallet is intentionally allowed to become negative. This prevents a buyer from spending coins first and then using a refund or chargeback to create free gifted value. A negative balance blocks new gifts because the normal gift balance check still applies.

Do not manually increase a wallet to hide a refund/chargeback deficit.

## Creator payout onboarding

Creators connect a payout account through:

```
POST /api/wallet/payout/onboarding
```

OUTSiiDE creates a Stripe Connect Express account and stores only:
- provider name
- provider account reference
- provider onboarding/readiness state

The Stripe account link is short-lived and generated server-side.

`GET /api/wallet/payout/onboarding` refreshes the current provider state.

A creator cannot request a payout until:
- account is active
- creator payout account exists
- Stripe reports details submitted
- Stripe reports payouts enabled
- there are no recent financial-exception holds
- minimum payout balance is met

## Payout flow

Creator:
1. requests payout
2. OUTSiiDE reserves the currently available creator balance
3. payout enters PENDING for the normal biweekly cycle

Finance:
1. reviews the payout and creator standing
2. moves PENDING → PROCESSING
3. moves PROCESSING → PAID only when ready to send funds

The PAID action creates the Stripe Connect transfer first.

Stripe transfer idempotency uses the OUTSiiDE payout ID, so retrying the same finance action cannot intentionally create a second transfer.

OUTSiiDE stores the returned Stripe transfer ID on `CreatorPayout.providerTransactionId`.

If the provider transfer fails, the payout is not marked PAID.

## Audit trail

OUTSiiDE records:
- local CoinPurchase state
- provider identifiers
- refund/chargeback amounts
- reversed coin amount
- payout state transitions
- payout ledger entries
- provider transfer ID
- finance audit reason
- actor in AuditLog

Finance operators should always enter a meaningful reason for payout state changes.

## Stripe dashboard setup

Before production launch:

1. create the production Stripe account
2. enable Stripe Connect
3. configure the public business information required by Stripe
4. create a production webhook endpoint:
   ```
   https://<production-domain>/api/webhooks/stripe
   ```
5. subscribe at minimum to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
6. place the resulting webhook signing secret in the production secret store
7. test a real Stripe test-mode Checkout and Connect onboarding before enabling live keys

Do not paste live Stripe keys into source control, chat, issue trackers or shell commands that will preserve them in history.

## Reconciliation

Before launch, create an owner finance reconciliation procedure that compares:
- Stripe successful payments vs PAID CoinPurchase rows
- Stripe refunds/disputes vs refund/chargeback purchase states
- Stripe transfers vs PAID CreatorPayout rows

Any mismatch should block further manual payout processing until investigated.

## CI

CI sets:

```
STRIPE_TEST_MODE=true
```

No Stripe network request is made.

The runtime smoke suite verifies:
- unknown/underage user cannot buy coins
- server-defined Checkout creation
- signed paid webhook credits exact coins
- repeated paid webhook does not double-credit
- payment-intent/charge IDs reconcile
- refund reverses purchased coins
- creator Connect onboarding becomes payout-ready
- payout request reserves creator earnings
- Finance PROCESSING transition
- Finance PAID transition creates a provider transfer ID

Strict production preflight separately runs with Stripe test mode disabled and requires Stripe secret + webhook configuration.
