const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const LeadPropertySearch = sequelize.define(
  "LeadPropertySearch",
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
    minBedrooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxBedrooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    minBathrooms: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    maxBathrooms: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    minPrice: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxPrice: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    minSquareFeet: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxSquareFeet: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    locations: {
      type: DataTypes.JSON, // Array of preferred locations/neighborhoods
      allowNull: true,
    },
    propertyTypes: {
      type: DataTypes.JSON, // Array of property types
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    originalSearchText: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "The original search criteria text from the AI",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = LeadPropertySearch; 