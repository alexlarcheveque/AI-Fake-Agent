"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("UserSettings", "isDefault");
  },
};
