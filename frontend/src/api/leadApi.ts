import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export interface Lead {
  id: number;
  name: string;
  phoneNumber: string;
  email: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const leadApi = {
  // Get all leads
  async getLeads(): Promise<Lead[]> {
    const response = await axios.get(`${API_URL}/leads`);
    return response.data;
  },

  // Get a single lead
  async getLead(id: number): Promise<Lead> {
    const response = await axios.get(`${API_URL}/leads/${id}`);
    return response.data;
  },

  // Create a new lead
  async createLead(
    lead: Omit<Lead, "id" | "createdAt" | "updatedAt">
  ): Promise<Lead> {
    const response = await axios.post(`${API_URL}/leads`, lead);
    return response.data;
  },

  // Update a lead
  async updateLead(id: number, lead: Partial<Lead>): Promise<Lead> {
    const response = await axios.put(`${API_URL}/leads/${id}`, lead);
    return response.data;
  },
};

export default leadApi;
