const { Op } = require("sequelize");
const logger = require("../utils/logger");

/**
 * Base service class with common CRUD operations
 */
class BaseService {
  constructor(model, modelName) {
    this.model = model;
    this.modelName = modelName || model.name;
  }

  /**
   * Find all records with pagination and search
   */
  async findAll({
    page = 1,
    limit = 10,
    search = "",
    searchFields = [],
    where = {},
    order = [["createdAt", "DESC"]],
    include = [],
  } = {}) {
    try {
      const offset = (page - 1) * limit;

      // Add search conditions if provided
      if (search && searchFields.length > 0) {
        const searchConditions = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${search}%` },
        }));

        where = {
          ...where,
          [Op.or]: searchConditions,
        };
      }

      // Execute query
      const { count, rows } = await this.model.findAndCountAll({
        where,
        limit,
        offset,
        order,
        include,
        distinct: true,
      });

      return {
        items: rows,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
      };
    } catch (error) {
      logger.error(`Error finding all ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find record by primary key
   */
  async findById(id, { include = [] } = {}) {
    try {
      const item = await this.model.findByPk(id, { include });

      if (!item) {
        throw new Error(`${this.modelName} not found with id ${id}`);
      }

      return item;
    } catch (error) {
      logger.error(`Error finding ${this.modelName} by id:`, error);
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async create(data) {
    try {
      const item = await this.model.create(data);
      return item;
    } catch (error) {
      logger.error(`Error creating ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing record
   */
  async update(id, data) {
    try {
      const item = await this.findById(id);
      await item.update(data);
      return item;
    } catch (error) {
      logger.error(`Error updating ${this.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async delete(id) {
    try {
      const item = await this.findById(id);
      await item.destroy();
      return true;
    } catch (error) {
      logger.error(`Error deleting ${this.modelName}:`, error);
      throw error;
    }
  }
}

module.exports = BaseService;
