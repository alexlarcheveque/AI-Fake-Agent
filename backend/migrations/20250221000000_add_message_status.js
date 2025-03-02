"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper function to check if a column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch (error) {
        return false;
      }
    };

    // Add twilioSid if it doesn't exist
    if (!(await columnExists("Messages", "twilioSid"))) {
      await queryInterface.addColumn("Messages", "twilioSid", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // Add deliveryStatus if it doesn't exist
    if (!(await columnExists("Messages", "deliveryStatus"))) {
      // First create the ENUM type if it doesn't exist
      try {
        await queryInterface.sequelize.query(
          `CREATE TYPE "enum_Messages_deliveryStatus" AS ENUM ('queued', 'sending', 'sent', 'delivered', 'failed', 'undelivered', 'read');`
        );
      } catch (error) {
        // Type might already exist, which is fine
        console.log("ENUM type might already exist, continuing...");
      }

      await queryInterface.addColumn("Messages", "deliveryStatus", {
        type: Sequelize.ENUM(
          "queued",
          "sending",
          "sent",
          "delivered",
          "failed",
          "undelivered",
          "read"
        ),
        defaultValue: "queued",
      });
    }

    // Add errorCode if it doesn't exist
    if (!(await columnExists("Messages", "errorCode"))) {
      await queryInterface.addColumn("Messages", "errorCode", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // Add errorMessage if it doesn't exist
    if (!(await columnExists("Messages", "errorMessage"))) {
      await queryInterface.addColumn("Messages", "errorMessage", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    // Add statusUpdatedAt if it doesn't exist
    if (!(await columnExists("Messages", "statusUpdatedAt"))) {
      await queryInterface.addColumn("Messages", "statusUpdatedAt", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Helper function to check if a column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch (error) {
        return false;
      }
    };

    // Remove columns if they exist
    if (await columnExists("Messages", "twilioSid")) {
      await queryInterface.removeColumn("Messages", "twilioSid");
    }

    if (await columnExists("Messages", "deliveryStatus")) {
      await queryInterface.removeColumn("Messages", "deliveryStatus");
    }

    if (await columnExists("Messages", "errorCode")) {
      await queryInterface.removeColumn("Messages", "errorCode");
    }

    if (await columnExists("Messages", "errorMessage")) {
      await queryInterface.removeColumn("Messages", "errorMessage");
    }

    if (await columnExists("Messages", "statusUpdatedAt")) {
      await queryInterface.removeColumn("Messages", "statusUpdatedAt");
    }
  },
};
