import express from "express";
import authController from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.get("/verify", auth, authController.verify);
router.patch("/user", auth, authController.updateUser);
router.post("/logout", auth, authController.logout);

// Add this route if it's missing
router.get("/me", auth, authController.getMe);

export default router;
