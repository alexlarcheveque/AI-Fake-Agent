import { useState, useEffect } from "react";
import leadApi, { Lead } from "../api/leadApi";

const useFetchLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const fetchLeads = async () => {
      const data = await leadApi.getLeads();
      setLeads(data);
    };
    fetchLeads();
  }, []);

  return leads;
};

export default useFetchLeads;
