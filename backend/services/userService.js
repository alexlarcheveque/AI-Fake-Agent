import supabase from "../config/supabase.js";

export const getUser = async (userId) => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("userId", userId);

  if (error) throw new Error(error.message);
  return data;
};

export const createUser = async (settings) => {
  const {
    name,
    email,
    password,
    phone_number,
    created_at,
    updated_at,
    reset_token,
    reset_token_expiry,
  } = settings;

  const { data, error } = await supabase.from("user_settings").insert({
    name,
    email,
    password,
    phone_number,
    created_at,
    updated_at,
    reset_token,
    reset_token_expiry,
  });

  if (error) throw new Error(error.message);
  return data;
};

export const updateUser = async (userId, settings) => {
  const {
    name,
    email,
    password,
    phone_number,
    created_at,
    updated_at,
    reset_token,
    reset_token_expiry,
  } = settings;

  const { data, error } = await supabase
    .from("user_settings")
    .update({
      name,
      email,
      password,
      phone_number,
      created_at,
      updated_at,
      reset_token,
      reset_token_expiry,
    })
    .eq("userId", userId);

  if (error) throw new Error(error.message);
  return data;
};
