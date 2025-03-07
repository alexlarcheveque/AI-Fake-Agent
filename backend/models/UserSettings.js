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
