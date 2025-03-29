module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting migration to drop FollowUps table');
      
      // Check if FollowUps table exists
      const tables = await queryInterface.showAllTables();
      
      if (tables.includes('FollowUps')) {
        // Drop the FollowUps table if it exists
        await queryInterface.dropTable('FollowUps');
        console.log('Successfully dropped FollowUps table');
      } else {
        console.log('FollowUps table does not exist, skipping drop operation');
      }
    } catch (error) {
      console.error('Error dropping FollowUps table:', error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting rollback to recreate FollowUps table');
      
      // Check if FollowUps table already exists
      const tables = await queryInterface.showAllTables();
      
      if (!tables.includes('FollowUps')) {
        // Create FollowUps table if it doesn't exist
        await queryInterface.createTable('FollowUps', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          leadId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Leads',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          scheduledFor: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          status: {
            type: Sequelize.ENUM('pending', 'sent', 'failed', 'cancelled'),
            defaultValue: 'pending',
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          error: {
            type: Sequelize.TEXT,
            allowNull: true,
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
        console.log('Successfully recreated FollowUps table');
      } else {
        console.log('FollowUps table already exists, skipping recreation');
      }
    } catch (error) {
      console.error('Error recreating FollowUps table:', error);
    }
  }
}; 