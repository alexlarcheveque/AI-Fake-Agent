// Create this new file to handle all associations
import Lead from "./Lead.js";
import User from "./User.js";
import Message from "./Message.js";
import UserSettings from "./UserSettings.js";
import Appointment from "./Appointment.js";
import Property from "./Property.js";
import LeadPropertySearch from "./LeadPropertySearch.js";
import PropertyMatch from "./PropertyMatch.js";
import Notification from "./Notification.js";

const initializeAssociations = () => {
  // User - Lead association
  User.hasMany(Lead, { foreignKey: "userId" });
  Lead.belongsTo(User, { foreignKey: "userId" });

  // Lead - Message association
  Lead.hasMany(Message, { foreignKey: "leadId" });
  Message.belongsTo(Lead, { foreignKey: "leadId" });

  // User - UserSettings association
  User.hasMany(UserSettings, { foreignKey: "userId" });
  UserSettings.belongsTo(User, { foreignKey: "userId" });
  
  // Lead - Appointment association
  Lead.hasMany(Appointment, { foreignKey: "leadId" });
  Appointment.belongsTo(Lead, { foreignKey: "leadId" });
  
  // User - Appointment association
  User.hasMany(Appointment, { foreignKey: "userId" });
  Appointment.belongsTo(User, { foreignKey: "userId" });
  
  // Lead - PropertySearch association
  Lead.hasMany(LeadPropertySearch, { foreignKey: "leadId" });
  LeadPropertySearch.belongsTo(Lead, { foreignKey: "leadId" });
  
  // PropertySearch - PropertyMatch association
  LeadPropertySearch.hasMany(PropertyMatch, { foreignKey: "searchId" });
  PropertyMatch.belongsTo(LeadPropertySearch, { foreignKey: "searchId" });
  
  // Property - PropertyMatch association
  Property.hasMany(PropertyMatch, { foreignKey: "propertyId" });
  PropertyMatch.belongsTo(Property, { foreignKey: "propertyId" });
  
  // Lead - PropertyMatch association
  Lead.hasMany(PropertyMatch, { foreignKey: "leadId" });
  PropertyMatch.belongsTo(Lead, { foreignKey: "leadId" });
  
  // User - Notification association
  User.hasMany(Notification, { foreignKey: "userId" });
  Notification.belongsTo(User, { foreignKey: "userId" });
}

export default initializeAssociations;
