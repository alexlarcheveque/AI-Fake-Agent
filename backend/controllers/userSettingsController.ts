import {
  getUserSettings as getUserSettingsService,
  createUserSettings as createUserSettingsService,
  updateUserSettings as updateUserSettingsService,
  deleteUserSettings as deleteUserSettingsService,
} from "../services/userSettingsService.ts";
import logger from "../utils/logger.ts";

export const getUserSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const userSettings = await getUserSettingsService(userId);
    res.json(userSettings);
  } catch (error) {
    logger.error(`Error in getUserSettings: ${error.message}`);
    res
      .status(500)
      .json({ message: "Error getting user settings", error: error.message });
  }
};

export const createUserSettings = async (req, res) => {
  try {
    const { userId, settings } = req.body;
    const userSettings = await createUserSettingsService(userId, settings);
    res.json(userSettings);
  } catch (error) {
    logger.error(`Error in createUserSettings: ${error.message}`);
    res
      .status(500)
      .json({ message: "Error creating user settings", error: error.message });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;
    const userSettings = await updateUserSettingsService(userId, settings);
    res.json(userSettings);
  } catch (error) {
    logger.error(`Error in updateUserSettings: ${error.message}`);
    res
      .status(500)
      .json({ message: "Error updating user settings", error: error.message });
  }
};

export const deleteUserSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    await deleteUserSettingsService(userId);
    res.json({ success: true });
  } catch (error) {
    logger.error(`Error in deleteUserSettings: ${error.message}`);
    res
      .status(500)
      .json({ message: "Error deleting user settings", error: error.message });
  }
};

// Get settings for the currently authenticated user
export const getCurrentUserSettings = async (req, res) => {
  try {
    // Get the authenticated user's ID from the request
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    logger.info(`Getting settings for authenticated user: ${userId}`);
    const userSettings = await getUserSettingsService(userId);
    res.json(userSettings);
  } catch (error) {
    logger.error(`Error in getCurrentUserSettings: ${error.message}`);
    res.status(500).json({
      message: "Error getting current user settings",
      error: error.message,
    });
  }
};

// Update settings for the currently authenticated user
export const updateCurrentUserSettings = async (req, res) => {
  try {
    // Get the authenticated user's ID from the request
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const settings = req.body;
    logger.info(`Updating settings for authenticated user: ${userId}`);
    const userSettings = await updateUserSettingsService(userId, settings);
    res.json(userSettings);
  } catch (error) {
    logger.error(`Error in updateCurrentUserSettings: ${error.message}`);
    res.status(500).json({
      message: "Error updating current user settings",
      error: error.message,
    });
  }
};
