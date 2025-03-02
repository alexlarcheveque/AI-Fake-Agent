const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Lead = require("./Lead");

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
    direction: {
      type: DataTypes.ENUM("inbound", "outbound"),
      allowNull: false,
      defaultValue: function () {
        // Default based on sender if available
        return this.sender === "agent" ? "outbound" : "inbound";
      },
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
  },
  {
    timestamps: true,
    validate: {
      senderDirectionConsistency() {
        if (
          (this.sender === "agent" && this.direction !== "outbound") ||
          (this.sender === "lead" && this.direction !== "inbound")
        ) {
          throw new Error("Sender and direction must be consistent");
        }
      },
    },
  }
);

// Set up the relationship
Message.belongsTo(Lead, { foreignKey: "leadId" });
Lead.hasMany(Message, { foreignKey: "leadId" });

module.exports = Message;
