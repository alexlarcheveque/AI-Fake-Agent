// Create this new file to handle all associations
import Lead from "./Lead.js";
import Message from "./Message.js";
import User from "./User.js";
import UserSettings from "./UserSettings.js";
import Appointment from "./Appointment.js";
import Notification from "./Notification.js";

const initializeAssociations = () => {
  // Lead associations
  Lead.hasMany(Message, { foreignKey: "leadId" });
  Lead.hasMany(Appointment, { foreignKey: "leadId" });
  Lead.hasMany(Notification, { foreignKey: "leadId" });

  // Message associations
  Message.belongsTo(Lead, { foreignKey: "leadId" });

  // User associations
  User.hasOne(UserSettings, { foreignKey: "userId" });
  UserSettings.belongsTo(User, { foreignKey: "userId" });

  // Appointment associations
  Appointment.belongsTo(Lead, { foreignKey: "leadId" });

  // Notification associations
  Notification.belongsTo(Lead, { foreignKey: "leadId" });
};

export default initializeAssociations;
