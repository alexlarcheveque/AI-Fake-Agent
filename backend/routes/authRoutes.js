import express from "express";
import authController from "../controllers/authController.js";

const router = express.Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.get("/verify", authController.verify);
router.patch("/user", authController.updateUser);
router.post("/logout", authController.logout);

// Add this route if it's missing
router.get("/me", authController.getMe);

export default router;
