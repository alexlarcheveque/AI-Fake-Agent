import { Device, Call } from "@twilio/voice-sdk";

export type CallMode = "ai" | "manual";

export interface CallOptions {
  leadId: number;
  mode: CallMode;
  leadData?: {
    name: string;
    phone: string;
    email?: string;
    previousMessages?: any[];
    talkingPoints?: string[];
    followUps?: string[];
  };
}

export interface CallState {
  isActive: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isMuted: boolean;
  duration: number;
  mode: CallMode;
  leadId?: number;
  callSid?: string;
  error?: string;
  isReady: boolean;
}

interface CallEventSubscriber {
  onStateChange?: (state: CallState) => void;
  onError?: (error: string) => void;
  onCallEnded?: () => void;
  onReady?: () => void;
}

class WebRTCVoiceService {
  private device: Device | null = null;
  private currentCall: Call | null = null;
  private subscribers: CallEventSubscriber[] = [];
  private callState: CallState = {
    isActive: false,
    isConnecting: false,
    isConnected: false,
    isMuted: false,
    duration: 0,
    mode: "manual",
    isReady: false,
  };
  private durationTimer: NodeJS.Timeout | null = null;
  private openaiWebSocket: WebSocket | null = null;

  constructor() {
    console.log("🏗️ WebRTC Voice Service instance created");
    this.initializeDevice();
  }

  private async initializeDevice() {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Initializing Twilio Device (attempt ${attempt}/${maxRetries})...`
        );
        console.log(
          `📍 Making request to: ${window.location.origin}/api/voice/token`
        );

        // Get access token from backend
        const response = await fetch("/api/voice/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log(
          `📡 Response status: ${response.status} ${response.statusText}`
        );

        if (!response.ok) {
          const responseText = await response.text();
          console.error(`❌ Token response error: ${responseText}`);
          throw new Error(
            `Failed to get access token: ${response.status} ${response.statusText}`
          );
        }

        const responseData = await response.json();
        console.log(
          "🔑 Access token received, length:",
          responseData.token?.length
        );

        // Initialize Twilio Device with proper configuration
        console.log("🔧 Creating Twilio Device with optimized settings...");
        this.device = new Device(responseData.token, {
          // Use ashburn edge for best connectivity from US
          edge: "ashburn",
          // Set bandwidth for better quality
          maxAverageBitrate: 40000,
        });

        console.log("📋 Setting up device event listeners...");
        // Set up device event listeners
        this.device.on("ready", () => {
          console.log("🔗 Twilio Device ready for calls");
          this.updateCallState({ isReady: true, error: undefined });
          // Notify subscribers that device is ready
          this.subscribers.forEach((sub) => sub.onReady?.());
        });

        this.device.on("error", (error) => {
          console.error("❌ Twilio Device error:", error);
          console.error("❌ Error details:", {
            code: error.code,
            message: error.message,
            stack: error.stack,
            causes: error.causes,
          });

          let userFriendlyMessage = "Device connection error";

          // Provide specific error messages for common issues
          if (error.code === 31005) {
            userFriendlyMessage =
              "Network connection issue. Please check your internet connection and try again.";
          } else if (error.code === 31003) {
            userFriendlyMessage =
              "Connection timeout. Please check your network and try again.";
          } else if (error.code === 31001) {
            userFriendlyMessage =
              "Service configuration error. Please contact support.";
          }

          this.updateCallState({
            error: userFriendlyMessage,
            isReady: false,
          });

          // Notify subscribers of the error
          this.subscribers.forEach((sub) => sub.onError?.(userFriendlyMessage));
        });

        this.device.on("incoming", (call) => {
          console.log("📞 Incoming call received");
          // For now, we'll reject incoming calls since this is for outbound only
          call.reject();
        });

        this.device.on("offline", () => {
          console.log("📵 Device went offline");
          this.updateCallState({ isReady: false });
        });

        this.device.on("registered", () => {
          console.log("📱 Device registered successfully");
        });

        this.device.on("unregistered", () => {
          console.log("📱 Device unregistered");
          this.updateCallState({ isReady: false });
        });

        // Register the device
        console.log("📞 Registering Twilio Device...");
        await this.device.register();
        console.log("✅ Twilio Device registration complete");

        // Set ready state immediately after successful registration
        console.log("🎯 Setting device as ready");
        this.updateCallState({ isReady: true, error: undefined });
        // Notify subscribers that device is ready
        this.subscribers.forEach((sub) => sub.onReady?.());

        // If we get here, initialization was successful
        return;
      } catch (error) {
        console.error(
          `❌ Failed to initialize Twilio Device (attempt ${attempt}/${maxRetries}):`,
          error
        );
        console.error("📝 Error details:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        if (attempt === maxRetries) {
          // Final attempt failed
          let finalErrorMessage =
            "Failed to initialize calling service. Please refresh the page.";

          // Check for specific network issues
          if (error instanceof Error && error.message.includes("fetch")) {
            finalErrorMessage =
              "Cannot connect to calling service. Please check your internet connection.";
          }

          this.updateCallState({
            error: finalErrorMessage,
            isReady: false,
          });
          return;
        }

        // Wait before retrying
        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  async makeCall(options: CallOptions): Promise<void> {
    try {
      if (!this.device) {
        throw new Error("Device not initialized");
      }

      if (this.callState.isActive) {
        throw new Error("Call already in progress");
      }

      const leadPhone = options.leadData?.phone;
      if (!leadPhone) {
        throw new Error("Lead phone number is required");
      }

      console.log(
        `📞 Starting ${options.mode} call to lead ${options.leadId} at ${leadPhone}`
      );

      this.updateCallState({
        isConnecting: true,
        mode: options.mode,
        leadId: options.leadId,
        error: undefined,
      });

      // Make the call TO the lead's phone number
      // Use params to pass the phone number and other data
      this.currentCall = await this.device.connect({
        params: {
          To: leadPhone,
          leadId: options.leadId.toString(),
          mode: options.mode,
          leadName: options.leadData?.name || "",
        },
      });

      console.log(`📱 Call initiated to ${leadPhone}`);

      // Set up call event listeners
      this.setupCallEventListeners();

      // For AI calls, set up OpenAI Realtime connection
      if (options.mode === "ai") {
        await this.setupAICallHandling(options);
      }
    } catch (error) {
      console.error("❌ Failed to make call:", error);
      this.updateCallState({
        isConnecting: false,
        error: error instanceof Error ? error.message : "Failed to make call",
      });
      throw error;
    }
  }

  private setupCallEventListeners() {
    if (!this.currentCall) return;

    this.currentCall.on("accept", () => {
      console.log("✅ Call accepted");
      this.updateCallState({
        isConnecting: false,
        isConnected: true,
        isActive: true,
      });
      this.startDurationTimer();
    });

    this.currentCall.on("disconnect", () => {
      console.log("📴 Call ended");
      this.handleCallEnd();
    });

    this.currentCall.on("cancel", () => {
      console.log("❌ Call cancelled");
      this.handleCallEnd();
    });

    this.currentCall.on("reject", () => {
      console.log("❌ Call rejected");
      this.handleCallEnd();
    });

    this.currentCall.on("error", (error) => {
      console.error("❌ Call error:", error);
      this.updateCallState({ error: error.message });
    });
  }

  private async setupAICallHandling(options: CallOptions) {
    try {
      // Connect to OpenAI Realtime API through our backend
      const wsUrl = `${
        window.location.protocol === "https:" ? "wss:" : "ws:"
      }//${window.location.host}/api/voice/ai-realtime`;
      this.openaiWebSocket = new WebSocket(wsUrl);

      this.openaiWebSocket.onopen = () => {
        console.log("🤖 Connected to AI service");

        // Send initialization data
        if (this.openaiWebSocket) {
          this.openaiWebSocket.send(
            JSON.stringify({
              type: "init",
              callSid: this.currentCall?.parameters.CallSid,
              leadData: options.leadData,
            })
          );
        }
      };

      this.openaiWebSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("🤖 AI message:", data);

        // Handle AI events (transcripts, status updates, etc.)
        if (data.type === "transcript") {
          // Could emit transcript events for real-time display
        }
      };

