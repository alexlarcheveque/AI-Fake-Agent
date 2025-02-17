import axios from "axios";
import { Lead } from "../types/lead";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const leadApi = {
  // Get all leads with pagination
  async getLeads(page: number = 1, limit: number = 10): Promise<Lead[]> {
    const response = await axios.get(
      `${API_URL}/leads?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Get a single lead
  async getLead(id: number): Promise<Lead> {
    const response = await axios.get(`${API_URL}/leads/${id}`);
    return response.data;
  },

  // Create a new lead
  async createLead(
    lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "archived">
  ): Promise<Lead> {
    const response = await axios.post(`${API_URL}/leads`, lead);
    return response.data;
  },

  // Update a lead
  async updateLead(id: number, lead: Partial<Lead>): Promise<Lead> {
    const response = await axios.put(`${API_URL}/leads/${id}`, lead);
    return response.data;
  },

  // Archive a lead
  async archiveLead(id: string): Promise<void> {
    await axios.put(`${API_URL}/leads/${id}/archive`);
  },

  // Delete a lead
  async deleteLead(id: number): Promise<void> {
    await axios.delete(`${API_URL}/leads/${id}`);
  },
};

export default leadApi;
