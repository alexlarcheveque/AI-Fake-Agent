const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserSettings = sequelize.define(
  "UserSettings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true, // Allow null for default settings
      unique: true, // Each user can have only one settings record
    },
    agentName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Your Name",
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Your Company",
    },
    agentCity: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agentState: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    aiAssistantEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // Follow-up interval settings (in days)
    followUpIntervalNew: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2, // Default: 2 days
    },
    followUpIntervalInConversation: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3, // Default: 3 days
    },
    followUpIntervalQualified: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5, // Default: 5 days
    },
    followUpIntervalAppointmentSet: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // Default: 1 day
    },
    followUpIntervalConverted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 14, // Default: 14 days
    },
    followUpIntervalInactive: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30, // Default: 30 days
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = UserSettings;
