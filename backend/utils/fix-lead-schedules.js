/**
 * Utility script to fix lead scheduling issues
 * 
 * Usage:
 * - Fix all leads: node fix-lead-schedules.js
 * - Fix specific lead: node fix-lead-schedules.js <leadId>
 */

require('dotenv').config();
const Lead = require('../models/Lead');
const scheduledMessageService = require('../services/scheduledMessageService');
const { Op } = require('sequelize');

async function fixLeadSchedules() {
  try {
    console.log('Starting lead schedule fix...');
    
    // Get command line arguments
    const leadId = process.argv[2];
    
    if (leadId) {
      // Fix specific lead
      console.log(`Fixing scheduling for lead ${leadId}...`);
      const result = await scheduledMessageService.resetScheduledMessage(leadId);
      
      if (result.success) {
        console.log(`✅ Fixed lead ${leadId}:`);
        console.log(`  - Status: ${result.leadStatus}`);
        console.log(`  - Last message: ${result.lastMessageDate}`);
        console.log(`  - Next message: ${result.nextMessageDate}`);
        console.log(`  - Interval: ${result.interval} days`);
      } else {
        console.error(`❌ Failed to fix lead ${leadId}: ${result.message}`);
      }
    } else {
      // Fix all leads
      console.log('Fixing scheduling for all leads...');
      
      // Get all leads with nextScheduledMessage
      const leads = await Lead.findAll({
        where: {
          nextScheduledMessage: {
            [Op.not]: null
          }
        }
      });
      
      console.log(`Found ${leads.length} leads with scheduled messages`);
      
      let fixed = 0;
      let failed = 0;
      
      for (const lead of leads) {
        try {
          const result = await scheduledMessageService.resetScheduledMessage(lead.id);
          
          if (result.success) {
            fixed++;
            console.log(`✅ Fixed lead ${lead.id} (${lead.name}): Next message in ${result.interval} days`);
          } else {
            failed++;
            console.error(`❌ Failed to fix lead ${lead.id}: ${result.message}`);
          }
        } catch (error) {
          failed++;
          console.error(`❌ Error fixing lead ${lead.id}: ${error.message}`);
        }
      }
      
      console.log(`\nSummary:`);
      console.log(`- Total leads processed: ${leads.length}`);
      console.log(`- Successfully fixed: ${fixed}`);
      console.log(`- Failed to fix: ${failed}`);
    }
    
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
fixLeadSchedules(); 