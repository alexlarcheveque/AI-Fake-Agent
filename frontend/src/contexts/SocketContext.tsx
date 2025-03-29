import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  reconnect: () => void;
  lastEventTime: Date | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  reconnect: () => {},
  lastEventTime: null
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);

  const setupSocket = () => {
    console.log("Setting up socket connection...");
    
    // Create socket connection with reconnection options
    const socketInstance = io(
      import.meta.env.VITE_API_URL || "http://localhost:3000",
      {
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000,
        autoConnect: true,
      }
    );

    // Set up event listeners with better logging
    socketInstance.on("connect", () => {
      console.log("Socket connected successfully:", socketInstance.id);
      setConnected(true);
      setReconnectAttempts(0);
      setLastEventTime(new Date());
      
      // Add acknowledgement callback for all events
      socketInstance.onAny((event, ...args) => {
        console.log(`🛎️ Socket event "${event}" received:`, args);
        setLastEventTime(new Date());
        
        // Return acknowledgement for event-based callbacks
        if (args.length > 0 && typeof args[args.length - 1] === 'function') {
          const callback = args[args.length - 1];
          callback({ received: true, clientId: socketInstance.id, timestamp: new Date().toISOString() });
        }
      });
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setConnected(false);
      setLastEventTime(new Date());
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setReconnectAttempts(prev => prev + 1);
      setLastEventTime(new Date());
    });
    
    socketInstance.on("reconnect", (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      setConnected(true);
      setLastEventTime(new Date());
    });
    
    socketInstance.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Socket reconnection attempt #${attemptNumber}`);
      setLastEventTime(new Date());
    });
    
    socketInstance.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error);
      setLastEventTime(new Date());
    });
    
    socketInstance.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
      setLastEventTime(new Date());
    });
    
    // Add a custom ping handler to check connection status
    let pingTimer = setInterval(() => {
      if (socketInstance.connected) {
        console.log("Socket ping - connected:", socketInstance.id);
        if (typeof socketInstance.emit === 'function') {
          socketInstance.emit("ping", { timestamp: new Date().toISOString() }, (response: any) => {
            console.log("Socket ping response:", response);
          });
        }
      } else {
        console.log("Socket ping - disconnected");
      }
    }, 30000);

    // Save socket instance
    setSocket(socketInstance);
    
    return { socketInstance, pingTimer };
  };
  
  const reconnect = () => {
    console.log("Manually reconnecting socket...");
    if (socket) {
      socket.disconnect();
      socket.connect();
      setLastEventTime(new Date());
    } else {
      setupSocket();
    }
  };

  useEffect(() => {
    const { socketInstance, pingTimer } = setupSocket();

    // Clean up on unmount
    return () => {
      console.log("Cleaning up socket connection");
      socketInstance.disconnect();
      clearInterval(pingTimer);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, reconnect, lastEventTime }}>
      {children}
      {reconnectAttempts > 5 && !connected && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Connection lost. </span>
            <button 
              onClick={reconnect} 
              className="ml-2 bg-white text-red-600 px-2 py-1 rounded text-sm font-medium"
            >
              Reconnect
            </button>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
};
