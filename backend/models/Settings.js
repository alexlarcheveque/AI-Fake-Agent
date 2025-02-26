const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Settings = sequelize.define(
  "Settings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Allow null for global settings
      references: {
        model: User,
        key: "id",
      },
    },
    key: {
      type: DataTypes.STRING,
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
    indexes: [
      // Create a composite unique index for userId + key
      {
        unique: true,
        fields: ["user_id", "key"],
        name: "settings_user_key_unique",
      },
    ],
  }
);

// Define relationship
Settings.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Settings, { foreignKey: "userId" });

// Ensure the model is initialized
Settings.sync({ alter: true }); // Use alter:true to modify existing table

module.exports = Settings;
