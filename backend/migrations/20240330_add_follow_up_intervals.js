module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add followUp interval columns to UserSettings table
      await queryInterface.addColumn('UserSettings', 'followUpIntervalNew', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2 // Default: 2 days
      });
      
      await queryInterface.addColumn('UserSettings', 'followUpIntervalInConversation', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3 // Default: 3 days
      });
      
      await queryInterface.addColumn('UserSettings', 'followUpIntervalQualified', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5 // Default: 5 days
      });
      
      await queryInterface.addColumn('UserSettings', 'followUpIntervalAppointmentSet', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1 // Default: 1 day
      });
      
      await queryInterface.addColumn('UserSettings', 'followUpIntervalConverted', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 14 // Default: 14 days
      });
      
      await queryInterface.addColumn('UserSettings', 'followUpIntervalInactive', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30 // Default: 30 days
      });
      
      console.log('Added follow-up interval columns to UserSettings table');
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding follow-up interval columns:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove columns if migration needs to be reversed
      await queryInterface.removeColumn('UserSettings', 'followUpIntervalNew');
      await queryInterface.removeColumn('UserSettings', 'followUpIntervalInConversation');
      await queryInterface.removeColumn('UserSettings', 'followUpIntervalQualified');
      await queryInterface.removeColumn('UserSettings', 'followUpIntervalAppointmentSet');
      await queryInterface.removeColumn('UserSettings', 'followUpIntervalConverted');
      await queryInterface.removeColumn('UserSettings', 'followUpIntervalInactive');
      
      console.log('Removed follow-up interval columns from UserSettings table');
      return Promise.resolve();
    } catch (error) {
      console.error('Error removing follow-up interval columns:', error);
      return Promise.reject(error);
    }
  }
}; 