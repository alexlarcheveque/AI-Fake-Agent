import React, { useState, useEffect } from "react";
import { PhoneCall, Bot, Clock, AlertTriangle } from "lucide-react";
import {
  webrtcVoiceService,
  CallMode,
  CallOptions,
} from "../services/webrtcVoiceService";
import { VoiceCallModal } from "./VoiceCallModal";
import { CallContextModal } from "./CallContextModal";

interface VoiceCallButtonProps {
  leadId: number;
  leadData: {
    name: string;
    phone: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
  onCallStarted?: (mode: CallMode) => void;
  onCallEnded?: () => void;
  className?: string;
}

export const VoiceCallButton: React.FC<VoiceCallButtonProps> = ({
  leadId,
  leadData,
  onCallStarted,
  onCallEnded,
  className = "",
}) => {
  const [showCallModal, setShowCallModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<CallMode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callState, setCallState] = useState(webrtcVoiceService.getCallState());
  const [leadContext, setLeadContext] = useState<any>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(
    webrtcVoiceService.isReady()
  );
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [pipelineOptions] = useState([
    {
      value: "SELLER_DISCOVERY",
      label: "Seller Discovery",
      description: "Initial discovery call for potential sellers",
    },
    {
      value: "BUYER_DISCOVERY",
      label: "Buyer Discovery",
      description: "Initial discovery call for potential buyers",
    },
    {
      value: "SELLER_CHECKIN_60",
      label: "Seller Check-in (60 days)",
      description: "60-day check-in for active sellers",
    },
    {
      value: "BUYER_CHECKIN_60",
      label: "Buyer Check-in (60 days)",
      description: "60-day check-in for active buyers",
    },
    {
      value: "SELLER_INACTIVE_120",
      label: "Seller Re-engagement (120 days)",
      description: "120-day re-engagement for inactive sellers",
    },
    {
      value: "BUYER_INACTIVE_120",
      label: "Buyer Re-engagement (120 days)",
      description: "120-day re-engagement for inactive buyers",
    },
  ]);

  useEffect(() => {
    const unsubscribe = webrtcVoiceService.subscribe({
      onStateChange: (state) => {
        setCallState(state);
        setIsDeviceReady(state.isReady);
        console.log("📱 Voice call state updated:", {
          isReady: state.isReady,
          isActive: state.isActive,
        });
      },
      onError: setError,
      onCallEnded: () => {
        setShowCallModal(false);
        setSelectedMode(null);
        onCallEnded?.();
      },
      onReady: () => {
        setIsDeviceReady(true);
        console.log("🎉 Voice service ready for calls!");
      },
    });

    return unsubscribe;
  }, [onCallEnded]);

  // Log when device ready state changes
  useEffect(() => {
    console.log(
      "🔘 Button state - Device ready:",
      isDeviceReady,
      "Call active:",
      callState.isActive
    );
  }, [isDeviceReady, callState.isActive]);

  const fetchLeadContext = async (mode: CallMode) => {
    try {
      setIsLoading(true);

      // Fetch previous messages and call history
      const [messagesRes, callsRes] = await Promise.all([
        fetch(`/api/messages/${leadId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }),
        fetch(`/api/calls/lead/${leadId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }),
      ]);

      const messages = messagesRes.ok ? await messagesRes.json() : [];
      const calls = callsRes.ok ? await callsRes.json() : [];

      // Generate AI insights for the lead
      const contextRes = await fetch("/api/leads/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          leadId,
          mode,
          messages,
          calls,
        }),
      });

      const context = contextRes.ok
        ? await contextRes.json()
        : {
            followUps: [],
            talkingPoints: [],
            valueProps: [],
            lastContact: null,
            sentiment: "neutral",
          };

