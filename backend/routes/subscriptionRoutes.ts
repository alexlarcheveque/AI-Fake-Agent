import express from "express";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  getCurrentSubscription,
  handleStripeWebhook,
  getSubscriptionPlans,
} from "../controllers/subscriptionController.ts";
import authMiddleware from "../middleware/authMiddleware.ts";

const router = express.Router();

// Get available subscription plans (public endpoint)
router.get("/plans", getSubscriptionPlans);

// Protected routes (require authentication)
router.get("/current", authMiddleware, getCurrentSubscription);
router.post("/checkout", authMiddleware, createCheckoutSession);
router.post("/portal", authMiddleware, createCustomerPortalSession);

// Webhook endpoint (public, verified by Stripe signature)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

export default router;
