module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("UserSettings", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      agentName: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "",
      },
      companyName: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "",
      },
      agentCity: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "",
      },
      agentState: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "",
      },
      aiAssistantEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    await queryInterface.dropTable("UserSettings");
  },
};
