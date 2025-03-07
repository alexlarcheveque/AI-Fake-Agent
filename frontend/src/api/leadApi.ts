import axios from "axios";
import { Lead } from "../types/lead";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface GetLeadsResponse {
  leads: Lead[];
  currentPage: number;
  totalPages: number;
  totalLeads: number;
}

interface SearchFilters {
  name?: boolean;
  email?: boolean;
  phone?: boolean;
  status?: boolean;
}

const leadApi = {
  // Get all leads with pagination and search
  async getLeads(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    searchFilters: SearchFilters = {}
  ): Promise<GetLeadsResponse> {
    // Convert searchFilters to array of fields to search
    const searchFields = Object.entries(searchFilters)
      .filter(([_, enabled]) => enabled)
      .map(([field]) => (field === "phone" ? "phoneNumber" : field));

    const response = await axios.get(`${BASE_URL}/api/leads`, {
      params: {
        page,
        limit,
        search,
        searchFields: JSON.stringify(searchFields),
      },
    });
    return response.data;
  },

  // Get a single lead
  async getLead(id: number): Promise<Lead> {
    const response = await axios.get(`${BASE_URL}/api/leads/${id}`);
    return response.data;
  },

  // Create a new lead
  async createLead(
    lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "archived">
  ): Promise<Lead> {
    const response = await axios.post(`${BASE_URL}/api/leads`, lead);
    return response.data;
  },

  // Update a lead
  async updateLead(id: number, lead: Partial<Lead>): Promise<Lead> {
    const response = await axios.put(`${BASE_URL}/api/leads/${id}`, lead);
    return response.data;
  },

  // Archive a lead
  async archiveLead(id: string): Promise<void> {
    await axios.put(`${BASE_URL}/api/leads/${id}/archive`);
  },

  // Delete a lead
  async deleteLead(id: number): Promise<void> {
    await axios.delete(`${BASE_URL}/api/leads/${id}`);
  },
};

export default leadApi;
