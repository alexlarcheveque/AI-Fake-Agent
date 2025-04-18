import jwt from "jsonwebtoken";
import User from "../models/User.js";
import logger from "../utils/logger.js";

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logger.warn("Authentication failed: No Bearer token");
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findOne({
        where: { id: decoded.id },
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        logger.warn("Authentication failed: User not found");
        throw new Error("User not found");
      }

      req.user = user;
      req.token = token;
      next();
    } catch (jwtError) {
      logger.warn("Authentication failed: Invalid token", jwtError);
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (error) {
    logger.error("Auth middleware error:", error);
    res.status(401).json({ error: "Please authenticate" });
  }
};

export { auth };
