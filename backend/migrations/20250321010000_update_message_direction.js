'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('Starting message direction update migration');
      
      // Get table info to check if direction column exists
      const tableInfo = await queryInterface.describeTable('Messages');
      
      if (!tableInfo.direction) {
        console.log('Direction column does not exist yet, creating it as nullable first');
        
        // First create the ENUM type if it doesn't exist
        try {
          await queryInterface.sequelize.query(
            `CREATE TYPE "enum_Messages_direction" AS ENUM ('inbound', 'outbound');`
          );
          console.log('Created ENUM type for direction');
        } catch (error) {
          console.log('ENUM type might already exist, continuing...');
        }
        
        // Add direction column as nullable
        await queryInterface.addColumn('Messages', 'direction', {
          type: Sequelize.ENUM('inbound', 'outbound'),
          allowNull: true
        });
        console.log('Added direction column as nullable');
      } else {
        console.log('Direction column already exists');
        
        // Make sure it's nullable for this migration
        if (tableInfo.direction.allowNull === false) {
          console.log('Making direction column nullable for migration');
          await queryInterface.changeColumn('Messages', 'direction', {
            type: Sequelize.ENUM('inbound', 'outbound'),
            allowNull: true
          });
        }
      }
      
      // Update all agent messages to outbound
      await queryInterface.sequelize.query(`
        UPDATE "Messages" 
        SET "direction" = 'outbound' 
        WHERE "sender" = 'agent' AND ("direction" IS NULL OR "direction" = '')
      `);
      console.log('Updated agent messages to have outbound direction');
      
      // Update all lead messages to inbound
      await queryInterface.sequelize.query(`
        UPDATE "Messages" 
        SET "direction" = 'inbound' 
        WHERE "sender" = 'lead' AND ("direction" IS NULL OR "direction" = '')
      `);
      console.log('Updated lead messages to have inbound direction');
      
      // Count any remaining null values
      const [results] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) FROM "Messages" WHERE "direction" IS NULL
      `);
      
      const nullCount = parseInt(results[0].count);
      if (nullCount > 0) {
        console.log(`WARNING: ${nullCount} messages still have null direction values`);
      } else {
        console.log('All messages now have direction values');
        
        // Only make NOT NULL if all records are updated
        console.log('Making direction column NOT NULL');
        await queryInterface.changeColumn('Messages', 'direction', {
          type: Sequelize.ENUM('inbound', 'outbound'),
          allowNull: false,
          defaultValue: 'outbound'
        });
      }
      
      console.log('Message direction update migration completed successfully');
    } catch (error) {
      console.error('Error in message direction update migration:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Make direction nullable again in case we need to roll back
      const tableInfo = await queryInterface.describeTable('Messages');
      
      if (tableInfo.direction) {
        await queryInterface.changeColumn('Messages', 'direction', {
          type: Sequelize.ENUM('inbound', 'outbound'),
          allowNull: true
        });
        console.log('Made direction column nullable again');
      }
    } catch (error) {
      console.error('Error in down migration for message direction:', error.message);
    }
  }
}; 