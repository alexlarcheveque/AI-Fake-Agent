import jwt from "jsonwebtoken";
import { getUser, createUser, updateUser } from "../services/userService.js";
import logger from "../utils/logger.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { Op } from "sequelize";

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Create email transporter
let transporter;
try {
  // Check if we're using Gmail
  if (process.env.EMAIL_SERVICE === 'gmail') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else {
    // For other custom SMTP providers
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  
  logger.info('Email transporter configured successfully');
} catch (error) {
  logger.error('Error configuring email transporter:', error);
}

const authController = {
  // Register new user
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await getUser(null, { email });
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Create new user
      const user = await createUser({
        name,
        email,
        password,
      });

      // Initialize settings for this user
      await settingsController.initializeUserSettings(user.id, user.name);

      // Generate token
      const token = generateToken(user);

      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;

      res.status(201).json({ user: userResponse, token });
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).json({ error: "Error creating user" });
    }
  },

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await getUser(null, { email });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check password
      const isValidPassword = await user.checkPassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate token
      const token = generateToken(user);

      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;

      res.json({ user: userResponse, token });
    } catch (error) {
      logger.error("Login error:", error);
      res.status(500).json({ error: "Error logging in" });
    }
  },

  // Verify token
  async verify(req, res) {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      logger.error("Token verification error:", error);
      res.status(500).json({ error: "Error verifying token" });
    }
  },

  // Update user
  async updateUser(req, res) {
    try {
      const updates = req.body;
      const user = req.user;

      // Remove sensitive fields
      delete updates.password;

      // Update user
      const updatedUser = await updateUser(user.id, updates);

      res.json(updatedUser);
    } catch (error) {
      logger.error("User update error:", error);
      res.status(500).json({ error: "Error updating user" });
    }
  },

  // Logout (token invalidation handled on frontend)
  async logout(req, res) {
    try {
      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      logger.error("Logout error:", error);
      res.status(500).json({ error: "Error logging out" });
    }
  },

  // Forgot password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Find user
      const user = await getUser(null, { email });
      if (!user) {
        // Don't reveal if email exists
        return res.json({
          message:
            "If your email is registered, you will receive password reset instructions.",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token to user
      await user.update({
        resetToken,
        resetTokenExpiry,
      });

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      try {
        await transporter.sendMail({
          to: email,
          subject: "Password Reset Request",
          html: `
            <p>You requested a password reset.</p>
            <p>Click this <a href="${resetUrl}">link</a> to reset your password.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>This link will expire in 1 hour.</p>
          `,
        });
        logger.info(`Password reset email sent to: ${email}`);
      } catch (emailError) {
        // Log the error but don't reveal it to the user
        logger.error("Email sending error:", emailError);
        // We still return success to avoid leaking info about valid emails
      }

      res.json({
        message:
          "If your email is registered, you will receive password reset instructions.",
      });
    } catch (error) {
      logger.error("Forgot password error:", error);
      res.status(500).json({ error: "Error processing request" });
    }
  },

  // Reset password
  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      // Find user with valid reset token
      const user = await getUser(null, {
        resetToken: token,
        resetTokenExpiry: {
          [Op.gt]: new Date(),
        },
      });

      if (!user) {
        return res
          .status(400)
          .json({ error: "Invalid or expired reset token" });
      }

      // Update password and clear reset token
      await updateUser(user.id, {
        password,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      logger.error("Reset password error:", error);
      res.status(500).json({ error: "Error resetting password" });
    }
  },

  // GET /auth/me endpoint
  async getMe(req, res) {
    try {
      // The auth middleware should have already verified the token
      // and attached the user to req.user
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Return user data without sensitive information
      res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        // other non-sensitive fields
      });
    } catch (error) {
      console.error("Error in getMe:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
};

export default authController;
