'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting migration to add leadType column to Leads table...');
      
      // Check if the column already exists
      const tableInfo = await queryInterface.describeTable('Leads');
      if (tableInfo.leadType) {
        console.log('Column leadType already exists in Leads table. Skipping...');
        return;
      }
      
      // Add the leadType column
      await queryInterface.addColumn('Leads', 'leadType', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'buyer',
        validate: {
          isIn: [['buyer', 'seller']]
        }
      });
      
      console.log('Successfully added leadType column to Leads table');
      return Promise.resolve();
    } catch (error) {
      console.error('Migration failed:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting rollback of leadType column from Leads table...');
      
      // Check if the column exists before trying to remove it
      const tableInfo = await queryInterface.describeTable('Leads');
      if (!tableInfo.leadType) {
        console.log('Column leadType does not exist in Leads table. Skipping rollback...');
        return;
      }
      
      // Remove the leadType column
      await queryInterface.removeColumn('Leads', 'leadType');
      
      console.log('Successfully removed leadType column from Leads table');
      return Promise.resolve();
    } catch (error) {
      console.error('Rollback failed:', error);
      return Promise.reject(error);
    }
  }
}; 