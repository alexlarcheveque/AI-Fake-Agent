// When sending a message to the playground
const handleSendMessage = async () => {
  try {
    const response = await fetch("/api/messages/send-local", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: inputText,
        previousMessages: conversationHistory,
        userId: currentUser?.id, // Add the userId if available
      }),
    });

    // Rest of your code...
  } catch (error) {
    console.error("Error:", error);
  }
};
