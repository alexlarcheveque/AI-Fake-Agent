import supabase from "../config/supabase.js";

export const getUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("userId", userId);

  if (error) throw new Error(error.message);
  return data;
};

export const createUserSettings = async (userId, settings) => {
  const {
    agentName,
    companyName,
    agentState,
    agentCity,
    aiAssistantEnabled,
    followUpIntervalNew,
    followUpIntervalInConversation,
    followUpIntervalQualified,
    followUpIntervalAppointmentSet,
    followUpIntervalConverted,
    followUpIntervalInactive,
  } = settings;

  const { data, error } = await supabase.from("user_settings").insert({
    userId,
    agentName,
    companyName,
    agentState,
    agentCity,
    aiAssistantEnabled,
    followUpIntervalNew,
    followUpIntervalInConversation,
    followUpIntervalQualified,
    followUpIntervalAppointmentSet,
    followUpIntervalConverted,
    followUpIntervalInactive,
  });

  if (error) throw new Error(error.message);
  return data;
};

export const updateUserSettings = async (userId, settings) => {
  const {
    agentName,
    companyName,
    agentState,
    agentCity,
    aiAssistantEnabled,
    followUpIntervalNew,
    followUpIntervalInConversation,
    followUpIntervalQualified,
    followUpIntervalAppointmentSet,
    followUpIntervalConverted,
    followUpIntervalInactive,
  } = settings;

  const { data, error } = await supabase
    .from("user_settings")
    .update({
      agentName,
      companyName,
      agentState,
      agentCity,
      aiAssistantEnabled,
      followUpIntervalNew,
      followUpIntervalInConversation,
      followUpIntervalQualified,
      followUpIntervalAppointmentSet,
      followUpIntervalConverted,
      followUpIntervalInactive,
    })
    .eq("userId", userId);

  if (error) throw new Error(error.message);
  return data;
};
