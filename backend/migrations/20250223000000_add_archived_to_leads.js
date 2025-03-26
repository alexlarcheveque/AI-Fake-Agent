"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if archived column already exists
      const tableInfo = await queryInterface.describeTable("Leads");
      
      if (!tableInfo.archived) {
        console.log("Adding archived column to Leads table");
        await queryInterface.addColumn("Leads", "archived", {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        });
      } else {
        console.log("archived column already exists in Leads table, skipping");
      }
    } catch (error) {
      console.error("Error adding archived column to Leads table:", error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn("Leads", "archived");
      console.log("Removed archived column from Leads table");
    } catch (error) {
      console.error("Error removing archived column:", error.message);
    }
  },
};
