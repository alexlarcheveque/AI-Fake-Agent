import {
  createSearchCriteria as createSearchCriteriaService,
  getSearchCriteriaById as getSearchCriteriaByIdService,
  getSearchCriteriaByLeadId as getSearchCriteriaByLeadIdService,
  updateSearchCriteria as updateSearchCriteriaService,
  deleteSearchCriteria as deleteSearchCriteriaService,
  upsertSearchCriteria as upsertSearchCriteriaService,
} from "../services/searchCriteriaService.ts";

// Create new search criteria
export const createSearchCriteriaController = async (req, res) => {
  const {
    lead_id,
    locations,
    min_price,
    max_price,
    min_bedrooms,
    max_bedroom,
    min_bathrooms,
    max_bathrooms,
    min_square_feet,
    max_square_feet,
    property_types,
  } = req.body;

  // Validate required field
  if (!lead_id) {
    return res.status(400).json({ error: "Missing required field: lead_id" });
  }

  try {
    const searchCriteria = await createSearchCriteriaService({
      lead_id,
      locations,
      min_price,
      max_price,
      min_bedrooms,
      max_bedroom,
      min_bathrooms,
      max_bathrooms,
      min_square_feet,
      max_square_feet,
      property_types,
    });

    res.status(201).json(searchCriteria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get search criteria by ID
export const getSearchCriteriaByIdController = async (req, res) => {
  const { id } = req.params;

  try {
    const searchCriteria = await getSearchCriteriaByIdService(Number(id));

    if (!searchCriteria) {
      return res.status(404).json({ error: "Search criteria not found" });
    }

    res.json(searchCriteria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get search criteria by lead ID
export const getSearchCriteriaByLeadIdController = async (req, res) => {
  const { leadId } = req.params;

  console.log("leadId", leadId);

  try {
    const searchCriteria = await getSearchCriteriaByLeadIdService(
      Number(leadId)
    );

    if (!searchCriteria) {
      // Not an error, there might not be any search criteria yet
      return res.json(null);
    }

    console.log("searchCriteria", searchCriteria);

    res.json(searchCriteria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update search criteria
export const updateSearchCriteriaController = async (req, res) => {
  const { id } = req.params;
  const {
    lead_id,
    locations,
    min_price,
    max_price,
    min_bedrooms,
    max_bedroom,
    min_bathrooms,
    max_bathrooms,
    min_square_feet,
    max_square_feet,
    property_types,
  } = req.body;

  try {
    const searchCriteria = await updateSearchCriteriaService(Number(id), {
      lead_id,
      locations,
      min_price,
      max_price,
      min_bedrooms,
      max_bedroom,
      min_bathrooms,
      max_bathrooms,
      min_square_feet,
      max_square_feet,
      property_types,
    });

    res.json(searchCriteria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete search criteria
export const deleteSearchCriteriaController = async (req, res) => {
  const { id } = req.params;

  try {
    const searchCriteria = await deleteSearchCriteriaService(Number(id));
    res.json({ message: "Search criteria deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upsert search criteria (create or update)
export const upsertSearchCriteriaController = async (req, res) => {
  const {
    id, // optional, may not be present for new criteria
    lead_id,
    locations,
    min_price,
    max_price,
    min_bedrooms,
    max_bedroom,
    min_bathrooms,
    max_bathrooms,
    min_square_feet,
    max_square_feet,
    property_types,
  } = req.body;

  // Validate required field
  if (!lead_id) {
    return res.status(400).json({ error: "Missing required field: lead_id" });
  }

  try {
    const searchCriteria = await upsertSearchCriteriaService({
      id,
      lead_id,
      locations,
      min_price,
      max_price,
      min_bedrooms,
      max_bedroom,
      min_bathrooms,
      max_bathrooms,
      min_square_feet,
      max_square_feet,
      property_types,
    });

    res.status(201).json(searchCriteria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
