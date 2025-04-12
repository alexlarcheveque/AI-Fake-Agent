import { useEffect, useState, useRef } from "react";
import { useSocket } from "../contexts/SocketContext";

const LeadsList = () => {
  const [leads, setLeads] = useState([]);
  const [newMessageLeads, setNewMessageLeads] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  // Fetch leads
  useEffect(() => {
    // Your existing code to fetch leads
  }, []);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      // Add the lead ID to the newMessageLeads array
      setNewMessageLeads((prev) => {
        if (!prev.includes(data.leadId)) {
          return [...prev, data.leadId];
        }
        return prev;
      });

      // Update the lead's last message if it's in the list
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === data.leadId
            ? {
                ...lead,
                lastMessageDate: new Date().toISOString(),
                lastMessage: data.message.text,
              }
            : lead
        )
      );
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  // Clear the new message indicator when selecting a lead
  const handleLeadSelect = (leadId) => {
    setNewMessageLeads((prev) => prev.filter((id) => id !== leadId));
    // Find the selected lead
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setSelectedLead(lead);
      setIsModalOpen(true);
    }
  };

  // Render leads with new message indicators
  return (
    <div>
      {leads.map((lead) => (
        <div
          key={`lead-${lead.id}`}
          onClick={() => handleLeadSelect(lead.id)}
          className={`lead-item ${
            newMessageLeads.includes(lead.id) ? "has-new-message" : ""
          }`}
        >
          <div className="lead-name">{lead.name}</div>
          {newMessageLeads.includes(lead.id) && (
            <div className="new-message-badge">New</div>
          )}
        </div>
      ))}

      {/* Modal */}
      {isModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedLead.name}</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{selectedLead.email || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p>{selectedLead.phoneNumber}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="capitalize">{selectedLead.status}</p>
              </div>
              
              {selectedLead.lastMessage && (
                <div>
                  <p className="text-sm text-gray-500">Last Message</p>
                  <p className="italic">{selectedLead.lastMessage}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsList;
