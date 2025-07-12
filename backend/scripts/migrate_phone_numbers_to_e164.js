const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

/**
 * Normalize phone number to numeric format for database storage
 * Takes phone numbers like "+19095697757" and returns "9095697757"
 * Removes "+" but keeps the full number including area code
 */
function normalizePhoneToNumeric(phoneNumber) {
  if (!phoneNumber) return "";

  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, "");

  // Handle US numbers
  if (digits.length === 10) {
    return digits; // Already 10 digits, return as-is
  } else if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1); // Remove leading 1 for US numbers
  } else if (digits.length === 11 && !digits.startsWith("1")) {
    return digits; // Keep as-is if not US
  }

  // For other lengths, return as-is
  return digits;
}

async function migratePhoneNumbers() {
  try {
    console.log("🔍 Fetching all leads with phone numbers...");

    // Get all leads with phone numbers
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, name, phone_number")
      .not("phone_number", "is", null)
      .not("phone_number", "eq", "");

    if (error) {
      console.error("❌ Error fetching leads:", error);
      return;
    }

    console.log(`📋 Found ${leads.length} leads with phone numbers`);

    let updated = 0;
    let skipped = 0;

    // Process each lead
    for (const lead of leads) {
      const originalPhone = lead.phone_number;
      const normalizedPhone = normalizePhoneToNumeric(originalPhone);

      if (originalPhone === normalizedPhone) {
        // Already in numeric format
        console.log(
          `⏭️  Skipping lead ${lead.id} (${lead.name}): ${originalPhone} already normalized`
        );
        skipped++;
        continue;
      }

      // Update the phone number
      const { error: updateError } = await supabase
        .from("leads")
        .update({ phone_number: parseInt(normalizedPhone) })
        .eq("id", lead.id);

      if (updateError) {
        console.error(`❌ Error updating lead ${lead.id}:`, updateError);
      } else {
        console.log(
          `✅ Updated lead ${lead.id} (${lead.name}): ${originalPhone} → ${normalizedPhone}`
        );
        updated++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Updated: ${updated} leads`);
    console.log(`⏭️  Skipped: ${skipped} leads`);
    console.log(`📋 Total: ${leads.length} leads processed`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  }
}

// Run the migration
migratePhoneNumbers().then(() => {
  console.log("🏁 Migration completed");
  process.exit(0);
});
