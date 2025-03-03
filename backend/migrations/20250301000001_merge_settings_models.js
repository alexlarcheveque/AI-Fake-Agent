"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, check if both tables exist
    const tables = await queryInterface.showAllTables();
    const hasSettings = tables.includes("Settings");
    const hasUserSettings = tables.includes("UserSettings");

    if (hasSettings && hasUserSettings) {
      // Get all records from Settings
      const settings = await queryInterface.sequelize.query(
        `SELECT * FROM "Settings"`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      // For each Settings record, check if there's a corresponding UserSettings record
      for (const setting of settings) {
        const existingUserSetting = await queryInterface.sequelize.query(
          `SELECT * FROM "UserSettings" WHERE "userId" = :userId`,
          {
            replacements: { userId: setting.userId },
            type: Sequelize.QueryTypes.SELECT,
          }
        );

        if (existingUserSetting.length === 0 && setting.userId) {
          // Insert into UserSettings if no record exists
          await queryInterface.sequelize.query(
            `INSERT INTO "UserSettings" 
             ("userId", "agentName", "companyName", "agentCity", "agentState", "aiAssistantEnabled", "createdAt", "updatedAt") 
             VALUES (:userId, :agentName, :companyName, :agentCity, :agentState, :aiAssistantEnabled, :createdAt, :updatedAt)`,
            {
              replacements: {
                userId: setting.userId,
                agentName: setting.agentName || "Your Name",
                companyName: setting.companyName || "Your Company",
                agentCity: setting.agentCity || null,
                agentState: setting.agentState || null,
                aiAssistantEnabled: setting.aiAssistantEnabled || true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              type: Sequelize.QueryTypes.INSERT,
            }
          );
        }
      }

      // Optionally drop the old Settings table
      // await queryInterface.dropTable("Settings");
      console.log("Settings data migrated to UserSettings");
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This migration cannot be safely reversed
  },
};
