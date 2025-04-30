import supabase from "../config/supabase.js";

export const createLead = async (settings) => {
    const {user_id, name, phone_number, email, status, is_ai_enabled, last_message_date, created_at, updated_at, is_archived, lead_type} = settings;
    
    const { data, error } = await supabase
    .from('leads')
    .insert([{
        user_id,
        name,
        phone_number,
        email,
        status,
        is_ai_enabled,
        last_message_date,
        created_at,
        updated_at,
        is_archived,
        lead_type,
    }]);

    if (error) throw new Error(error.message);
    return data;
}

export const getLeadsByUserId = async (userId) => {
    const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
}

export const getLeadById = async (id) => {
    const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id);

    if (error) throw new Error(error.message);
    return data;
}

export const updateLead = async (id, settings) => {
    const { data, error } = await supabase
    .from('leads')
    .update(settings)
    .eq('id', id);

    if (error) throw new Error(error.message);
    return data;
}

export const deleteLead = async (id) => {
    const { data, error } = await supabase
    .from('leads')
    .update({ isArchived: true })
    .eq('id', id);
    
    if (error) throw new Error(error.message);
    return data;
}   