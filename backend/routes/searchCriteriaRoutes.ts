import express from "express";
import asyncHandler from "express-async-handler";
import {
  createSearchCriteriaController,
  getSearchCriteriaByIdController,
  getSearchCriteriaByLeadIdController,
  updateSearchCriteriaController,
  deleteSearchCriteriaController,
  upsertSearchCriteriaController,
} from "../controllers/searchCriteriaController.ts";
import protect from "../middleware/authMiddleware.ts";

const router = express.Router();

// Apply protect middleware to all search criteria routes
router.use(protect);

// Create new search criteria
router.post(
  "/",
  asyncHandler((req, res) => createSearchCriteriaController(req, res))
);

// Get search criteria by ID
router.get(
  "/:id",
  asyncHandler((req, res) => getSearchCriteriaByIdController(req, res))
);

// Get search criteria by lead ID
router.get(
  "/lead/:leadId",
  asyncHandler((req, res) => getSearchCriteriaByLeadIdController(req, res))
);

// Update search criteria
router.put(
  "/:id",
  asyncHandler((req, res) => updateSearchCriteriaController(req, res))
);

// Delete search criteria
router.delete(
  "/:id",
  asyncHandler((req, res) => deleteSearchCriteriaController(req, res))
);

// Upsert search criteria (create or update)
router.post(
  "/upsert",
  asyncHandler((req, res) => upsertSearchCriteriaController(req, res))
);

export default router;
