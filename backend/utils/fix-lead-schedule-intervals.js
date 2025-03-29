/**
 * Utility script to fix lead schedules ensuring follow-up intervals are 7 days
 * 
 * This script finds all leads with scheduled messages and ensures the interval
 * between lastMessageDate and nextScheduledMessage is exactly 7 days.
 * 
 * Run with: node utils/fix-lead-schedule-intervals.js
 */

const Lead = require('../models/Lead');
const logger = require('../utils/logger');
const sequelize = require('../config/database');

async function fixLeadScheduleIntervals() {
  try {
    console.log('Starting fix of lead schedule intervals...');
    
    // Find all leads with scheduled messages
    const leads = await Lead.findAll({
      where: {
        nextScheduledMessage: {
          [sequelize.Op.not]: null
        },
        aiAssistantEnabled: true
      }
    });
    
    console.log(`Found ${leads.length} leads with scheduled messages to check`);
    
    let fixedCount = 0;
    
    for (const lead of leads) {
      try {
        // Skip leads without a lastMessageDate
        if (!lead.lastMessageDate) {
          console.log(`Lead ${lead.id} has no last message date, skipping`);
          continue;
        }
        
        const lastMessageDate = new Date(lead.lastMessageDate);
        const currentScheduledDate = new Date(lead.nextScheduledMessage);
        
        // Calculate the current interval in milliseconds and convert to days
        const currentIntervalMs = currentScheduledDate.getTime() - lastMessageDate.getTime();
        const currentIntervalDays = Math.round(currentIntervalMs / (1000 * 60 * 60 * 24));
        
        console.log(`Lead ${lead.id}: Current follow-up interval is ${currentIntervalDays} days`);
        
        // If the interval is not 7 days, fix it
        if (currentIntervalDays !== 7) {
          // Calculate the correct date (7 days from last message)
          const correctedDate = new Date(lastMessageDate);
          correctedDate.setDate(correctedDate.getDate() + 7);
          
          console.log(`Fixing lead ${lead.id}: Changing next scheduled message from ${lead.nextScheduledMessage} to ${correctedDate}`);
          
          // Update the lead
          await lead.update({ 
            nextScheduledMessage: correctedDate 
          });
          
          fixedCount++;
        }
      } catch (error) {
        console.error(`Error processing lead ${lead.id}:`, error);
      }
    }
    
    console.log(`Fixed ${fixedCount} leads with incorrect intervals`);
    console.log('Done!');
    
  } catch (error) {
    console.error('Error fixing lead schedule intervals:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  fixLeadScheduleIntervals()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = fixLeadScheduleIntervals; 