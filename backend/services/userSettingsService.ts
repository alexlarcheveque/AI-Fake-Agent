import supabase from "../config/supabase.ts";
import { UserSettingsInsert, UserSettingsRow } from "../models/UserSettings.ts";
import logger from "../utils/logger.ts";

export const getUserSettings = async (
  userId: string
): Promise<UserSettingsRow> => {
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
    return data;
  } catch (error) {
    logger.error(`Error in getUserSettings: ${error.message}`);
    throw error;
  }
};

export const createUserSettings = async (
  userId: string,
  settings?: UserSettingsInsert
): Promise<UserSettingsRow> => {
  try {
    logger.info(`Creating user settings for userId: ${userId}`);
    logger.info(`Settings: ${JSON.stringify(settings)}`);

    const userSettingsData: UserSettingsInsert = {
      uuid: userId,
      agent_name: settings?.agent_name || "",
      company_name: settings?.company_name || "",
      agent_state: settings?.agent_state || "",
      follow_up_interval_new: settings?.follow_up_interval_new || 2,
      follow_up_interval_in_converesation:
        settings?.follow_up_interval_in_converesation || 5,
      follow_up_interval_inactive: settings?.follow_up_interval_inactive || 180,
      enable_voice_calls: settings?.enable_voice_calls ?? true,
      voice_follow_up_interval_warm:
        settings?.voice_follow_up_interval_warm ?? 30,
      voice_follow_up_interval_cold:
        settings?.voice_follow_up_interval_cold ?? 60,
      voice_follow_up_interval_inactive:
        settings?.voice_follow_up_interval_inactive ?? 180,
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
    return data;
  } catch (error) {
    logger.error(`Error in createUserSettings: ${error.message}`);
    throw error;
  }
};

export const updateUserSettings = async (
  userId: string,
  settings: Partial<UserSettingsRow>
): Promise<UserSettingsRow> => {
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
      agent_name: updatedSettings.agent_name,
      company_name: updatedSettings.company_name,
      agent_state: updatedSettings.agent_state,
      follow_up_interval_new: updatedSettings.follow_up_interval_new,
      follow_up_interval_in_converesation:
        updatedSettings.follow_up_interval_in_converesation,
      follow_up_interval_inactive: updatedSettings.follow_up_interval_inactive,
      subscription_plan: updatedSettings.subscription_plan,
      stripe_customer_id: updatedSettings.stripe_customer_id,
      stripe_subscription_id: updatedSettings.stripe_subscription_id,
      subscription_status: updatedSettings.subscription_status,
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
    return data;
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
