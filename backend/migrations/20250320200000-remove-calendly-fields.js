'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if table exists
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('Appointments')) {
        console.log('Appointments table does not exist, skipping migration');
        return;
      }
      
      // Get table description to see if columns exist
      const tableInfo = await queryInterface.describeTable('Appointments');
      
      // Remove calendlyEventUri column if it exists
      if (tableInfo.calendlyEventUri) {
        console.log('Removing calendlyEventUri column from Appointments table');
        await queryInterface.removeColumn('Appointments', 'calendlyEventUri');
        console.log('calendlyEventUri column removed successfully');
      } else {
        console.log('calendlyEventUri column does not exist, skipping');
      }
      
      // Remove calendlyInviteeUri column if it exists
      if (tableInfo.calendlyInviteeUri) {
        console.log('Removing calendlyInviteeUri column from Appointments table');
        await queryInterface.removeColumn('Appointments', 'calendlyInviteeUri');
        console.log('calendlyInviteeUri column removed successfully');
      } else {
        console.log('calendlyInviteeUri column does not exist, skipping');
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
      if (!tables.includes('Appointments')) {
        console.log('Appointments table does not exist, skipping down migration');
        return;
      }
      
      // Get table description to see if columns exist
      const tableInfo = await queryInterface.describeTable('Appointments');
      
      // Add calendlyEventUri column if it doesn't exist
      if (!tableInfo.calendlyEventUri) {
        console.log('Adding calendlyEventUri column to Appointments table');
        await queryInterface.addColumn('Appointments', 'calendlyEventUri', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('calendlyEventUri column added successfully');
      }
      
      // Add calendlyInviteeUri column if it doesn't exist
      if (!tableInfo.calendlyInviteeUri) {
        console.log('Adding calendlyInviteeUri column to Appointments table');
        await queryInterface.addColumn('Appointments', 'calendlyInviteeUri', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('calendlyInviteeUri column added successfully');
      }
      
      console.log('Down migration completed successfully');
    } catch (error) {
      console.error('Error in down migration:', error.message);
    }
  }
}; 