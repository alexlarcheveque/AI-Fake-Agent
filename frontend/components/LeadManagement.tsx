import { useState, useCallback, useEffect } from "react";
import LeadForm from "./LeadForm";
import LeadList from "./LeadList";
import leadApi, { Lead } from "../src/api/leadApi";

const LeadManagement = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await leadApi.getLeads();
      setLeads(data);
    } catch (err) {
      setError("Failed to fetch leads");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleLeadCreated = useCallback(async (newLead: Lead) => {
    setLeads((prevLeads) => [...prevLeads, newLead]);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Lead Management</h1>

      {/* Add Lead Form Section */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Add New Lead
            </h2>
            <LeadForm onLeadCreated={handleLeadCreated} />
          </div>
        </div>
      </div>

      {/* Lead List Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Lead List</h2>
        <LeadList
          leads={leads}
          isLoading={isLoading}
          error={error}
          onLeadsChange={setLeads}
          onError={setError}
        />
      </div>
    </div>
  );
};

export default LeadManagement;
