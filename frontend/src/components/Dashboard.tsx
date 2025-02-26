import messageApi from "@/api/messageApi";
import React from "react";

const testTwilio = async () => {
  const message = await messageApi.testTwilio("test");
  console.log(message);
};

const Dashboard: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Welcome to your dashboard!</p>
        <button onClick={() => testTwilio()}>Test Twilio</button>
      </div>
    </div>
  );
};

export default Dashboard;
