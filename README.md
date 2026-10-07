# Sedative-Physio-Blog

New design in progress.

## Razorpay Setup

### Environment Variables

Set the following variables in Vercel (or your `.env` file locally):

| Variable | Description |
|---|---|
| `RAZORPAY_KEY_ID` | Your Razorpay key ID (`rzp_test_...` for dev, `rzp_live_...` for prod) |
| `RAZORPAY_KEY_SECRET` | Your Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret from the Razorpay dashboard |
| `CORS_ALLOWED_ORIGINS` | Must include your production domain (e.g. `https://yourapp.vercel.app`) |

### Webhook Registration

Register a webhook in the [Razorpay dashboard](https://dashboard.razorpay.com/app/webhooks) pointing to:

```
https://<your-domain>/api/payments/webhook
```

Enable these events:
- `order.paid`
- `payment.captured`
- `payment.failed`
- `refund.processed`

### Keys

- Use `rzp_test_...` keys in development
- Use `rzp_live_...` keys in production
- **Never** commit `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to source control
