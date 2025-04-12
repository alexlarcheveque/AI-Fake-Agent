'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting migration to enforce Lead-User relationship');
      
      // First, check if there are any users in the system
      const [users] = await queryInterface.sequelize.query(
        'SELECT id FROM "Users" ORDER BY "createdAt" LIMIT 1'
      );
      
      if (users.length === 0) {
        console.log('No users found in the system. This migration requires at least one user.');
        console.log('Migration aborted. Please create a user before running this migration.');
        return;
      }
      
      const defaultUserId = users[0].id;
      console.log(`Using user with ID ${defaultUserId} as the default owner for leads without a user`);
      
      // Check if there are any leads with null userId
      const [nullUserIdLeads] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) as count FROM "Leads" WHERE "userId" IS NULL'
      );
      const nullLeadsCount = parseInt(nullUserIdLeads[0].count);
      
      if (nullLeadsCount > 0) {
        console.log(`Found ${nullLeadsCount} leads without a userId, assigning them to the default user`);
        
        // Update all leads with null userId to use the default user
        await queryInterface.sequelize.query(
          `UPDATE "Leads" SET "userId" = '${defaultUserId}' WHERE "userId" IS NULL`
        );
        console.log(`Successfully assigned ${nullLeadsCount} leads to the default user`);
      } else {
        console.log('No leads found with null userId, all leads are already associated with a user');
      }
      
      // Now alter the column to make it NOT NULL
      await queryInterface.changeColumn('Leads', 'userId', {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
      
      console.log('Successfully updated the userId column to be NOT NULL');
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error in migration:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revert the NOT NULL constraint
      await queryInterface.changeColumn('Leads', 'userId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      });
      
      console.log('Successfully reverted the userId column to allow NULL values');
    } catch (error) {
      console.error('Error in migration rollback:', error.message);
      throw error;
    }
  }
}; 