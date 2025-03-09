// Create a new file for phone utilities
const formatPhoneForDisplay = (phoneNumber) => {
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

module.exports = {
  formatPhoneForDisplay,
  // Add other phone utilities here
};
