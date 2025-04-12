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
module.exports = Lead;

// Set up associations after export (this avoids circular dependencies)
// This needs to be after the export
setTimeout(() => {
  const Message = require("./Message");
  const User = require("./User");

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
