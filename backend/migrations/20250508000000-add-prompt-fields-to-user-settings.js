'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting migration to add prompt fields to UserSettings table...');
      
      // Check if the columns already exist
      const tableInfo = await queryInterface.describeTable('UserSettings');
      
      // Add buyerLeadPrompt if it doesn't exist
      if (!tableInfo.buyerLeadPrompt) {
        console.log('Adding buyerLeadPrompt column to UserSettings table');
        await queryInterface.addColumn('UserSettings', 'buyerLeadPrompt', {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }
      
      // Add sellerLeadPrompt if it doesn't exist
      if (!tableInfo.sellerLeadPrompt) {
        console.log('Adding sellerLeadPrompt column to UserSettings table');
        await queryInterface.addColumn('UserSettings', 'sellerLeadPrompt', {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }
      
      // Add followUpPrompt if it doesn't exist
      if (!tableInfo.followUpPrompt) {
        console.log('Adding followUpPrompt column to UserSettings table');
        await queryInterface.addColumn('UserSettings', 'followUpPrompt', {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }
      
      // Add agentPrompt if it doesn't exist
      if (!tableInfo.agentPrompt) {
        console.log('Adding agentPrompt column to UserSettings table');
        await queryInterface.addColumn('UserSettings', 'agentPrompt', {
          type: Sequelize.TEXT,
          allowNull: true
        });
      }
      
      console.log('Successfully added prompt fields to UserSettings table');
      return Promise.resolve();
    } catch (error) {
      console.error('Migration failed:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if the columns exist before trying to remove them
      const tableInfo = await queryInterface.describeTable('UserSettings');
      
      if (tableInfo.buyerLeadPrompt) {
        await queryInterface.removeColumn('UserSettings', 'buyerLeadPrompt');
      }
      
      if (tableInfo.sellerLeadPrompt) {
        await queryInterface.removeColumn('UserSettings', 'sellerLeadPrompt');
      }
      
      if (tableInfo.followUpPrompt) {
        await queryInterface.removeColumn('UserSettings', 'followUpPrompt');
      }
      
      if (tableInfo.agentPrompt) {
        await queryInterface.removeColumn('UserSettings', 'agentPrompt');
      }
      
      console.log('Successfully removed prompt fields from UserSettings table');
      return Promise.resolve();
    } catch (error) {
      console.error('Rollback failed:', error);
      return Promise.reject(error);
    }
  }
}; 