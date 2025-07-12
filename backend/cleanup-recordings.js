const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function cleanupDuplicateRecordings() {
  console.log("🧹 Starting cleanup of duplicate recording records...");

  try {
    // Get all recordings
    const { data: recordings, error } = await supabase
      .from("call_recordings")
      .select("*")
      .order("call_id, id");

    if (error) {
      console.error("Error fetching recordings:", error);
      return;
    }

    console.log(`Found ${recordings.length} total recordings`);

    // Group by call_id to find duplicates
    const grouped = {};
    recordings.forEach((record) => {
      if (!grouped[record.call_id]) {
        grouped[record.call_id] = [];
      }
      grouped[record.call_id].push(record);
    });

    // Process each call_id
    for (const callId of Object.keys(grouped)) {
      const records = grouped[callId];

      if (records.length > 1) {
        console.log(
          `\n🔧 Processing ${records.length} duplicates for call ${callId}:`
        );

        records.forEach((r) => {
          console.log(
            `  ID ${r.id}: URL=${r.recording_url ? "YES" : "NO"}, transcript=${
              r.transcription ? "YES" : "NO"
            }`
          );
        });

        // Find the best record to keep (prefer one with recording_url)
        const recordWithUrl = records.find((r) => r.recording_url);
        const keepRecord = recordWithUrl || records[0];
        const deleteRecords = records.filter((r) => r.id !== keepRecord.id);

        console.log(
          `  → Keeping ID ${keepRecord.id}, deleting ${deleteRecords
            .map((r) => r.id)
            .join(", ")}`
        );

        // Merge the best data from all records
        const mergedData = {
          recording_url:
            records.find((r) => r.recording_url)?.recording_url ||
            keepRecord.recording_url,
          transcription:
            records.find((r) => r.transcription)?.transcription ||
            keepRecord.transcription,
          duration:
            records.find((r) => r.duration)?.duration || keepRecord.duration,
          file_size:
            records.find((r) => r.file_size)?.file_size || keepRecord.file_size,
          storage_path:
            records.find((r) => r.storage_path)?.storage_path ||
            keepRecord.storage_path,
          recording_sid:
            records.find((r) => r.recording_sid)?.recording_sid ||
            keepRecord.recording_sid,
          updated_at: new Date().toISOString(),
        };

        // Update the keep record with merged data
        const { error: updateError } = await supabase
          .from("call_recordings")
          .update(mergedData)
          .eq("id", keepRecord.id);

        if (updateError) {
          console.error(
            `  ❌ Error updating record ${keepRecord.id}:`,
            updateError
          );
          continue;
        }

        console.log(`  ✅ Updated record ${keepRecord.id}`);

        // Delete the duplicate records
        for (const deleteRecord of deleteRecords) {
          const { error: deleteError } = await supabase
            .from("call_recordings")
            .delete()
            .eq("id", deleteRecord.id);

          if (deleteError) {
            console.error(
              `  ❌ Error deleting record ${deleteRecord.id}:`,
              deleteError
            );
          } else {
            console.log(`  🗑️ Deleted record ${deleteRecord.id}`);
          }
        }
      }
    }

    // Final verification
    console.log("\n📊 Final verification...");
    const { data: finalRecordings, error: finalError } = await supabase
      .from("call_recordings")
      .select("id, call_id, recording_url, transcription")
      .order("call_id");

    if (finalError) {
      console.error("Error in final verification:", finalError);
      return;
    }

    console.log("Final state:");
    finalRecordings.forEach((r) => {
      console.log(
        `  Call ${r.call_id} (ID ${r.id}): URL=${
          r.recording_url ? "YES" : "NO"
        }, transcript=${r.transcription ? "YES" : "NO"}`
      );
    });

    console.log("\n✅ Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
}

// Run the cleanup
cleanupDuplicateRecordings();
