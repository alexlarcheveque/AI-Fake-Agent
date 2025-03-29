// Create this new file to handle all associations
const Lead = require("./Lead");
const Message = require("./Message");
const Appointment = require("./Appointment");

// Define associations
Lead.hasMany(Message, {
  foreignKey: "leadId",
  onDelete: "CASCADE",
});

Message.belongsTo(Lead, {
  foreignKey: "leadId",
});

// Appointment associations
Lead.hasMany(Appointment, {
  foreignKey: "leadId",
  onDelete: "CASCADE",
});

Appointment.belongsTo(Lead, {
  foreignKey: "leadId",
});

module.exports = {
  Lead,
  Message,
  Appointment,
};
