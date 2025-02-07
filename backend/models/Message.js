const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Lead = require("./Lead");

const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Lead,
        key: "id",
      },
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sender: {
      type: DataTypes.ENUM("agent", "lead"),
      allowNull: false,
    },
    twilioSid: {
      type: DataTypes.STRING,
      unique: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
  }
);

// Set up the relationship
Message.belongsTo(Lead, { foreignKey: "leadId" });
Lead.hasMany(Message, { foreignKey: "leadId" });

module.exports = Message;
