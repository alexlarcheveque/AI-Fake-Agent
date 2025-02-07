import LeadForm from "./LeadForm";
import LeadList from "./LeadList";

const LeadManagement = () => {
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
            <LeadForm />
          </div>
        </div>
      </div>

      {/* Lead List Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Lead List</h2>
        <LeadList />
      </div>
    </div>
  );
};

export default LeadManagement;
