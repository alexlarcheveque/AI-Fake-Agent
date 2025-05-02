import supabase from "../config/supabase.ts";
import {
  UserSettings,
  UserSettingsInsert,
  UserSettingsUtils,
} from "../models/UserSettings.ts";

export const getUserSettings = async (
  userId: string
): Promise<UserSettings[]> => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("uuid", userId);

  if (error) throw new Error(error.message);
  return data.map((settings) => UserSettingsUtils.toModel(settings));
};

export interface CreateUserSettingsParams {
  agentName?: string | null;
  companyName?: string | null;
  agentState?: string | null;
  agentCity?: string[] | null;
  aiAssistantEnabled?: boolean;
  followUpIntervalNew?: number | null;
  followUpIntervalInConversation?: number | null;
  followUpIntervalQualified?: number | null;
  followUpIntervalAppointmentSet?: number | null;
  followUpIntervalConverted?: number | null;
  followUpIntervalInactive?: number | null;
}

export const createUserSettings = async (
  userId: string,
  settings: CreateUserSettingsParams
): Promise<UserSettings[]> => {
  const userSettingsData: UserSettingsInsert = {
    uuid: userId,
    agent_name: settings.agentName,
    company_name: settings.companyName,
    agent_state: settings.agentState,
    agent_city: settings.agentCity,
    follow_up_interval_new: settings.followUpIntervalNew,
    follow_up_interval_in_converesation:
      settings.followUpIntervalInConversation,
    follow_up_interval_inactive: settings.followUpIntervalInactive,
    // Handle any missing fields if needed
  };

  const { data, error } = await supabase
    .from("user_settings")
    .insert([userSettingsData])
    .select();

  if (error) throw new Error(error.message);
  return data.map((settings) => UserSettingsUtils.toModel(settings));
};

export const updateUserSettings = async (
  userId: string,
  settings: Partial<CreateUserSettingsParams>
): Promise<UserSettings[]> => {
  const userSettingsData: Partial<UserSettingsInsert> = {};

  if (settings.agentName !== undefined)
    userSettingsData.agent_name = settings.agentName;
  if (settings.companyName !== undefined)
    userSettingsData.company_name = settings.companyName;
  if (settings.agentState !== undefined)
    userSettingsData.agent_state = settings.agentState;
  if (settings.agentCity !== undefined)
    userSettingsData.agent_city = settings.agentCity;
  if (settings.followUpIntervalNew !== undefined)
    userSettingsData.follow_up_interval_new = settings.followUpIntervalNew;
  if (settings.followUpIntervalInConversation !== undefined)
    userSettingsData.follow_up_interval_in_converesation =
      settings.followUpIntervalInConversation;
  if (settings.followUpIntervalInactive !== undefined)
    userSettingsData.follow_up_interval_inactive =
      settings.followUpIntervalInactive;

  const { data, error } = await supabase
    .from("user_settings")
    .update(userSettingsData)
    .eq("uuid", userId)
    .select();

  if (error) throw new Error(error.message);
  return data.map((settings) => UserSettingsUtils.toModel(settings));
};
