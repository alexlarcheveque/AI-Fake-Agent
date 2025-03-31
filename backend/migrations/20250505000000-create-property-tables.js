module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, create the Properties table
      await queryInterface.createTable('Properties', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        externalId: {
          type: Sequelize.STRING,
          allowNull: true
        },
        address: {
          type: Sequelize.STRING,
          allowNull: false
        },
        city: {
          type: Sequelize.STRING,
          allowNull: false
        },
        state: {
          type: Sequelize.STRING,
          allowNull: false
        },
        zipCode: {
          type: Sequelize.STRING,
          allowNull: false
        },
        price: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        bedrooms: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        bathrooms: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        squareFeet: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        propertyType: {
          type: Sequelize.STRING,
          allowNull: false
        },
        images: {
          type: Sequelize.JSON,
          allowNull: true
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        features: {
          type: Sequelize.JSON,
          allowNull: true
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'Active'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
      
      console.log('Created Properties table');
      
      // Next, create the LeadPropertySearches table
      await queryInterface.createTable('LeadPropertySearches', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        leadId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Leads',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        minBedrooms: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        maxBedrooms: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        minBathrooms: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        maxBathrooms: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        minPrice: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        maxPrice: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        minSquareFeet: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        maxSquareFeet: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        locations: {
          type: Sequelize.JSON,
          allowNull: true
        },
        propertyTypes: {
          type: Sequelize.JSON,
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        originalSearchText: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
      
      console.log('Created LeadPropertySearches table');
      
      // Finally, create the PropertyMatches table
      await queryInterface.createTable('PropertyMatches', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        leadId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Leads',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        propertyId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Properties',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        searchId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'LeadPropertySearches',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        matchScore: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        wasSent: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        wasViewed: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        leadInterest: {
          type: Sequelize.ENUM('unknown', 'interested', 'not_interested'),
          defaultValue: 'unknown'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
      
      console.log('Created PropertyMatches table');
      
      // Create indexes for better query performance
      await queryInterface.addIndex('Properties', ['status']);
      await queryInterface.addIndex('Properties', ['propertyType']);
      await queryInterface.addIndex('Properties', ['price']);
      await queryInterface.addIndex('Properties', ['bedrooms']);
      await queryInterface.addIndex('LeadPropertySearches', ['leadId', 'isActive']);
      await queryInterface.addIndex('PropertyMatches', ['leadId', 'wasSent']);
      await queryInterface.addIndex('PropertyMatches', ['searchId']);
      
      console.log('Created all property-related tables and indexes successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error creating property tables:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Drop tables in reverse order to avoid foreign key constraints
      await queryInterface.dropTable('PropertyMatches');
      await queryInterface.dropTable('LeadPropertySearches');
      await queryInterface.dropTable('Properties');
      
      console.log('Dropped all property-related tables successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error dropping property tables:', error);
      return Promise.reject(error);
    }
  }
}; 