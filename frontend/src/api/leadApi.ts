import { Lead } from "../types/lead";
import apiClient from "./apiClient";

// Fix TypeScript error by declaring type for import.meta.env
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

interface GetLeadsResponse {
  leads: Lead[];
  currentPage: number;
  totalPages: number;
  totalLeads: number;
}

const leadApi = {
  // Get leads by user ID
  async getLeadsByUserId(): Promise<Lead[]> {
    try {
      return await apiClient.get("/api/leads/user");
    } catch (error) {
      console.error("Error fetching leads by user ID:", error);
      throw error;
    }
  },

  // Get all leads with pagination and search
  async getLeads(): Promise<Lead[]> {
    return await apiClient.get("/api/leads");
  },

  // Get a single lead by ID
  async getLead(id: number): Promise<Lead> {
    return await apiClient.get(`/api/leads/${id}`);
  },

  // Create a new lead
  async createLead(
    lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "archived">
  ): Promise<Lead> {
    return await apiClient.post("/api/leads", lead);
  },

  // Update a lead
  async updateLead(id: number, lead: Partial<Lead>): Promise<Lead> {
    return await apiClient.put(`/api/leads/${id}`, lead);
  },

  // Delete a lead
  async deleteLead(id: number): Promise<void> {
    await apiClient.delete(`/api/leads/${id}`);
  },
};

export default leadApi;
