import {
  getUserSettings as getUserSettingsService,
  createUserSettings as createUserSettingsService,
  updateUserSettings as updateUserSettingsService,
} from "../services/userSettingsService.ts";

export const getUserSettings = async (req, res) => {
  const { userId } = req.params;
  const userSettings = await getUserSettingsService(userId);
  res.json(userSettings);
};

export const createUserSettings = async (req, res) => {
  const { userId, settings } = req.body;
  const userSettings = await createUserSettingsService(userId, settings);
  res.json(userSettings);
};

export const updateUserSettings = async (req, res) => {
  const { userId, settings } = req.body;
  const userSettings = await updateUserSettingsService(userId, settings);
  res.json(userSettings);
};

export const deleteUserSettings = async (req, res) => {
  const { userId } = req.params;
  const userSettings = await deleteUserSettingsService(userId);
  res.json(userSettings);
};
