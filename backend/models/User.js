const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // New fields for Google Calendar OAuth
    googleTokens: {
      type: DataTypes.TEXT, // Store the JSON token object as text
      allowNull: true,
    },
    googleCalendarConnected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

// Instance method to check password
User.prototype.checkPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Set up associations after export (this avoids circular dependencies)
setTimeout(() => {
  const Lead = require('./lead');
  
  User.hasMany(Lead, {
    foreignKey: 'userId',
    as: 'leads',
    onDelete: 'CASCADE'
  });
}, 0);

// This relationship will be properly set up in Settings.js
// User.hasMany(Settings, { foreignKey: 'userId' });

module.exports = User;
