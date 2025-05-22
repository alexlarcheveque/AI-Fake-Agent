import apiClient from "./apiClient";
import {
  SearchCriteriaRow,
  SearchCriteriaInsert,
  SearchCriteriaUpdate,
} from "../../../../backend/models/SearchCriteria.ts";

const searchCriteriaApi = {
  // Create a new search criteria
  createSearchCriteria: async (
    data: SearchCriteriaInsert
  ): Promise<SearchCriteriaRow> => {
    try {
      return await apiClient.post("/search-criteria", data);
    } catch (error) {
      console.error("Error creating search criteria:", error);
      throw error;
    }
  },

  // Get search criteria by ID
  getSearchCriteriaById: async (id: number): Promise<SearchCriteriaRow> => {
    try {
      return await apiClient.get(`/search-criteria/${id}`);
    } catch (error) {
      console.error("Error fetching search criteria by ID:", error);
      throw error;
    }
  },

  // Get search criteria for a specific lead
  getSearchCriteriaByLeadId: async (
    leadId: number
  ): Promise<SearchCriteriaRow | null> => {
    try {
      return await apiClient.get(`/search-criteria/lead/${leadId}`);
    } catch (error) {
      console.error("Error fetching search criteria by lead ID:", error);
      throw error;
    }
  },

  // Update an existing search criteria
  updateSearchCriteria: async (
    id: number,
    data: SearchCriteriaUpdate
  ): Promise<SearchCriteriaRow> => {
    try {
      return await apiClient.put(`/search-criteria/${id}`, data);
    } catch (error) {
      console.error("Error updating search criteria:", error);
      throw error;
    }
  },

  // Delete a search criteria
  deleteSearchCriteria: async (id: number): Promise<{ message: string }> => {
    try {
      return await apiClient.delete(`/search-criteria/${id}`);
    } catch (error) {
      console.error("Error deleting search criteria:", error);
      throw error;
    }
  },

  // Create or update search criteria (upsert)
  upsertSearchCriteria: async (
    data: SearchCriteriaInsert & { id?: number }
  ): Promise<SearchCriteriaRow> => {
    try {
      return await apiClient.post("/search-criteria/upsert", data);
    } catch (error) {
      console.error("Error upserting search criteria:", error);
      throw error;
    }
  },
};

export default searchCriteriaApi;
