import { Lead } from "../types/lead";
import apiClient from "./apiClient";

// Fix TypeScript error by declaring type for import.meta.env
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}

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

interface BulkImportResponse {
  success: boolean;
  message: string;
  created: Lead[];
  failed: Array<{
    data: Partial<Lead>;
    error: string;
  }>;
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

    return await apiClient.get("/api/leads", {
      params: {
        page,
        limit,
        search,
        searchFields: JSON.stringify(searchFields),
      },
    });
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

  // Archive a lead
  async archiveLead(id: string): Promise<void> {
    await apiClient.put(`/api/leads/${id}/archive`);
  },

  // Import leads from CSV file
  async importLeadsFromCSV(
    file: File,
    aiFeatures?: {
      aiAssistantEnabled: boolean;
      enableFollowUps: boolean;
      firstMessageTiming: string;
    }
  ): Promise<BulkImportResponse> {
    const formData = new FormData();
    formData.append("file", file);

    // Append AI feature settings if provided
    if (aiFeatures) {
      formData.append(
        "aiAssistantEnabled",
        aiFeatures.aiAssistantEnabled.toString()
      );
      formData.append("enableFollowUps", aiFeatures.enableFollowUps.toString());
      formData.append("firstMessageTiming", aiFeatures.firstMessageTiming);
    }

    const axios = apiClient.getInstance();
    const response = await axios.post(`/api/leads/bulk`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  // Download lead template
  downloadLeadTemplate(): void {
    // For downloads, we don't use the apiClient directly
    // but we could add the token as a query parameter
    const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
    window.open(`${BASE_URL}/api/leads/template`, "_blank");
  },
};

export default leadApi;
