export const formatPhoneForDisplay = (phoneNumber: string) => {
  if (!phoneNumber) return "";

  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");

  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(
      7
    )}`;
  } else if (digits.length > 10) {
    // International format
    return `+${digits.slice(0, digits.length - 10)} ${digits.slice(
      -10,
      -7
    )} ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
  }

  // Return as-is if we can't format it
  return phoneNumber;
};

/**
 * Normalize phone number to E.164 format
 * Returns E.164 format (e.g., "+19095697757")
 * Defaults to US (+1) if no country code provided
 */
export const normalizePhoneToE164 = (phoneNumber: string): string => {
  if (!phoneNumber) return "";

  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");

  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`; // Add US country code
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`; // Already has US country code, just add +
  } else if (digits.length === 11 && !digits.startsWith("1")) {
    return `+1${digits}`; // Assume US and add +1
  }

  // For other lengths, assume it already has country code
  if (digits.length > 11) {
    return `+${digits}`;
  }

  // If less than 10 digits, return as-is (invalid)
  return phoneNumber;
};

/**
 * Normalize phone number to numeric format for database storage
 * Takes phone numbers like "+19095697757" and returns "19095697757"
 * Removes "+" but keeps the full number including country code
 * Defaults to US format (adds "1") if no country code provided
 */
export const normalizePhoneToNumeric = (phoneNumber: string): string => {
  if (!phoneNumber) return "";

  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");

  // Handle different digit lengths
  if (digits.length === 10) {
    return `1${digits}`; // Add US country code "1" to 10-digit numbers
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return digits; // Keep as-is - already has US country code
  } else if (digits.length === 11 && !digits.startsWith("1")) {
    return digits; // Keep as-is if not US (international)
  } else if (digits.length === 7) {
    // Missing area code - incomplete US number
    // Note: We cannot assume an area code, this should be handled by validation
    return digits;
  } else if (digits.length > 11) {
    // International number - keep as-is
    return digits;
  }

  // For other lengths, return as-is and let validation handle it
  return digits;
};

/**
 * Validate and format phone number for user input
 * Provides helpful error messages for incomplete numbers
 */
export const validatePhoneNumber = (
  phoneNumber: string
): {
  isValid: boolean;
  normalizedPhone: string;
  errorMessage?: string;
} => {
  if (!phoneNumber) {
    return {
      isValid: false,
      normalizedPhone: "",
      errorMessage: "Phone number is required",
    };
  }

  const digits = phoneNumber.replace(/\D/g, "");
  const normalizedPhone = normalizePhoneToNumeric(phoneNumber);

  if (digits.length < 7) {
    return {
      isValid: false,
      normalizedPhone,
      errorMessage: "Phone number is too short",
    };
  } else if (digits.length === 7) {
    return {
      isValid: false,
      normalizedPhone,
      errorMessage: "Please include area code (e.g., 909-569-7757)",
    };
  } else if (digits.length === 10) {
    return {
      isValid: true,
      normalizedPhone, // Will be converted to 11 digits with country code
    };
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return {
      isValid: true,
      normalizedPhone, // Will remain as 11 digits
    };
  } else if (digits.length > 15) {
    return {
      isValid: false,
      normalizedPhone,
      errorMessage: "Phone number is too long",
    };
  }

  // For other cases (international numbers, etc.)
  return {
    isValid: true,
    normalizedPhone,
  };
};
