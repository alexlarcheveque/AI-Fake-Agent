"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Set isAiGenerated to false for all existing messages where it's not set
    await queryInterface.sequelize.query(`
      UPDATE "Messages"
      SET "isAiGenerated" = false
      WHERE "isAiGenerated" IS NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // This is a data migration, so down doesn't need to do anything
  },
};
