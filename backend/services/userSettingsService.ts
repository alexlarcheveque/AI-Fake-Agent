import supabase from "../config/supabase.ts";
import {
  UserSettingsInsert,
  UserSettingsModel,
  UserSettingsUtils,
} from "../models/UserSettings.ts";
import logger from "../utils/logger.ts";

export const getUserSettings = async (
  userId: string
): Promise<UserSettingsModel> => {
  try {
    logger.info(`Fetching user settings for userId: ${userId}`);

    // First, check if settings exist for this user
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("uuid", userId)
      .single();

    if (error) {
      // If the error is just that no rows were returned, create default settings
      if (error.code === "PGRST116") {
        logger.info(
          `No settings found for userId: ${userId}, creating defaults`
        );
        return await createUserSettings(userId);
      }

      logger.error(`Error fetching user settings: ${error.message}`);
      throw new Error(error.message);
    }

    // If no data returned for some reason
    if (!data) {
      logger.info(`No settings found for userId: ${userId}, creating defaults`);
      return await createUserSettings(userId);
    }

    logger.info(`Found settings for userId: ${userId}`);
    return UserSettingsUtils.toModel(data);
  } catch (error) {
    logger.error(`Error in getUserSettings: ${error.message}`);
    throw error;
  }
};

export const createUserSettings = async (
  userId: string,
  settings?: UserSettingsModel
): Promise<UserSettingsModel> => {
  try {
    logger.info(`Creating user settings for userId: ${userId}`);
    logger.info(`Settings: ${JSON.stringify(settings)}`);

    const userSettingsData: UserSettingsInsert = {
      uuid: userId,
      agent_name: settings?.agentName || "",
      company_name: settings?.companyName || "",
      agent_state: settings?.agentState || "",
      follow_up_interval_new: settings?.followUpIntervalNew || 2,
      follow_up_interval_in_converesation:
        settings?.followUpIntervalInConversation || 5,
      follow_up_interval_inactive: settings?.followUpIntervalInactive || 30,
    };

    logger.info(`Inserting settings data: ${JSON.stringify(userSettingsData)}`);

    const { data, error } = await supabase
      .from("user_settings")
      .insert([userSettingsData])
      .select()
      .single();

    if (error) {
      logger.error(`Error creating user settings: ${error.message}`);
      throw new Error(error.message);
    }

    if (!data) {
      logger.error("No data returned after creating user settings");
      throw new Error("Failed to create user settings");
    }

    logger.info(`Successfully created user settings for userId: ${userId}`);
    return UserSettingsUtils.toModel(data);
  } catch (error) {
    logger.error(`Error in createUserSettings: ${error.message}`);
    throw error;
  }
};

export const updateUserSettings = async (
  userId: string,
  settings: Partial<UserSettingsModel>
): Promise<UserSettingsModel> => {
  try {
    logger.info(`Updating user settings for userId: ${userId}`);
    logger.info(`Settings: ${JSON.stringify(settings)}`);

    const currentSettings = await getUserSettings(userId);
    logger.info(`Current settings: ${JSON.stringify(currentSettings)}`);

    const updatedSettings = {
      ...currentSettings,
      ...settings,
    };
    logger.info(`Merged settings: ${JSON.stringify(updatedSettings)}`);

    const settingsToInsert: UserSettingsInsert = {
      uuid: userId,
      agent_name: updatedSettings.agentName,
      company_name: updatedSettings.companyName,
      agent_state: updatedSettings.agentState,
      follow_up_interval_new: updatedSettings.followUpIntervalNew,
      follow_up_interval_in_converesation:
        updatedSettings.followUpIntervalInConversation,
      follow_up_interval_inactive: updatedSettings.followUpIntervalInactive,
    };
    logger.info(`Settings to update: ${JSON.stringify(settingsToInsert)}`);

    const { data, error } = await supabase
      .from("user_settings")
      .update(settingsToInsert)
      .eq("uuid", userId)
      .select()
      .single();

    if (error) {
      logger.error(`Error updating user settings: ${error.message}`);
      throw new Error(error.message);
    }

    if (!data) {
      logger.error("No data returned after updating user settings");
      throw new Error("Failed to update user settings");
    }

    logger.info(`Successfully updated user settings for userId: ${userId}`);
    return UserSettingsUtils.toModel(data);
  } catch (error) {
    logger.error(`Error in updateUserSettings: ${error.message}`);
    throw error;
  }
};

export const deleteUserSettings = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from("user_settings")
    .delete()
    .eq("uuid", userId);

  if (error) throw new Error(error.message);
};
