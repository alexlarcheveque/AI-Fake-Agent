const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Lead = require("./Lead");

const FollowUp = sequelize.define(
  "FollowUp",
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
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "sent", "failed"),
      defaultValue: "pending",
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    followUpNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    lastMessageDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

FollowUp.belongsTo(Lead, { foreignKey: "leadId" });
Lead.hasMany(FollowUp, { foreignKey: "leadId" });

module.exports = FollowUp;
