import { useState, useCallback } from 'react';

// Define a simple EventType interface to match what the components expect
interface EventType {
  uri: string;
  name: string;
  slug: string;
  active: boolean;
  scheduling_url: string;
  duration: number;
  description?: string;
}

/**
 * Hook to manage Calendly integration 
 * @param leadId - The ID of the lead
 * @returns Object with methods and state for Calendly integration
 */
export const useCalendly = (leadId: number) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calendly is not available - all methods return empty or disabled values
  const isCalendlyAvailable = false;
  const eventTypes: EventType[] = [];
  const selectedEventType = '';

  /**
   * Placeholder function that does nothing, as setSelectedEventType is not relevant
   * when Calendly is unavailable
   */
  const setSelectedEventType = () => {
    // No-op since Calendly is disabled
  };

  /**
   * Check if a message contains a request to use Calendly
   * @param message - The message text to check
   * @returns Boolean indicating if the message is a Calendly request
   */
  const isCalendlyRequest = useCallback((message: string): boolean => {
    const lowerCaseMessage = message.toLowerCase();
    return (
      lowerCaseMessage.includes('create a calendly') || 
      lowerCaseMessage.includes('create calendly link') ||
      lowerCaseMessage.includes('use calendly') ||
      lowerCaseMessage.includes('send calendly') ||
      lowerCaseMessage.includes('schedule with calendly') ||
      (lowerCaseMessage.includes('calendly') && 
        (lowerCaseMessage.includes('schedule') || 
         lowerCaseMessage.includes('appointment') || 
         lowerCaseMessage.includes('meeting')))
    );
  }, []);

  /**
   * Placeholder for creating a Calendly scheduling link - returns error since Calendly is unavailable
   * @param clientName - Optional client name
   * @param clientEmail - Optional client email
   * @param onSuccess - Optional callback on success
   * @param onError - Optional callback on error
   */
  const createCalendlyLink = useCallback(async (
    clientName?: string,
    clientEmail?: string,
    onSuccess?: (link: string) => void,
    onError?: (error: any) => void
  ) => {
    const errorMsg = 'Calendly integration is not currently available';
    setError(errorMsg);
    if (onError) onError({ message: errorMsg, code: 404 });
    return;
  }, []);

  return {
    eventTypes,
    selectedEventType,
    setSelectedEventType,
    loading,
    error,
    isCalendlyAvailable,
    isCalendlyRequest,
    createCalendlyLink
  };
};

export default useCalendly;