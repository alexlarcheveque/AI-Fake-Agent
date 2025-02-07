const Dashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Total Leads</h3>
          <p className="text-3xl font-bold text-blue-600">123</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Messages Sent</h3>
          <p className="text-3xl font-bold text-green-600">456</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Response Rate</h3>
          <p className="text-3xl font-bold text-purple-600">78%</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
