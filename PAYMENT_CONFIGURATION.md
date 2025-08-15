# Payment Gateway Configuration

This document outlines the environment variables that need to be added to your `.env` file to enable payment processing functionality.

## Required Environment Variables

Add the following variables to your `.env` file:

### Stripe Configuration
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
```

### PayPal Configuration
```
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
```

### Razorpay Configuration
```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### Flutterwave Configuration
```
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-your_flutterwave_public_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_flutterwave_secret_key
FLUTTERWAVE_ENCRYPTION_KEY=your_flutterwave_encryption_key
```

### Paystack Configuration
```
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
```

### Payment System Configuration
```
PAYMENT_CURRENCY=USD
PAYMENT_WEBHOOK_TIMEOUT=30000
PAYMENT_MAX_RETRY_ATTEMPTS=3
```

## Getting API Keys

### Stripe
1. Sign up at https://stripe.com
2. Go to Developers > API keys
3. Copy your publishable key and secret key
4. Set up webhooks in the Stripe dashboard

### PayPal
1. Sign up at https://developer.paypal.com
2. Create an app in the developer dashboard
3. Copy your client ID and secret
4. Set up webhooks in the PayPal developer dashboard

### Razorpay
1. Sign up at https://razorpay.com
2. Go to Settings > API Keys
3. Generate and copy your key ID and secret
4. Set up webhooks in the Razorpay dashboard

### Flutterwave
1. Sign up at https://flutterwave.com
2. Go to Settings > API Keys
3. Copy your public key and secret key
4. Set up webhooks in the Flutterwave dashboard

### Paystack
1. Sign up at https://paystack.com
2. Go to Settings > API Keys
3. Copy your public key and secret key
4. Set up webhooks in the Paystack dashboard

## Security Notes

- Never commit your `.env` file to version control
- Use test keys for development and live keys for production
- Rotate your API keys regularly
- Keep your webhook secrets secure
- Use environment-specific configurations

## Testing

After adding the environment variables:

1. Install the new dependencies: `npm install`
2. Restart your application
3. Test payment processing with test credentials
4. Verify webhook endpoints are accessible

## Support

For issues with specific payment gateways, refer to their official documentation:
- [Stripe Documentation](https://stripe.com/docs)
- [PayPal Documentation](https://developer.paypal.com/docs)
- [Razorpay Documentation](https://razorpay.com/docs)
- [Flutterwave Documentation](https://developer.flutterwave.com/docs)
- [Paystack Documentation](https://paystack.com/docs)
