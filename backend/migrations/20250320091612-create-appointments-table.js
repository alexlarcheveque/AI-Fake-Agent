'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if table already exists
      const tables = await queryInterface.showAllTables();
      if (tables.includes('Appointments')) {
        console.log('Appointments table already exists, skipping creation');
        return;
      }
      
      console.log('Creating Appointments table');
      await queryInterface.createTable('Appointments', {
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
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        startTime: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        endTime: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        location: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        calendlyEventUri: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        calendlyInviteeUri: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'scheduled',
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
      console.log('Appointments table created successfully');

      // Add indexes
      await queryInterface.addIndex('Appointments', ['leadId']);
      await queryInterface.addIndex('Appointments', ['userId']);
      await queryInterface.addIndex('Appointments', ['startTime']);
      await queryInterface.addIndex('Appointments', ['status']);
      console.log('Added indexes to Appointments table');
    } catch (error) {
      console.error('Error creating Appointments table:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if table exists before dropping
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('Appointments')) {
        console.log('Appointments table does not exist, skipping drop');
        return;
      }
      
      console.log('Dropping Appointments table');
      await queryInterface.dropTable('Appointments');
      console.log('Appointments table dropped successfully');
    } catch (error) {
      console.error('Error dropping Appointments table:', error.message);
    }
  }
};
