import { Request, Response } from "express";
import stripeService from "../services/stripeService.ts";
import { getUserSubscription } from "../services/stripeService.ts";
import logger from "../utils/logger.ts";

/**
 * Create a checkout session for subscription upgrade
 */
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { planType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!planType || !["PRO", "UNLIMITED"].includes(planType)) {
      return res.status(400).json({ error: "Invalid plan type" });
    }

    // URLs for success and cancel redirects
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/settings?success=true&plan=${planType}`;
    const cancelUrl = `${baseUrl}/settings?canceled=true`;

    const checkoutUrl = await stripeService.createCheckoutSession(
      userId,
      planType,
      successUrl,
      cancelUrl
    );

    res.json({ url: checkoutUrl });
  } catch (error) {
    logger.error(`Error creating checkout session: ${error.message}`);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
};

/**
 * Create a customer portal session for subscription management
 */
export const createCustomerPortalSession = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const returnUrl = `${baseUrl}/settings`;

    const portalUrl = await stripeService.createCustomerPortalSession(
      userId,
      returnUrl
    );

    res.json({ url: portalUrl });
  } catch (error) {
    logger.error(`Error creating customer portal session: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current user subscription details
 */
export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const subscription = await getUserSubscription(userId);
    res.json(subscription);
  } catch (error) {
    logger.error(`Error getting subscription: ${error.message}`);
    res.status(500).json({ error: "Failed to get subscription details" });
  }
};

/**
 * Stripe webhook endpoint
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_LOCAL;

    if (!endpointSecret) {
      logger.error("Stripe webhook secret not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Import Stripe to verify webhook
    const Stripe = require("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await stripeService.handleSubscriptionUpdate(event.data.object);
        break;

      case "customer.subscription.deleted":
        await stripeService.handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        // Handle successful payment if needed
        logger.info(
          `Payment succeeded for subscription: ${event.data.object.subscription}`
        );
        break;

      case "invoice.payment_failed":
        // Handle failed payment if needed
        logger.warn(
          `Payment failed for subscription: ${event.data.object.subscription}`
        );
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error(`Error handling webhook: ${error.message}`);
    res.status(500).json({ error: "Webhook handling failed" });
  }
};

/**
 * Get available subscription plans
 */
export const getSubscriptionPlans = async (req: Request, res: Response) => {
  try {
    res.json(stripeService.SUBSCRIPTION_PLANS);
  } catch (error) {
    logger.error(`Error getting subscription plans: ${error.message}`);
    res.status(500).json({ error: "Failed to get subscription plans" });
  }
};
