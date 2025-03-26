module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if enableFollowUps column already exists
    try {
      // Try to describe the table to get column info
      const tableInfo = await queryInterface.describeTable("Leads");
      
      // Only add the column if it doesn't already exist
      if (!tableInfo.enableFollowUps) {
        // Add enableFollowUps column to Leads
        await queryInterface.addColumn("Leads", "enableFollowUps", {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        });
        console.log('Added enableFollowUps column to Leads table');
      } else {
        console.log('enableFollowUps column already exists, skipping');
      }
    } catch (error) {
      console.error('Error checking/adding enableFollowUps column:', error);
      // If there's an error with checking the column, try to add it anyway and catch any errors
      try {
        await queryInterface.addColumn("Leads", "enableFollowUps", {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        });
      } catch (innerError) {
        console.error('Could not add enableFollowUps column, it might already exist:', innerError.message);
      }
    }

    // Check if FollowUps table already exists
    try {
      await queryInterface.showAllTables().then(tables => {
        if (!tables.includes('FollowUps')) {
          // Create FollowUps table
          return queryInterface.createTable("FollowUps", {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            leadId: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: "Leads",
                key: "id",
              },
              onUpdate: "CASCADE",
              onDelete: "CASCADE",
            },
            scheduledFor: {
              type: Sequelize.DATE,
              allowNull: false,
            },
            status: {
              type: Sequelize.ENUM("pending", "sent", "cancelled"),
              defaultValue: "pending",
            },
            followUpNumber: {
              type: Sequelize.INTEGER,
              defaultValue: 1,
            },
            lastMessageDate: {
              type: Sequelize.DATE,
              allowNull: false,
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
        } else {
          console.log('FollowUps table already exists, skipping creation');
        }
      });
    } catch (error) {
      console.error('Error checking/creating FollowUps table:', error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn("Leads", "enableFollowUps");
    } catch (error) {
      console.error('Error removing enableFollowUps column:', error.message);
    }
    
    try {
      await queryInterface.dropTable("FollowUps");
    } catch (error) {
      console.error('Error dropping FollowUps table:', error.message);
    }
  },
};