      setLeadContext({
        ...context,
        previousMessages: messages,
        callHistory: calls,
        leadData,
      });
    } catch (error) {
      console.error("Failed to fetch lead context:", error);
      setError("Failed to load lead context");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallModeSelect = async (mode: CallMode) => {
    if (callState.isActive) {
      setError("Another call is already in progress");
      return;
    }

    setSelectedMode(mode);
    setError(null);

    // Fetch context before showing modal
    await fetchLeadContext(mode);
    setShowContextModal(true);
  };

  const handleStartCall = async () => {
    if (!selectedMode || !leadContext) return;

    try {
      setIsLoading(true);
      setError(null);
      setShowContextModal(false);

      if (selectedMode === "ai") {
        // For AI calls, make direct API call (no WebRTC)
        const response = await fetch("/api/voice/initiate-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ leadId }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to start AI call");
        }

        console.log("✅ AI call initiated:", result);
        onCallStarted?.(selectedMode);

        // Show success message instead of call modal for AI calls
        setError(null);
        // Could show a toast notification here instead
      } else {
        // For manual calls, first create call record, then use WebRTC
        console.log("📞 Creating call record for manual call...");

        const response = await fetch("/api/voice/initiate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ leadId }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to create call record");
        }

        console.log("✅ Call record created:", result);

        // Now proceed with WebRTC call
        const callOptions: CallOptions = {
          leadId,
          mode: selectedMode,
          leadData: {
            name:
              `${leadData.first_name || ""} ${
                leadData.last_name || ""
              }`.trim() || leadData.name,
            phone: leadData.phone,
            email: leadData.email,
            previousMessages: leadContext.previousMessages,
            talkingPoints: leadContext.talkingPoints,
            followUps: leadContext.followUps,
          },
        };

        await webrtcVoiceService.makeCall(callOptions);
        setShowCallModal(true);
        onCallStarted?.(selectedMode);
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      setError(error instanceof Error ? error.message : "Failed to start call");
    } finally {
      setIsLoading(false);
    }
  };

  const isCallActive = callState.isActive || callState.isConnecting;
  const deviceError = webrtcVoiceService.getError();

  const handleRetryInitialization = async () => {
    setError(null);
    await webrtcVoiceService.retryInitialization();
  };

  return (
    <>
      <div className={`flex ${className || "gap-2"}`}>
        {/* AI Call Button */}
        <button
          onClick={() => handleCallModeSelect("ai")}
          disabled={isLoading || isCallActive || !isDeviceReady}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm
            ${
              isCallActive || !isDeviceReady
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md"
            }
          `}
          title={
            !isDeviceReady ? "Voice service initializing..." : "Start AI call"
          }
        >
          {isLoading && selectedMode === "ai" ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
          AI Call
        </button>

        {/* Manual Call Button */}
        <button
          onClick={() => handleCallModeSelect("manual")}
          disabled={isLoading || isCallActive || !isDeviceReady}
          className={`
            flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm
            ${
              isCallActive || !isDeviceReady
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white hover:shadow-md"
            }
          `}
          title={
            !isDeviceReady
              ? "Voice service initializing..."
              : "Start manual call"
          }
        >
          {isLoading && selectedMode === "manual" ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <PhoneCall className="h-4 w-4" />
          )}
          Manual Call
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Device Status */}
      {!isDeviceReady && !deviceError && (
        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-700 text-sm">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Initializing voice service...</span>
        </div>
      )}

      {/* Device Error with Retry */}
      {deviceError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{deviceError}</span>
          <button
            onClick={handleRetryInitialization}
            className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Call Context Modal */}
      {showContextModal && leadContext && selectedMode && (
        <CallContextModal
          isOpen={showContextModal}
          onClose={() => {
            setShowContextModal(false);
            setSelectedMode(null);
          }}
          onConfirm={handleStartCall}
          leadContext={leadContext}
          callMode={selectedMode}
          isLoading={isLoading}
        />
      )}

      {/* Active Call Modal */}
      {showCallModal && (
        <VoiceCallModal
          isOpen={showCallModal}
          onClose={() => setShowCallModal(false)}
          leadName={
            `${leadData.first_name || ""} ${leadData.last_name || ""}`.trim() ||
            leadData.name
          }
          leadPhone={leadData.phone}
          callMode={selectedMode || "manual"}
          leadId={leadId}
        />
      )}
    </>
  );
};
