import { DataTypes } from "sequelize";
import Message from "./Message.js";
import User from "./User.js";
import sequelize from "../config/database.js";

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
        isEmail: function (value) {
          if (value === null || value === "") return true; // Skip validation for empty values
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw new Error("Invalid email format");
          }
        },
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
      index: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "New",
      validate: {
        isIn: [["New", "In Conversation", "Qualified", "Appointment Set", "Converted", "Inactive"]]
      }
    },
    leadType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "buyer",
      validate: {
        isIn: [["buyer", "seller"]]
      }
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
      allowNull: false,
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
    context: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Property metadata and lead context information for AI responses"
    },
    archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    hooks: {
      // Add a hook to clear nextScheduledMessage when aiAssistantEnabled is set to false
      beforeUpdate: async (lead, options) => {
        // Check if aiAssistantEnabled is being changed to false
        if (lead.changed('aiAssistantEnabled') && lead.aiAssistantEnabled === false) {
          lead.nextScheduledMessage = null;
        }
      },
    },
  }
);

// Export the model immediately
export default Lead;

// Set up associations after export (this avoids circular dependencies)
// This needs to be after the export
setTimeout(() => {


  Lead.hasMany(Message, {
    foreignKey: "leadId",
    onDelete: "CASCADE",
  });

  Lead.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
    onDelete: "CASCADE",
  });
}, 0);
