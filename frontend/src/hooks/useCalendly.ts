import { useState, useEffect, useCallback } from 'react';
import appointmentApi, { EventType } from '../api/appointmentApi';

/**
 * Hook to manage Calendly integration 
 * @param leadId - The ID of the lead
 * @returns Object with methods and state for Calendly integration
 */
export const useCalendly = (leadId: number) => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCalendlyAvailable, setIsCalendlyAvailable] = useState(false);

  // Load Calendly event types on mount
  useEffect(() => {
    const fetchEventTypes = async () => {
      try {
        setLoading(true);
        const types = await appointmentApi.getEventTypes();
        setEventTypes(types);
        
        if (types.length > 0) {
          // Get the event type ID from the URI
          const uriParts = types[0].uri.split('/');
          setSelectedEventType(uriParts[uriParts.length - 1]);
          setIsCalendlyAvailable(true);
        } else {
          setIsCalendlyAvailable(false);
        }
      } catch (err: any) {
        console.error('Error fetching Calendly event types:', err);
        setError('Calendly service unavailable');
        setIsCalendlyAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    fetchEventTypes();
  }, []);

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
   * Create a Calendly scheduling link
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
    if (!isCalendlyAvailable || !selectedEventType) {
      const errorMsg = 'Calendly service is not available';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await appointmentApi.createCalendlySchedulingLink({
        eventTypeUuid: selectedEventType,
        clientName: clientName || 'Client',
        clientEmail: clientEmail || `${leadId}@example.com`,
        leadId
      });
      
      if (result.schedulingUrl && onSuccess) {
        onSuccess(result.schedulingUrl);
      }
    } catch (err: any) {
      console.error('Error creating Calendly link:', err);
      setError(err.message || 'Failed to create Calendly link');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [leadId, selectedEventType, isCalendlyAvailable]);

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