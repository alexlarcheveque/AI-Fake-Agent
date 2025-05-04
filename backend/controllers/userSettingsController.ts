import {
  getUserSettings as getUserSettingsService,
  createUserSettings as createUserSettingsService,
  updateUserSettings as updateUserSettingsService,
  deleteUserSettings as deleteUserSettingsService,
} from "../services/userSettingsService.ts";
import logger from "../utils/logger.ts";

export const getUserSettings = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const settings = req.body.settings || req.body;

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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const settings = req.body.settings || req.body;

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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    await deleteUserSettingsService(userId);
    res.json({ success: true });
  } catch (error) {
    logger.error(`Error in deleteUserSettings: ${error.message}`);
    res
      .status(500)
      .json({ message: "Error deleting user settings", error: error.message });
  }
};
