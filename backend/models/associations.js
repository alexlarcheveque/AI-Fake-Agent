// Create this new file to handle all associations
const Lead = require("./Lead");
const Message = require("./Message");
const FollowUp = require("./FollowUp");

// Define associations
Lead.hasMany(Message, {
  foreignKey: "leadId",
  onDelete: "CASCADE",
});

Message.belongsTo(Lead, {
  foreignKey: "leadId",
});

// Add other associations as needed
Lead.hasMany(FollowUp, {
  foreignKey: "leadId",
  onDelete: "CASCADE",
});

FollowUp.belongsTo(Lead, {
  foreignKey: "leadId",
});

module.exports = {
  Lead,
  Message,
  FollowUp,
};
