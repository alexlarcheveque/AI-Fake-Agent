const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Property = sequelize.define(
  "Property",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true, // If syncing with external MLS/API
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bedrooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bathrooms: {
      type: DataTypes.FLOAT, // For 1.5, 2.5 baths etc.
      allowNull: false,
    },
    squareFeet: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    propertyType: {
      type: DataTypes.STRING, // Single-family, condo, etc.
      allowNull: false,
    },
    images: {
      type: DataTypes.JSON, // Array of image URLs
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    features: {
      type: DataTypes.JSON, // Array of features
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING, // Active, pending, sold
      allowNull: false,
      defaultValue: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Property; 