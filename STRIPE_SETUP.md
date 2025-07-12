# Stripe Payment Integration Setup

This guide explains how to set up Stripe payments for subscription management in Real Nurture.

## 🔧 Required Environment Variables

Add these environment variables to your backend `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...                    # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...                  # Stripe webhook endpoint secret
STRIPE_PRO_PRICE_ID=price_...                   # Pro plan price ID from Stripe
STRIPE_UNLIMITED_PRICE_ID=price_...              # Unlimited plan price ID from Stripe

# Frontend URL for redirects
FRONTEND_URL=https://app.realnurture.ai          # Your frontend URL
```

## 📋 Stripe Dashboard Setup

### 1. Create Products and Prices

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Products** → **Create Product**

**Pro Plan:**
- Name: "Real Nurture Pro"
- Pricing: $588/year (recurring annually)
- Copy the Price ID to `STRIPE_PRO_PRICE_ID`

**Unlimited Plan:**
- Name: "Real Nurture Unlimited"  
- Pricing: $1,188/year (recurring annually)
- Copy the Price ID to `STRIPE_UNLIMITED_PRICE_ID`

### 2. Configure Webhooks

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-backend-url.com/api/subscriptions/webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Signing secret** to `STRIPE_WEBHOOK_SECRET`

### 3. Customer Portal Configuration

1. Go to **Settings** → **Billing** → **Customer portal**
2. Configure your branding and settings
3. Enable subscription management features

## 🚀 How It Works

### Subscription Flow

1. **Free Users**: Can upgrade via Settings page
2. **Checkout**: Redirects to Stripe hosted checkout
3. **Payment Success**: Webhook updates user subscription in database
4. **Access Control**: Lead limits automatically enforced based on plan

### Subscription Management

- **Upgrade**: Settings page → "Upgrade to Pro/Unlimited"
- **Manage**: Settings page → "Manage Subscription" (for paid users)
- **Portal**: Stripe Customer Portal for billing, invoices, cancellation

### Cancellation Handling

- Users retain access until subscription period ends
- Automatic downgrade to FREE plan when subscription expires
- Lead limits re-enforced immediately upon downgrade

## 🛠️ API Endpoints

- `GET /api/subscriptions/plans` - Get available plans
- `GET /api/subscriptions/current` - Get user's current subscription
- `POST /api/subscriptions/checkout` - Create checkout session
- `POST /api/subscriptions/portal` - Create customer portal session
- `POST /api/subscriptions/webhook` - Stripe webhook handler

## 🧪 Testing

### Test Mode

Use Stripe test keys during development:
- Test cards: https://stripe.com/docs/testing
- Use `4242424242424242` for successful payments
- Use `4000000000000002` for declined payments

### Production

1. Switch to live mode in Stripe Dashboard
2. Update environment variables with live keys
3. Update webhook endpoint to production URL

## 📊 Plan Details

| Plan | Price | Lead Limit | Features |
|------|-------|------------|----------|
| FREE | $0 | 10 leads | Basic features |
| PRO | $588/year | 1,000 leads | Advanced AI, Priority support |
| UNLIMITED | $1,188/year | Unlimited | All Pro features, Premium support |

## 🔒 Security Notes

- Webhook signatures are verified for security
- Stripe customer IDs are stored for user mapping
- Subscription status is synced in real-time via webhooks
- All payment processing handled by Stripe (PCI compliant)

## 🐛 Troubleshooting

**Webhook not working:**
- Check webhook URL is accessible
- Verify signing secret matches
- Check server logs for errors

**Checkout not redirecting:**
- Verify `FRONTEND_URL` is correct
- Check CORS settings
- Ensure success/cancel URLs are accessible

**Subscription not updating:**
- Check webhook events are configured
- Verify price IDs match products
- Check database permissions for user_settings table 