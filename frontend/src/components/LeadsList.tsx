import { useEffect, useState } from "react";
import { useSocket } from "../contexts/SocketContext";

const LeadsList = () => {
  const [leads, setLeads] = useState([]);
  const [newMessageLeads, setNewMessageLeads] = useState<number[]>([]);
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

  // Clear the new message indicator when selecting a lead
  const handleLeadSelect = (leadId) => {
    setNewMessageLeads((prev) => prev.filter((id) => id !== leadId));
    // Your existing lead selection code
  };

  // Render leads with new message indicators
  return (
    <div>
      {leads.map((lead) => (
        <div
          key={lead.id}
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
    </div>
  );
};
