import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Lead from "./Lead.js";
import User from "./User.js";

const Appointment = sequelize.define(
  "Appointment",
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
        model: "Leads",
        key: "id",
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "scheduled",
      validate: {
        isIn: [["scheduled", "completed", "cancelled", "rescheduled"]],
      },
    },
  },
  {
    timestamps: true,
  }
);

export default Appointment;

// Set up associations after export
setTimeout(() => {

  Appointment.belongsTo(Lead, {
    foreignKey: "leadId",
    onDelete: "CASCADE",
  });

  Appointment.belongsTo(User, {
    foreignKey: "userId",
  });
}, 0); 