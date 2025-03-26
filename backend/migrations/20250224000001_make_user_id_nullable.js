"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if userId column exists and its properties
      const tableInfo = await queryInterface.describeTable("UserSettings");
      
      if (tableInfo.userId && tableInfo.userId.allowNull === false) {
        console.log("Modifying userId column in UserSettings to be nullable");
        await queryInterface.changeColumn("UserSettings", "userId", {
          type: Sequelize.UUID,
          allowNull: true,
        });
        console.log("Successfully made userId column nullable in UserSettings table");
      } else {
        console.log("userId column is already nullable or doesn't exist, skipping");
      }
    } catch (error) {
      console.error("Error modifying userId column in UserSettings table:", error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if userId column exists and its properties
      const tableInfo = await queryInterface.describeTable("UserSettings");
      
      if (tableInfo.userId && tableInfo.userId.allowNull === true) {
        console.log("Modifying userId column in UserSettings to be non-nullable");
        await queryInterface.changeColumn("UserSettings", "userId", {
          type: Sequelize.UUID,
          allowNull: false,
        });
        console.log("Successfully made userId column non-nullable in UserSettings table");
      } else {
        console.log("userId column is already non-nullable or doesn't exist, skipping");
      }
    } catch (error) {
      console.error("Error modifying userId column in UserSettings table:", error.message);
    }
  },
};
