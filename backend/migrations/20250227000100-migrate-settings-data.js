module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all users
    const users = await queryInterface.sequelize.query(
      `SELECT id, name FROM "Users"`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Check if Settings table exists
    let settings = [];
    try {
      // Check if the Settings table exists
      const tables = await queryInterface.sequelize.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = 'Settings'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (tables.length > 0) {
        // Settings table exists, get the data
        settings = await queryInterface.sequelize.query(
          `SELECT key, value, "user_id" FROM "Settings"`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        console.log(`Found ${settings.length} settings records to migrate`);
      } else {
        console.log("Settings table doesn't exist, skipping data migration");
      }
    } catch (error) {
      console.log("Error checking for Settings table:", error.message);
    }

    // For each user, create default settings (or migrate if available)
    for (const user of users) {
      // Find user-specific settings
      const userSettings = settings
        .filter((s) => s.user_id === user.id)
        .reduce((acc, s) => {
          acc[s.key] = s.value;
          return acc;
        }, {});

      // Find global settings
      const globalSettings = settings
        .filter((s) => s.user_id === null)
        .reduce((acc, s) => {
          acc[s.key] = s.value;
          return acc;
        }, {});

      // Merge with user settings taking precedence
      const mergedSettings = { ...globalSettings, ...userSettings };

      // Create UserSettings record with defaults or migrated values
      await queryInterface.bulkInsert("UserSettings", [
        {
          userId: user.id,
          agentName: mergedSettings.AGENT_NAME || user.name || "Your Name",
          companyName: mergedSettings.COMPANY_NAME || "Your Company",
          agentCity: mergedSettings.AGENT_CITY || "Your City",
          agentState: mergedSettings.AGENT_STATE || "Your State",
          aiAssistantEnabled:
            mergedSettings.AI_ASSISTANT_ENABLED === "true" || true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      console.log(`Created settings for user: ${user.name} (${user.id})`);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // This is a data migration, so down just clears the table
    await queryInterface.bulkDelete("UserSettings", null, {});
  },
};
