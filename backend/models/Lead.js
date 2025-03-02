const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Lead = sequelize.define(
  "Lead",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "new",
    },
    aiAssistantEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    nextScheduledMessage: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastMessageDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    messageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    enableFollowUps: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
    },
    firstMessageTiming: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "immediate",
      validate: {
        isIn: [["immediate", "next_day", "one_week", "two_weeks"]],
      },
    },
    archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Lead;
