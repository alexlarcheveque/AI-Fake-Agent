// Create this new file to handle all associations
const Lead = require("./Lead");
const User = require("./User");
const Message = require("./Message");
const UserSettings = require("./UserSettings");
const Appointment = require("./Appointment");
const Property = require("./Property");
const LeadPropertySearch = require("./LeadPropertySearch");
const PropertyMatch = require("./PropertyMatch");

function initializeAssociations() {
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
}

module.exports = initializeAssociations;
