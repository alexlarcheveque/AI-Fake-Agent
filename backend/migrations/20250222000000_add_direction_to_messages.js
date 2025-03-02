"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Create the ENUM type if it doesn't exist
    try {
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_Messages_direction" AS ENUM ('inbound', 'outbound');`
      );
    } catch (error) {
      console.log("ENUM type might already exist, continuing...");
    }

    // Step 2: Add the column as nullable first
    await queryInterface.addColumn("Messages", "direction", {
      type: Sequelize.ENUM("inbound", "outbound"),
      allowNull: true,
    });

    // Step 3: Update existing records with a default value
    // Assuming existing messages are outbound
    await queryInterface.sequelize.query(
      `UPDATE "Messages" SET "direction" = 'outbound' WHERE "direction" IS NULL;`
    );

    // Step 4: Change the column to NOT NULL
    await queryInterface.changeColumn("Messages", "direction", {
      type: Sequelize.ENUM("inbound", "outbound"),
      allowNull: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Messages", "direction");
  },
};
