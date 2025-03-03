"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all messages with opt-out errors
    const messages = await queryInterface.sequelize.query(
      `SELECT DISTINCT "leadId" FROM "Messages" 
       WHERE "errorCode" = '21610' OR "errorMessage" LIKE '%opted out%'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Extract lead IDs
    const leadIds = messages.map((m) => m.leadId);

    if (leadIds.length > 0) {
      // Update all affected leads
      await queryInterface.sequelize.query(
        `UPDATE "Leads" 
         SET status = 'opted-out', 
             "nextScheduledMessage" = NULL, 
             "enableFollowUps" = false 
         WHERE id IN (${leadIds.join(",")})`,
        { type: Sequelize.QueryTypes.UPDATE }
      );

      console.log(`Updated ${leadIds.length} leads to opted-out status`);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This migration cannot be safely reversed
  },
};
