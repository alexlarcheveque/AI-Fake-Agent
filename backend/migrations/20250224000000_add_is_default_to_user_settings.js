"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if isDefault column already exists
      const tableInfo = await queryInterface.describeTable("UserSettings");
      
      if (!tableInfo.isDefault) {
        console.log("Adding isDefault column to UserSettings table");
        
        // Add the column
        await queryInterface.addColumn("UserSettings", "isDefault", {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        });

        // Set the first record as default
        await queryInterface.sequelize.query(`
          UPDATE "UserSettings" 
          SET "isDefault" = true 
          WHERE id = (SELECT id FROM "UserSettings" LIMIT 1)
        `);
        
        console.log("Successfully set first UserSettings record as default");
      } else {
        console.log("isDefault column already exists in UserSettings table, skipping");
      }
    } catch (error) {
      console.error("Error adding isDefault column to UserSettings table:", error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn("UserSettings", "isDefault");
      console.log("Removed isDefault column from UserSettings table");
    } catch (error) {
      console.error("Error removing isDefault column:", error.message);
    }
  },
};
