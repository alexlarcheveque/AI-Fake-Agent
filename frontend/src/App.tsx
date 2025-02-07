import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "../components/Navbar";
import Dashboard from "../components/Dashboard";
import LeadManagement from "../components/LeadManagement";
import MessageCenter from "../components/MessageCenter";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<LeadManagement />} />
            <Route path="/messages" element={<MessageCenter />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
