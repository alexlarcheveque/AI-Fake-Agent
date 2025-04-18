import express from "express";
import leadController from "../controllers/leadController.js";
import multer from "multer";

const router = express.Router();

// Configure multer for CSV file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

// Get all leads
router.get("/", leadController.getAllLeads);

// Download lead template - MUST be before /:id route
router.get("/template", leadController.downloadLeadTemplate);

// Bulk import leads from CSV - MUST be before /:id route
router.post("/bulk", upload.single('file'), leadController.bulkImportLeads);

// Fix lead scheduling - MUST be before /:id route
router.post("/fix-scheduling/:id", leadController.fixLeadScheduling);

// Fix all lead schedule intervals - MUST be before /:id route
router.post("/fix-all-schedule-intervals", leadController.fixAllScheduleIntervals);

// Schedule follow-up - MUST be before /:id route
router.post("/schedule-followup/:id", leadController.scheduleFollowUp);

// Mark lead as qualified - MUST be before /:id route
router.post("/mark-qualified/:id", leadController.markLeadAsQualified);

// Process inactive leads - MUST be before /:id route
router.post("/process-inactive", leadController.processInactiveLeads);

// Update lead status - MUST be before /:id route
router.post("/status/:id", leadController.updateLeadStatus);

// Fix leads with null userId - MUST be before /:id route
router.post("/fix-null-user", leadController.fixLeadsWithoutUser);

// Get a single lead by id - Place parametrized routes AFTER specific routes
router.get("/:id", leadController.getLeadById);

// Create a new lead
router.post("/", leadController.createLead);

// Update a lead
router.put("/:id", leadController.updateLead);

// Delete a lead
router.delete("/:id", leadController.deleteLead);

export default router;