      this.openaiWebSocket.onclose = () => {
        console.log("🤖 AI service disconnected");
      };

      this.openaiWebSocket.onerror = (error) => {
        console.error("❌ AI service error:", error);
      };
    } catch (error) {
      console.error("❌ Failed to setup AI handling:", error);
    }
  }

  endCall(): void {
    if (this.currentCall) {
      console.log("📴 Ending call");
      this.currentCall.disconnect();
    }
  }

  toggleMute(): boolean {
    if (this.currentCall) {
      const newMuteState = !this.callState.isMuted;
      this.currentCall.mute(newMuteState);
      this.updateCallState({ isMuted: newMuteState });
      console.log(`🔇 Call ${newMuteState ? "muted" : "unmuted"}`);
      return newMuteState;
    }
    return false;
  }

  private handleCallEnd() {
    this.stopDurationTimer();

    // Close AI connection if active
    if (this.openaiWebSocket) {
      this.openaiWebSocket.close();
      this.openaiWebSocket = null;
    }

    this.updateCallState({
      isActive: false,
      isConnecting: false,
      isConnected: false,
      duration: 0,
    });

    this.currentCall = null;

    // Notify subscribers
    this.subscribers.forEach((sub) => sub.onCallEnded?.());
  }

  private startDurationTimer() {
    this.stopDurationTimer();
    const startTime = Date.now();

    this.durationTimer = setInterval(() => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      this.updateCallState({ duration });
    }, 1000);
  }

  private stopDurationTimer() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private updateCallState(updates: Partial<CallState>) {
    this.callState = { ...this.callState, ...updates };
    this.subscribers.forEach((sub) => sub.onStateChange?.(this.callState));
  }

  subscribe(subscriber: CallEventSubscriber): () => void {
    this.subscribers.push(subscriber);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(subscriber);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  getCallState(): CallState {
    return { ...this.callState };
  }

  // Check if device is ready for calls
  isReady(): boolean {
    return this.callState.isReady;
  }

  // Get current error state
  getError(): string | undefined {
    return this.callState.error;
  }

  // Manual retry initialization
  async retryInitialization(): Promise<void> {
    console.log("🔄 Manual retry requested...");
    this.updateCallState({ error: undefined, isReady: false });
    await this.initializeDevice();
  }
}

// Export singleton instance
export const webrtcVoiceService = new WebRTCVoiceService();
