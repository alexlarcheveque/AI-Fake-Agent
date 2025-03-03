"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the constraint exists
      const constraints = await queryInterface.sequelize.query(
        `SELECT constraint_name 
         FROM information_schema.table_constraints 
         WHERE table_name = 'UserSettings' 
         AND constraint_type = 'FOREIGN KEY'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      // If the constraint exists, drop it
      if (constraints.length > 0) {
        for (const constraint of constraints) {
          await queryInterface.sequelize.query(
            `ALTER TABLE "UserSettings" DROP CONSTRAINT "${constraint.constraint_name}"`,
            { type: Sequelize.QueryTypes.RAW }
          );
          console.log(`Dropped constraint: ${constraint.constraint_name}`);
        }
      } else {
        console.log("No foreign key constraints found on UserSettings table");
      }
    } catch (error) {
      console.error("Error dropping foreign key constraint:", error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This migration cannot be safely reversed
    console.log("This migration cannot be safely reversed");
  },
};
