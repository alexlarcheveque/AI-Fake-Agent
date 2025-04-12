module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add metadata column to Messages table
      await queryInterface.addColumn('Messages', 'metadata', {
        type: Sequelize.JSON,
        allowNull: true
      });
      
      console.log('Added metadata column to Messages table');
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding metadata column:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove column if migration needs to be reversed
      await queryInterface.removeColumn('Messages', 'metadata');
      
      console.log('Removed metadata column from Messages table');
      return Promise.resolve();
    } catch (error) {
      console.error('Error removing metadata column:', error);
      return Promise.reject(error);
    }
  }
}; 