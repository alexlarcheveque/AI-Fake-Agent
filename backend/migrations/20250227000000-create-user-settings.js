module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the UserSettings table already exists
      const tables = await queryInterface.showAllTables();
      if (tables.includes('UserSettings')) {
        console.log('UserSettings table already exists, skipping creation');
        return;
      }
      
      console.log('Creating UserSettings table');
      await queryInterface.createTable("UserSettings", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: "Users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        agentName: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
        },
        companyName: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
        },
        agentCity: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
        },
        agentState: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
        },
        aiAssistantEnabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
      console.log('UserSettings table created successfully');
    } catch (error) {
      console.error('Error creating UserSettings table:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if the UserSettings table exists before trying to drop it
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('UserSettings')) {
        console.log('UserSettings table does not exist, skipping drop');
        return;
      }
      
      console.log('Dropping UserSettings table');
      await queryInterface.dropTable("UserSettings");
      console.log('UserSettings table dropped successfully');
    } catch (error) {
      console.error('Error dropping UserSettings table:', error.message);
    }
  },
};
