const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Settings = sequelize.define(
  "Settings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    key: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "agent",
    },
  },
  {
    // Model options
    timestamps: true, // Enables createdAt and updatedAt
    tableName: "settings", // Force table name to be lowercase
    underscored: true, // Use snake_case for column names
  }
);

// Ensure the model is initialized
Settings.sync();

module.exports = Settings;
