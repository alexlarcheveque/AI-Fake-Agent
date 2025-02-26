module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the old constraint exists before trying to remove it
      try {
        await queryInterface.removeConstraint("settings", "settings_key_key");
        console.log("Removed old key constraint successfully");
      } catch (err) {
        console.log(
          "Old key constraint doesn't exist or couldn't be removed:",
          err.message
        );
      }

      // Check if the composite constraint already exists
      try {
        // Use a raw query to check if the constraint exists
        const [results] = await queryInterface.sequelize.query(`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'settings'
          AND constraint_name = 'settings_user_key_unique'
        `);

        if (results.length === 0) {
          // Only add the constraint if it doesn't exist
          await queryInterface.addConstraint("settings", {
            fields: ["user_id", "key"],
            type: "unique",
            name: "settings_user_key_unique",
          });
          console.log("Added composite constraint successfully");
        } else {
          console.log("Composite constraint already exists, skipping");
        }
      } catch (err) {
        console.log(
          "Error checking or creating composite constraint:",
          err.message
        );
      }

      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if composite constraint exists before removing
      try {
        await queryInterface.removeConstraint(
          "settings",
          "settings_user_key_unique"
        );
        console.log("Removed composite constraint successfully");
      } catch (err) {
        console.log(
          "Composite constraint doesn't exist or couldn't be removed:",
          err.message
        );
      }

      // Check if old key constraint exists before adding back
      try {
        // Use a raw query to check if the constraint exists
        const [results] = await queryInterface.sequelize.query(`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'settings'
          AND constraint_name = 'settings_key_key'
        `);

        if (results.length === 0) {
          // Only add the constraint if it doesn't exist
          await queryInterface.addConstraint("settings", {
            fields: ["key"],
            type: "unique",
            name: "settings_key_key",
          });
          console.log("Added key constraint successfully");
        } else {
          console.log("Key constraint already exists, skipping");
        }
      } catch (err) {
        console.log("Error checking or creating key constraint:", err.message);
      }

      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
