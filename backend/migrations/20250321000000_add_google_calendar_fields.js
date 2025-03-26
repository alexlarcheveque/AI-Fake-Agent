'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the columns already exist by describing the table
      const tableInfo = await queryInterface.describeTable('Appointments');
      
      // Add Google Calendar fields to the Appointments table if they don't exist
      if (!tableInfo.googleCalendarEventId) {
        await queryInterface.addColumn('Appointments', 'googleCalendarEventId', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('Added googleCalendarEventId column to Appointments table');
      } else {
        console.log('googleCalendarEventId column already exists, skipping');
      }
      
      if (!tableInfo.googleCalendarEventLink) {
        await queryInterface.addColumn('Appointments', 'googleCalendarEventLink', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('Added googleCalendarEventLink column to Appointments table');
      } else {
        console.log('googleCalendarEventLink column already exists, skipping');
      }
      
      if (!tableInfo.googleCalendarEventStatus) {
        await queryInterface.addColumn('Appointments', 'googleCalendarEventStatus', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('Added googleCalendarEventStatus column to Appointments table');
      } else {
        console.log('googleCalendarEventStatus column already exists, skipping');
      }
      
      // Check if index exists - this is a bit trickier, so we'll just try to create it and catch errors
      try {
        await queryInterface.addIndex('Appointments', ['googleCalendarEventId']);
        console.log('Added index on googleCalendarEventId');
      } catch (indexError) {
        // If the index already exists, this will fail with a specific error
        if (indexError.message.includes('already exists')) {
          console.log('Index on googleCalendarEventId already exists, skipping');
        } else {
          // Other errors should be logged
          console.error('Error adding index:', indexError.message);
        }
      }
    } catch (error) {
      // If the table doesn't exist yet, we can't add columns to it
      console.error('Error modifying Appointments table:', error.message);
      
      // In case the table doesn't exist yet, just swallow the error
      // The appointments table migration should run first anyway
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove Google Calendar fields from the Appointments table
      await queryInterface.removeColumn('Appointments', 'googleCalendarEventId');
      await queryInterface.removeColumn('Appointments', 'googleCalendarEventLink');
      await queryInterface.removeColumn('Appointments', 'googleCalendarEventStatus');
    } catch (error) {
      console.error('Error removing Google Calendar columns:', error.message);
    }
  }
}; 