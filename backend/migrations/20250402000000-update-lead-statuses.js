'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Starting migration to update lead statuses...');

    try {
      // Step 1: Get all leads with old statuses
      const leads = await queryInterface.sequelize.query(
        'SELECT id, status FROM "Leads"',
        { type: Sequelize.QueryTypes.SELECT }
      );

      console.log(`Found ${leads.length} leads to update`);

      // Step 2: Map old statuses to new statuses
      const statusMappings = {
        'New': 'New', // Keep as is
        'new': 'New', // Normalize casing
        'Contacted': 'In Conversation', // Map to new "In Conversation" status
        'contacted': 'In Conversation', // Normalize casing
        'Qualified': 'Qualified', // Keep as is
        'qualified': 'Qualified', // Normalize casing
        'Lost': 'Inactive', // Map to new "Inactive" status
        'lost': 'Inactive' // Normalize casing
      };

      // Step 3: Update each lead with the new status
      for (const lead of leads) {
        const oldStatus = lead.status;
        const newStatus = statusMappings[oldStatus] || 'New'; // Default to New if unknown status

        if (oldStatus !== newStatus) {
          console.log(`Updating lead ${lead.id} status from "${oldStatus}" to "${newStatus}"`);
          
          await queryInterface.sequelize.query(
            `UPDATE "Leads" SET status = ? WHERE id = ?`,
            {
              replacements: [newStatus, lead.id],
              type: Sequelize.QueryTypes.UPDATE
            }
          );
        }
      }

      console.log('Migration completed successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Migration failed:', error);
      return Promise.reject(error);
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Starting rollback of lead status updates...');

    try {
      // Step 1: Get all leads with new statuses
      const leads = await queryInterface.sequelize.query(
        'SELECT id, status FROM "Leads"',
        { type: Sequelize.QueryTypes.SELECT }
      );

      console.log(`Found ${leads.length} leads to rollback`);

      // Step 2: Map new statuses back to old statuses
      const reverseStatusMappings = {
        'New': 'New', // Keep as is
        'In Conversation': 'Contacted', // Map back to "Contacted"  
        'Qualified': 'Qualified', // Keep as is
        'Appointment Set': 'Qualified', // Map back to closest old value
        'Converted': 'Qualified', // Map back to closest old value
        'Inactive': 'Lost' // Map back to "Lost"
      };

      // Step 3: Update each lead with the old status
      for (const lead of leads) {
        const newStatus = lead.status;
        const oldStatus = reverseStatusMappings[newStatus] || 'New'; // Default to New if unknown status

        if (newStatus !== oldStatus) {
          console.log(`Rolling back lead ${lead.id} status from "${newStatus}" to "${oldStatus}"`);
          
          await queryInterface.sequelize.query(
            `UPDATE "Leads" SET status = ? WHERE id = ?`,
            {
              replacements: [oldStatus, lead.id],
              type: Sequelize.QueryTypes.UPDATE
            }
          );
        }
      }

      console.log('Rollback completed successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Rollback failed:', error);
      return Promise.reject(error);
    }
  }
}; 