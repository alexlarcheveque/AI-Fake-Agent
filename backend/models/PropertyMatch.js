import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const PropertyMatch = sequelize.define(
  "PropertyMatch",
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
    propertyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Properties",
        key: "id",
      },
    },
    searchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "LeadPropertySearches",
        key: "id",
      },
    },
    matchScore: {
      type: DataTypes.FLOAT, // 0-100% match
      allowNull: false,
    },
    wasSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    wasViewed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    leadInterest: {
      type: DataTypes.ENUM("unknown", "interested", "not_interested"),
      defaultValue: "unknown",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

export default PropertyMatch; 