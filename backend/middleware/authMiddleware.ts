import supabase from "../config/supabase.ts";
import logger from "../utils/logger.ts";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token and get user data from Supabase
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error) {
        logger.error("Supabase auth error:", error.message);
        // Use a more specific error message if possible, e.g., based on error.status
        if (
          error.message === "invalid JWT" ||
          error.message.includes("expired")
        ) {
          return res
            .status(401)
            .json({ message: "Not authorized, token failed" });
        } else {
          // Generic error for other Supabase issues
          return res
            .status(401)
            .json({ message: "Not authorized, Supabase error" });
        }
      }

      if (!user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      // Attach user to the request object (excluding potentially sensitive info if needed)
      // You might want to select specific fields depending on what your controllers need
      req.user = user;
      next();
    } catch (error) {
      logger.error("Token verification error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

export default protect;
