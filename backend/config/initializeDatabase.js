import User from '../models/User.js';
import Lead from '../models/Lead.js';
import Message from '../models/Message.js';
import UserSettings from '../models/UserSettings.js';
import Notification from '../models/Notification.js';
import Appointment from '../models/Appointment.js';

const initializeDatabase = async () => {
  try {
    // First, create the Users table as it's the base table
    await User.sync({ alter: true });
    console.log('Users table synchronized');

    // Then create UserSettings as it depends on Users
    await UserSettings.sync({ alter: true });
    console.log('UserSettings table synchronized');

    // Create Leads table as it depends on Users
    await Lead.sync({ alter: true });
    console.log('Leads table synchronized');

    // Create Messages table as it depends on Leads
    await Message.sync({ alter: true });
    console.log('Messages table synchronized');

    // Create Appointments table as it depends on Leads and Users
    await Appointment.sync({ alter: true });
    console.log('Appointments table synchronized');

    // Finally create Notifications as it depends on Users and Leads
    await Notification.sync({ alter: true });
    console.log('Notifications table synchronized');

    console.log('All tables synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

export default initializeDatabase; 