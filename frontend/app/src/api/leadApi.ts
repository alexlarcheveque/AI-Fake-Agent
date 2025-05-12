import { LeadInsert, LeadRow } from "../../../../backend/models/Lead";
import apiClient from "./apiClient";

// Fix TypeScript error by declaring type for import.meta.env
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

// Define lead limit info type
export interface LeadLimitInfo {
  currentCount: number;
  limit: number;
  subscriptionPlan: string;
  canCreateLead: boolean;
}

const leadApi = {
  // Get leads by user ID
  async getLeadsByUserId(): Promise<LeadRow[]> {
    try {
      return await apiClient.get("/leads/user");
    } catch (error) {
      console.error("Error fetching leads by user ID:", error);
      throw error;
    }
  },

  // Get lead limit info for the current user
  async getLeadLimitInfo(): Promise<LeadLimitInfo> {
    try {
      return await apiClient.get("/leads/limit");
    } catch (error) {
      console.error("Error fetching lead limit info:", error);
      throw error;
    }
  },

  // Get a single lead by ID
  async getLead(id: number): Promise<LeadRow> {
    return await apiClient.get(`/leads/${id}`);
  },

  // Create a new lead
  async createLead(
    lead: Omit<LeadRow, "id" | "created_at" | "updated_at" | "archived">
  ): Promise<LeadRow> {
    return await apiClient.post("/leads", lead);
  },

  // Update a lead
  async updateLead(id: number, lead: LeadInsert): Promise<LeadRow> {
    return await apiClient.put(`/leads/${id}`, lead);
  },

  // Delete a lead
  async deleteLead(id: number): Promise<void> {
    await apiClient.delete(`/leads/${id}`);
  },

  // Import leads from CSV
  async importLeadsFromCSV(
    file: File,
    aiFeatures: boolean
  ): Promise<LeadRow[]> {
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
