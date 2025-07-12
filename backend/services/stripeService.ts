import Stripe from "stripe";
import supabase from "../config/supabase.ts";
import { getUserSettings, updateUserSettings } from "./userSettingsService.ts";
import { handleSubscriptionDowngrade } from "./subscriptionDowngradeService.ts";
import logger from "../utils/logger.ts";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Free",
    priceId: null,
    leadLimit: 10,
    price: 0,
  },
  PRO: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID as string,
    leadLimit: 1000,
    price: 588, // $588/year ($49/month equivalent, billed annually)
  },
  UNLIMITED: {
    name: "Unlimited",
    priceId: process.env.STRIPE_UNLIMITED_PRICE_ID as string,
    leadLimit: Infinity,
    price: 1188, // $1188/year ($99/month equivalent, billed annually)
  },
};

/**
 * Create a Stripe customer for a user
 */
export const createStripeCustomer = async (
  userId: string,
  email: string
): Promise<string> => {
  try {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    logger.info(`Created Stripe customer ${customer.id} for user ${userId}`);
    return customer.id;
  } catch (error) {
    logger.error(`Error creating Stripe customer: ${error.message}`);
    throw new Error(`Failed to create Stripe customer: ${error.message}`);
  }
};

/**
 * Create a checkout session for subscription upgrade
 */
export const createCheckoutSession = async (
  userId: string,
  planType: "PRO" | "UNLIMITED",
  successUrl: string,
  cancelUrl: string
): Promise<string> => {
  try {
    const userSettings = await getUserSettings(userId);

    // Get or create Stripe customer
    let customerId = userSettings.stripe_customer_id;
    if (!customerId) {
      // Need user email - get from Supabase auth
      const { data: user, error } = await supabase.auth.admin.getUserById(
        userId
      );
      if (error || !user?.user?.email) {
        throw new Error("User email not found");
      }

      customerId = await createStripeCustomer(userId, user.user.email);

      // Update user settings with customer ID
      await updateUserSettings(userId, { stripe_customer_id: customerId });
    }

    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan.priceId) {
      logger.error(
        `Missing price ID for plan type: ${planType}. Check STRIPE_${planType}_PRICE_ID environment variable.`
      );
      throw new Error(`Invalid plan type: ${planType}`);
    }

    logger.info(`Using price ID ${plan.priceId} for plan ${planType}`);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planType,
      },
    });

    logger.info(
      `Created checkout session ${session.id} for user ${userId} plan ${planType}`
    );

    if (!session.url) {
      logger.error(`Stripe checkout session ${session.id} returned null URL`);
      throw new Error("Stripe checkout session returned null URL");
    }

    logger.info(`Checkout URL: ${session.url}`);
    return session.url;
  } catch (error) {
    logger.error(`Error creating checkout session: ${error.message}`);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }
};

/**
 * Create a customer portal session for subscription management
 */
export const createCustomerPortalSession = async (
  userId: string,
  returnUrl: string
): Promise<string> => {
  try {
    const userSettings = await getUserSettings(userId);

    if (!userSettings.stripe_customer_id) {
      throw new Error("No Stripe customer found for user");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: userSettings.stripe_customer_id,
      return_url: returnUrl,
    });

    logger.info(`Created customer portal session for user ${userId}`);
    return session.url;
  } catch (error) {
    logger.error(`Error creating customer portal session: ${error.message}`);
    throw new Error(
      `Failed to create customer portal session: ${error.message}`
    );
  }
};

/**
 * Handle subscription status changes from Stripe webhooks
 */
export const handleSubscriptionUpdate = async (
  subscription: Stripe.Subscription
): Promise<void> => {
  try {
    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;

    // Find user by Stripe customer ID
    const { data: userSettings, error } = await supabase
      .from("user_settings")
      .select("uuid, subscription_plan")
      .eq("stripe_customer_id", customerId)
      .single();

    if (error || !userSettings) {
      logger.error(`User not found for Stripe customer ${customerId}`);
      return;
    }

    const userId = userSettings.uuid;
    const oldPlan = (userSettings.subscription_plan || "FREE") as
      | "FREE"
      | "PRO"
      | "UNLIMITED";
    let newPlan: "FREE" | "PRO" | "UNLIMITED" = "FREE";

    // Determine plan type based on subscription status and price
    if (
      subscription.status === "active" ||
      subscription.status === "trialing"
    ) {
      const priceId = subscription.items.data[0]?.price?.id;

      if (priceId === SUBSCRIPTION_PLANS.PRO.priceId) {
        newPlan = "PRO";
      } else if (priceId === SUBSCRIPTION_PLANS.UNLIMITED.priceId) {
        newPlan = "UNLIMITED";
      }
    }

    // Handle downgrade logic if plan changed
    if (oldPlan !== newPlan) {
      logger.info(
        `Plan change detected for user ${userId}: ${oldPlan} → ${newPlan}`
      );

      try {
        const downgradeResult = await handleSubscriptionDowngrade(
          userId,
          newPlan,
          oldPlan
        );
        logger.info(
          `Downgrade handling result: ${JSON.stringify(downgradeResult)}`
        );
      } catch (downgradeError) {
        logger.error(`Error handling downgrade: ${downgradeError.message}`);
        // Continue with basic plan update even if downgrade logic fails
      }
    }

    // Update user subscription in database
    await updateUserSettings(userId, {
      subscription_plan: newPlan,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
    });

    logger.info(
      `Updated subscription for user ${userId}: plan=${newPlan}, status=${subscription.status}`
    );
  } catch (error) {
    logger.error(`Error handling subscription update: ${error.message}`);
    throw error;
  }
};

/**
 * Handle subscription deletion (cancellation)
 */
export const handleSubscriptionDeleted = async (
  subscription: Stripe.Subscription
): Promise<void> => {
  try {
    const customerId = subscription.customer as string;

    // Find user by Stripe customer ID
    const { data: userSettings, error } = await supabase
      .from("user_settings")
      .select("uuid")
      .eq("stripe_customer_id", customerId)
      .single();

    if (error || !userSettings) {
      logger.error(`User not found for Stripe customer ${customerId}`);
      return;
    }

    const userId = userSettings.uuid;

    // Downgrade to FREE plan
    await updateUserSettings(userId, {
      subscription_plan: "FREE",
      stripe_subscription_id: null,
      subscription_status: "canceled",
    });

    logger.info(
      `Downgraded user ${userId} to FREE plan after subscription cancellation`
    );
  } catch (error) {
    logger.error(`Error handling subscription deletion: ${error.message}`);
    throw error;
  }
};

/**
 * Get current subscription details for a user
 */
export const getUserSubscription = async (
  userId: string
): Promise<{
  plan: string;
  status: string | null;
  subscriptionId: string | null;
}> => {
  try {
    const userSettings = await getUserSettings(userId);

    return {
      plan: userSettings.subscription_plan || "FREE",
      status: userSettings.subscription_status || null,
      subscriptionId: userSettings.stripe_subscription_id || null,
    };
  } catch (error) {
    logger.error(`Error getting user subscription: ${error.message}`);
    throw error;
  }
};

export default {
  createCheckoutSession,
  createCustomerPortalSession,
  handleSubscriptionUpdate,
  handleSubscriptionDeleted,
  getUserSubscription,
  SUBSCRIPTION_PLANS,
};
