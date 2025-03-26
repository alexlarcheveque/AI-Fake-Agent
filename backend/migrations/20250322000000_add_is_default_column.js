'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting add isDefault column migration');
      
      // Check if UserSettings table exists
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('UserSettings')) {
        console.log('UserSettings table does not exist, skipping migration');
        return;
      }
      
      // Check if the column already exists
      const tableInfo = await queryInterface.describeTable('UserSettings');
      
      if (!tableInfo.isDefault) {
        console.log('Adding isDefault column to UserSettings table');
        
        // Add the column
        await queryInterface.addColumn('UserSettings', 'isDefault', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        });
        console.log('isDefault column added successfully');
        
        // Set the first record as default if any exists
        const [results] = await queryInterface.sequelize.query(
          'SELECT COUNT(*) as count FROM "UserSettings"'
        );
        const count = parseInt(results[0].count);
        
        if (count > 0) {
          await queryInterface.sequelize.query(`
            UPDATE "UserSettings" 
            SET "isDefault" = true 
            WHERE id = (SELECT id FROM "UserSettings" ORDER BY id LIMIT 1)
          `);
          console.log('First UserSettings record set as default');
        } else {
          console.log('No UserSettings records to update');
        }
      } else {
        console.log('isDefault column already exists in UserSettings table, skipping');
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error in migration:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if UserSettings table exists
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('UserSettings')) {
        console.log('UserSettings table does not exist, skipping down migration');
        return;
      }
      
      // Check if the column exists before trying to remove it
      const tableInfo = await queryInterface.describeTable('UserSettings');
      
      if (tableInfo.isDefault) {
        console.log('Removing isDefault column from UserSettings table');
        await queryInterface.removeColumn('UserSettings', 'isDefault');
        console.log('isDefault column removed successfully');
      } else {
        console.log('isDefault column does not exist, skipping');
      }
    } catch (error) {
      console.error('Error in down migration:', error.message);
    }
  }
}; 