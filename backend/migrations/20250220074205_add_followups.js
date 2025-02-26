module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add enableFollowUps column to Leads
    await queryInterface.addColumn("Leads", "enableFollowUps", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // Create FollowUps table
    await queryInterface.createTable("FollowUps", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      leadId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Leads",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      scheduledFor: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("pending", "sent", "cancelled"),
        defaultValue: "pending",
      },
      followUpNumber: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      lastMessageDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Leads", "enableFollowUps");
    await queryInterface.dropTable("FollowUps");
  },
};
