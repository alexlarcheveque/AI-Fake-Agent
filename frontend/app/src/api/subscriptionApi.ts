import apiClient from "./apiClient";

export interface SubscriptionPlan {
  name: string;
  priceId: string | null;
  leadLimit: number;
  price: number;
}

export interface SubscriptionPlans {
  FREE: SubscriptionPlan;
  PRO: SubscriptionPlan;
  UNLIMITED: SubscriptionPlan;
}

export interface CurrentSubscription {
  plan: string;
  status: string | null;
  subscriptionId: string | null;
}

/**
 * Get available subscription plans
 */
export const getSubscriptionPlans = async (): Promise<SubscriptionPlans> => {
  const response = await apiClient.get("/subscriptions/plans");
  return response.data;
};

/**
 * Get current user subscription details
 */
export const getCurrentSubscription = async (): Promise<CurrentSubscription> => {
  const response = await apiClient.get("/subscriptions/current");
  return response.data;
};

/**
 * Create a checkout session for subscription upgrade
 */
export const createCheckoutSession = async (planType: "PRO" | "UNLIMITED"): Promise<{ url: string }> => {
  const response = await apiClient.post("/subscriptions/checkout", { planType });
  return response.data;
};

/**
 * Create a customer portal session for subscription management
 */
export const createCustomerPortalSession = async (): Promise<{ url: string }> => {
  const response = await apiClient.post("/subscriptions/portal");
  return response.data;
};

export default {
  getSubscriptionPlans,
  getCurrentSubscription,
  createCheckoutSession,
  createCustomerPortalSession,
}; 