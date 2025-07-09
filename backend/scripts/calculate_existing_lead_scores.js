import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { calculateLeadScores } from "../services/leadScoringService.ts";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function calculateScoresForExistingLeads() {
  try {
    console.log("🚀 Starting lead score calculation for existing leads...");

    // Get all leads that have messages but no score yet
    const { data: leadsToScore, error: leadsError } = await supabase
      .from("leads")
      .select(
        `
        id, 
        name,
        overall_score,
        messages!inner(id)
      `
      )
      .eq("is_archived", false)
      .neq("status", "converted")
      .lte("overall_score", 0);

    if (leadsError) {
      throw new Error(`Error fetching leads: ${leadsError.message}`);
    }

    if (!leadsToScore || leadsToScore.length === 0) {
      console.log("✅ No leads found that need score calculation");
      return;
    }

    console.log(
      `📊 Found ${leadsToScore.length} leads to calculate scores for`
    );

    let successCount = 0;
    let errorCount = 0;

    // Calculate scores for each lead
    for (const lead of leadsToScore) {
      try {
        console.log(
          `📈 Calculating score for lead ${lead.id} (${lead.name})...`
        );

        const scores = await calculateLeadScores(lead.id);

        console.log(
          `✅ Updated lead ${lead.id}: Overall=${scores.overallScore}, Interest=${scores.interestScore}, Sentiment=${scores.sentimentScore}`
        );
        successCount++;
      } catch (error) {
        console.error(
          `❌ Error calculating score for lead ${lead.id}: ${error.message}`
        );
        errorCount++;
      }
    }

    console.log("\n🎉 Score calculation complete!");
    console.log(`✅ Successfully updated: ${successCount} leads`);
    console.log(`❌ Errors: ${errorCount} leads`);
  } catch (error) {
    console.error("💥 Fatal error:", error.message);
    process.exit(1);
  }
}

// Run the script
calculateScoresForExistingLeads()
  .then(() => {
    console.log("🏁 Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
