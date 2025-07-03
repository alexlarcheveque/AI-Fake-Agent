import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Bot,
  User,
  MessageSquare,
} from "lucide-react";
import { webrtcVoiceService, CallMode } from "../services/webrtcVoiceService";

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  leadPhone: string;
  callMode: CallMode;
  leadId?: number;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  leadName,
  leadPhone,
  callMode,
  leadId = 0,
}) => {
  const [callState, setCallState] = useState(webrtcVoiceService.getCallState());

  const [transcript, setTranscript] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<string>("Initializing...");

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = webrtcVoiceService.subscribe({
      onStateChange: setCallState,
      onCallEnded: () => {
        onClose();
      },
    });

    return unsubscribe;
  }, [isOpen, onClose]);

  // Call is already initiated by VoiceCallButton, no need to start it here

  const handleEndCall = () => {
    webrtcVoiceService.endCall();
  };

  const handleToggleMute = () => {
    webrtcVoiceService.toggleMute();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCallStatusText = (): string => {
    if (callState.isConnecting) return "Connecting...";
    if (callState.isConnected) return "Connected";
    if (callState.error) return "Error";
    return "Idle";
  };

  const getCallStatusColor = (): string => {
    if (callState.isConnecting) return "text-yellow-600";
    if (callState.isConnected) return "text-green-600";
    if (callState.error) return "text-red-600";
    return "text-gray-600";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                callMode === "ai" ? "bg-blue-100" : "bg-green-100"
              }`}
            >
              {callMode === "ai" ? (
                <Bot className="h-5 w-5 text-blue-600" />
              ) : (
                <User className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {leadName}
              </h2>
              <p className="text-sm text-gray-500">{leadPhone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Call Status */}
        <div className="p-6 text-center">
          <div className={`text-lg font-medium mb-2 ${getCallStatusColor()}`}>
            {getCallStatusText()}
          </div>

          {callState.isConnected && (
            <div className="text-2xl font-mono text-gray-700 mb-4">
              {formatDuration(callState.duration)}
            </div>
          )}

          {/* Call Mode Indicator */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
              callMode === "ai"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {callMode === "ai" ? (
              <Bot className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
            {callMode === "ai" ? "AI Handling Call" : "Manual Call"}
          </div>

          {/* AI Status (only for AI calls) */}
          {callMode === "ai" && callState.isConnected && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Bot className="h-4 w-4" />
                <span>AI Status: {aiStatus}</span>
              </div>
            </div>
          )}

          {/* Manual Call Instructions */}
          {callMode === "manual" && callState.isConnected && (
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <MessageSquare className="h-4 w-4" />
                <span>You're speaking directly with {leadName}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {callState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{callState.error}</p>
            </div>
          )}

          {/* Transcript (for both modes when available) */}
          {transcript.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Live Transcript
              </h4>
              <div className="space-y-1">
                {transcript.map((line, index) => (
                  <p key={index} className="text-xs text-gray-600">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4 p-6 border-t border-gray-200">
          {/* Mute Button */}
          <button
            onClick={handleToggleMute}
            disabled={!callState.isConnected}
            className={`
               p-4 rounded-full transition-all duration-200
               ${
                 callState.isMuted
                   ? "bg-red-100 text-red-600 hover:bg-red-200"
                   : "bg-gray-100 text-gray-600 hover:bg-gray-200"
               }
               ${
                 !callState.isConnected
                   ? "opacity-50 cursor-not-allowed"
                   : "hover:scale-105"
               }
             `}
            title={callState.isMuted ? "Unmute" : "Mute"}
          >
            {callState.isMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            disabled={!callState.isActive && !callState.isConnecting}
            className={`
               p-4 rounded-full transition-all duration-200
               ${
                 callState.isActive || callState.isConnecting
                   ? "bg-red-500 text-white hover:bg-red-600 hover:scale-105"
                   : "bg-gray-300 text-gray-500 cursor-not-allowed"
               }
             `}
            title="End Call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>

        {/* Recording Notice */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>This call is being recorded and transcribed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCallModal;
