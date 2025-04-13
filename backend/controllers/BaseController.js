import { AppError } from "../middleware/errorHandler.js";

/**
 * Base controller with common CRUD operations
 */
class BaseController {
  constructor(service) {
    this.service = service;
  }

  /**
   * Get all records
   */
  getAll = async (req, res, next) => {
    try {
      const { page, limit, search, searchFields } = req.query;

      // Parse searchFields if provided as JSON string
      let parsedSearchFields = [];
      if (searchFields) {
        try {
          parsedSearchFields = JSON.parse(searchFields);
        } catch (error) {
          throw new AppError("Invalid searchFields format", 400);
        }
      }

      const result = await this.service.findAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || "",
        searchFields: parsedSearchFields,
      });

      return res.success(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single record
   */
  getOne = async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await this.service.findById(id);

      if (!item) {
        throw new AppError("Resource not found", 404);
      }

      return res.success(item);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new record
   */
  create = async (req, res, next) => {
    try {
      const newItem = await this.service.create(req.body);
      return res.created(newItem);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an existing record
   */
  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updatedItem = await this.service.update(id, req.body);
      return res.success(updatedItem);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a record
   */
  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      return res.success({ deleted: true });
    } catch (error) {
      next(error);
    }
  };
}

export default BaseController;
