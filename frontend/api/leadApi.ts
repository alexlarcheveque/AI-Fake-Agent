const API_BASE_URL = "http://localhost:3000/api";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export const getLeads = async (): Promise<Lead[]> => {
  const response = await fetch(`${API_BASE_URL}/leads`);
  if (!response.ok) {
    throw new Error("Failed to fetch leads");
  }
  return response.json();
};

export const createLead = async (lead: Omit<Lead, "id">): Promise<Lead> => {
  const response = await fetch(`${API_BASE_URL}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data; // Throw the entire error object
  }

  return data;
};
