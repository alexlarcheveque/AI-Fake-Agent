const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const UserSettings = sequelize.define(
  "UserSettings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // One settings record per user
      references: {
        model: User,
        key: "id",
      },
    },
    agentName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    agentCity: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    agentState: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    aiAssistantEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
  }
);

// Define relationship
UserSettings.belongsTo(User, { foreignKey: "userId" });
User.hasOne(UserSettings, { foreignKey: "userId" });

module.exports = UserSettings;
