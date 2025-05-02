import supabase from "../config/supabase";

/**
 * Gets the authorization headers with the current Supabase JWT token
 * @returns An object with Authorization header or empty object if no session
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }

    return {};
  } catch (error) {
    console.error("Error getting auth headers:", error);
    return {};
  }
}

/**
 * Adds auth headers to an existing headers object
 * @param existingHeaders The existing headers object
 * @returns A new headers object with auth headers added
 */
export async function addAuthHeaders(
  existingHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
  const authHeaders = await getAuthHeaders();
  return { ...existingHeaders, ...authHeaders };
}

/**
 * Get the current user's ID from Supabase session
 * @returns The user ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}
