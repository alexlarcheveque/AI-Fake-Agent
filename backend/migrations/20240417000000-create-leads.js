import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('leads', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'New'
    },
    leadType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'buyer'
    },
    aiAssistantEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    nextScheduledMessage: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastMessageDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    messageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    enableFollowUps: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    firstMessageTiming: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'immediate'
    },
    context: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('leads');
} 