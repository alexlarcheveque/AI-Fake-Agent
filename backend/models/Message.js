const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

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
        model: "Leads",
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
      defaultValue: "agent",
    },
    direction: {
      type: DataTypes.ENUM("inbound", "outbound"),
      allowNull: true,
      defaultValue: "outbound",
    },
    isAiGenerated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    twilioSid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deliveryStatus: {
      type: DataTypes.ENUM(
        "queued",
        "sending",
        "sent",
        "delivered",
        "failed",
        "undelivered",
        "read"
      ),
      defaultValue: "queued",
    },
    errorCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    statusUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    hooks: {
      beforeValidate: (message) => {
        if (message.direction === null || message.direction === undefined) {
          message.direction = message.sender === "lead" ? "inbound" : "outbound";
        }
      }
    },
    validate: {
      senderDirectionConsistency() {
        if (this.direction && 
          ((this.sender === "agent" && this.direction !== "outbound") ||
           (this.sender === "lead" && this.direction !== "inbound"))
        ) {
          throw new Error("Sender and direction must be consistent");
        }
      },
    },
  }
);

// Export the model immediately
module.exports = Message;

// Set up associations after export
setTimeout(() => {
  const Lead = require("./Lead");

  Message.belongsTo(Lead, {
    foreignKey: "leadId",
  });
}, 0);
