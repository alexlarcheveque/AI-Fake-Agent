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
      return await apiClient.get("/leads/user");
    } catch (error) {
      console.error("Error fetching leads by user ID:", error);
      throw error;
    }
  },

  // Get all leads with pagination and search
  async getLeads(page?: number, limit?: number): Promise<GetLeadsResponse> {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    return await apiClient.get(`/leads?${params.toString()}`);
  },

  // Get a single lead by ID
  async getLead(id: number): Promise<Lead> {
    return await apiClient.get(`/leads/${id}`);
  },

  // Create a new lead
  async createLead(
    lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "archived">
  ): Promise<Lead> {
    return await apiClient.post("/leads", lead);
  },

  // Update a lead
  async updateLead(id: number, lead: Partial<Lead>): Promise<Lead> {
    return await apiClient.put(`/leads/${id}`, lead);
  },

  // Delete a lead
  async deleteLead(id: number): Promise<void> {
    await apiClient.delete(`/leads/${id}`);
  },

  // Import leads from CSV
  async importLeadsFromCSV(file: File, aiFeatures: boolean): Promise<Lead[]> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("aiFeatures", aiFeatures.toString());
    return await apiClient.post("/leads/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Download lead template
  async downloadLeadTemplate(): Promise<void> {
    const response = await apiClient.get("/leads/template", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "lead_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default leadApi;
export type { Lead };
