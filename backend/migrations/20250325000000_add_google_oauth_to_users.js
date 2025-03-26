'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting migration to add Google OAuth fields to Users table');
      
      // Check if table exists
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('Users')) {
        console.log('Users table does not exist, skipping migration');
        return;
      }
      
      // Get table info to check if columns already exist
      const tableInfo = await queryInterface.describeTable('Users');
      
      // Add googleTokens column if it doesn't exist
      if (!tableInfo.googleTokens) {
        console.log('Adding googleTokens column to Users table');
        await queryInterface.addColumn('Users', 'googleTokens', {
          type: Sequelize.TEXT,
          allowNull: true
        });
        console.log('googleTokens column added successfully');
      } else {
        console.log('googleTokens column already exists, skipping');
      }
      
      // Add googleCalendarConnected column if it doesn't exist
      if (!tableInfo.googleCalendarConnected) {
        console.log('Adding googleCalendarConnected column to Users table');
        await queryInterface.addColumn('Users', 'googleCalendarConnected', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        });
        console.log('googleCalendarConnected column added successfully');
      } else {
        console.log('googleCalendarConnected column already exists, skipping');
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error in migration:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if table exists
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('Users')) {
        console.log('Users table does not exist, skipping down migration');
        return;
      }
      
      // Check if columns exist before trying to remove them
      const tableInfo = await queryInterface.describeTable('Users');
      
      // Remove googleCalendarConnected column if it exists
      if (tableInfo.googleCalendarConnected) {
        console.log('Removing googleCalendarConnected column from Users table');
        await queryInterface.removeColumn('Users', 'googleCalendarConnected');
        console.log('googleCalendarConnected column removed successfully');
      }
      
      // Remove googleTokens column if it exists
      if (tableInfo.googleTokens) {
        console.log('Removing googleTokens column from Users table');
        await queryInterface.removeColumn('Users', 'googleTokens');
        console.log('googleTokens column removed successfully');
      }
    } catch (error) {
      console.error('Error in down migration:', error.message);
    }
  }
}; 