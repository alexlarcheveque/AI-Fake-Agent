import React, { useState, useEffect } from 'react';
import { format, addHours, parse } from 'date-fns';
import appointmentApi, { EventType, ApiError, CreateAppointmentRequest } from '../api/appointmentApi';

interface AppointmentCreatorProps {
  leadId: number;
  messageText?: string;
  onSuccess?: (appointmentLink: string | null) => void;
  onError?: (error: string | any) => void;
}

const AppointmentCreator: React.FC<AppointmentCreatorProps> = ({
  leadId,
  messageText,
  onSuccess,
  onError
}) => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [title, setTitle] = useState('Property Showing');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [useCalendlyDirectly, setUseCalendlyDirectly] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [detectedAppointment, setDetectedAppointment] = useState<boolean>(false);
  const [eventTypesAttempted, setEventTypesAttempted] = useState(false);

  // Method to directly create a Calendly link without showing the form
  const createCalendlyLinkDirectly = async () => {
    if (eventTypes.length === 0 || !selectedEventType) {
      setError('No Calendly event types available. Please check your Calendly configuration.');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await appointmentApi.createCalendlySchedulingLink({
        eventTypeUuid: selectedEventType,
        clientName: name || 'Client',
        clientEmail: email || `${leadId}@example.com`,
        leadId
      });
      
      if (onSuccess && result.schedulingUrl) {
        onSuccess(result.schedulingUrl);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error creating Calendly link directly:', err);
      
      // Handle the ApiError structure
      if (err && typeof err === 'object' && 'code' in err) {
        const apiError = err as ApiError;
        
        if (apiError.isAuthError) {
          setAuthError(true);
          setError('Authentication error. Please log in again.');
        } else if (apiError.isCalendlyError) {
          setError('Calendly service unavailable. Please try manual scheduling instead.');
          setShowForm(true);
          setUseCalendlyDirectly(false);
        } else {
          setError(apiError.message || 'Failed to create Calendly link.');
        }
        
        if (onError) onError(err);
      } else {
        setError('Failed to create Calendly link. Please try again.');
        if (onError) onError('Failed to create Calendly link.');
      }
      
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch Calendly event types
    const fetchEventTypes = async () => {
      try {
        setEventTypesAttempted(true);
        const types = await appointmentApi.getEventTypes();
        setEventTypes(types);
        if (types.length > 0) {
          // Get the event type ID from the URI
          const uriParts = types[0].uri.split('/');
          setSelectedEventType(uriParts[uriParts.length - 1]);
        }
      } catch (err: any) {
        console.error('Error fetching event types:', err);
        
        // Handle the ApiError structure
        if (err && typeof err === 'object' && 'code' in err) {
          const apiError = err as ApiError;
          
          if (apiError.isAuthError) {
            setAuthError(true);
            setError('Authentication error. Please log in again.');
          } else if (apiError.isCalendlyError || apiError.code === 503) {
            setError('Calendly service unavailable. Switching to manual appointment scheduling.');
            // Automatically switch to manual scheduling when Calendly is unavailable
            setUseCalendlyDirectly(false);
          } else {
            setError(apiError.message || 'Failed to load calendar event types.');
          }
          
          if (onError) onError(err);
        } else {
          setError('Failed to load calendar event types.');
          if (onError) onError('Failed to load calendar event types.');
        }
      }
    };

    fetchEventTypes();
  }, [onError]);

  useEffect(() => {
    // Check for direct commands to use Calendly in message
    if (messageText) {
      // Check if the message contains a request to create a Calendly link
      const isCalendlyRequest = messageText.toLowerCase().includes('create a calendly') || 
                               messageText.toLowerCase().includes('create calendly link') ||
                               messageText.toLowerCase().includes('use calendly') ||
                               messageText.toLowerCase().includes('send calendly');
      
      if (isCalendlyRequest && eventTypes.length > 0) {
        // If there's a direct request for Calendly and we have event types, create a link directly
        createCalendlyLinkDirectly();
        return;
      }

      // Standard appointment detection
      const appointmentDetails = appointmentApi.parseAppointmentFromAIMessage(messageText);
      if (appointmentDetails) {
        setShowForm(true);
        setDetectedAppointment(true);
        
        // If we have a date/time from the AI message, select manual entry method
        setUseCalendlyDirectly(false);
        
        // Set date
        let parsedDate;
        try {
          // Try MM/DD/YYYY format
          parsedDate = parse(appointmentDetails.date, 'MM/dd/yyyy', new Date());
        } catch (e) {
          try {
            // Try YYYY-MM-DD format
            parsedDate = parse(appointmentDetails.date, 'yyyy-MM-dd', new Date());
          } catch (e2) {
            console.error('Could not parse date:', appointmentDetails.date);
          }
        }

        if (parsedDate && !isNaN(parsedDate.getTime())) {
          setDate(format(parsedDate, 'yyyy-MM-dd'));
        }
        
        // Set time
        let timeStr = appointmentDetails.time.trim();
        // Ensure time has AM/PM if not in 24-hour format
        if (!timeStr.includes('AM') && !timeStr.includes('PM') && !timeStr.includes('am') && !timeStr.includes('pm')) {
          const hourPart = parseInt(timeStr.split(':')[0]);
          if (hourPart < 12) {
            timeStr += ' PM'; // Default to PM for business hours
          } else {
            timeStr += ' AM'; // Use AM for 24-hour format
          }
        }

        let parsedTime;
        try {
          // Try h:mm a format (like "3:30 PM")
          parsedTime = parse(timeStr, 'h:mm a', new Date());
        } catch (e) {
          try {
            // Try HH:mm format (24-hour)
            parsedTime = parse(timeStr, 'HH:mm', new Date());
          } catch (e2) {
            console.error('Could not parse time:', timeStr);
          }
        }

        if (parsedTime && !isNaN(parsedTime.getTime())) {
          setTime(format(parsedTime, 'HH:mm'));
        }
      }
    }
  }, [messageText, eventTypes]);

  // Immediately after the form is shown, if we have no event types and have attempted to load them, 
  // automatically switch to manual scheduling to prevent errors
  useEffect(() => {
    if (showForm && eventTypesAttempted && eventTypes.length === 0) {
      setUseCalendlyDirectly(false);
      setError('Calendly integration not available. Using manual scheduling instead.');
    }
  }, [showForm, eventTypesAttempted, eventTypes.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate form fields that should always be filled
    if (!title) {
      setError('Please enter a title for the appointment');
      setLoading(false);
      return;
    }

    // Only validate date and time if we're not using Calendly directly
    if (!useCalendlyDirectly && (!date || !time)) {
      setError('Date and time are required for manual appointment creation');
      setLoading(false);
      return;
    }

    // Additional validation for Calendly
    if (useCalendlyDirectly) {
      if (!selectedEventType) {
        setError('Please select an event type');
        setLoading(false);
        return;
      }
    }

    try {
      let result;
      
      if (useCalendlyDirectly) {
        // Create a direct Calendly scheduling link
        result = await appointmentApi.createCalendlySchedulingLink({
          eventTypeUuid: selectedEventType,
          clientName: name || 'Client',
          clientEmail: email || `${leadId}@example.com`,
          leadId
        });
        
        if (onSuccess && result.schedulingUrl) {
          onSuccess(result.schedulingUrl);
        }
      } else {
        // Manual appointment creation
        // Parse date and time
        const dateTime = parseDateTime(date, time);
        if (!dateTime.valid || !dateTime.date) {
          setError(dateTime.error || 'Invalid date/time format');
          setLoading(false);
          return;
        }
        
        const startDate = dateTime.date;
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        
        const appointmentData: CreateAppointmentRequest = {
          leadId,
          title,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          location,
          description,
          eventTypeUuid: selectedEventType
        };
        
        result = await appointmentApi.createAppointment(appointmentData);
        
        if (onSuccess) {
          onSuccess(result.calendlyLink);
        }
      }
      
      // Reset form
      setTitle('Property Showing');
      setDate('');
      setTime('');
      setLocation('');
      setDescription('');
      setEmail('');
      setName('');
      setShowForm(false);
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      
      // Handle the ApiError structure
      if (err && typeof err === 'object' && 'code' in err) {
        const apiError = err as ApiError;
        
        if (apiError.isAuthError) {
          setAuthError(true);
          setError('Authentication error. Please log in again.');
        } else if (apiError.isCalendlyError) {
          setError('Calendly service unavailable. Please try manual scheduling instead.');
          // Switch to manual scheduling as fallback
          setUseCalendlyDirectly(false);
        } else {
          setError(apiError.message || 'Failed to create appointment.');
        }
        
        if (onError) onError(err);
      } else {
        setError('Failed to create appointment. Please try again.');
        if (onError) onError('Failed to create appointment.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Add Calendly troubleshooting information display
  const renderCalendlyStatusInfo = () => {
    if (!eventTypesAttempted) return null;
    
    if (eventTypes.length === 0) {
      return (
        <div className="mt-2 p-3 bg-orange-50 border border-orange-100 rounded-md">
          <div className="flex">
            <svg className="h-5 w-5 text-orange-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-orange-800">
                Calendly Service Unavailable
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Manual scheduling is enabled as a fallback. Direct Calendly scheduling will be available once the service is configured.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Helper to parse date and time with error handling
  const parseDateTime = (dateStr: string, timeStr: string): { valid: boolean; date?: Date; error?: string } => {
    try {
      // Check for different date formats (MM/DD/YYYY or YYYY-MM-DD)
      let formattedDate = dateStr;
      if (dateStr.includes('/')) {
        // Convert MM/DD/YYYY to YYYY-MM-DD
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const month = parts[0].padStart(2, '0');
          const day = parts[1].padStart(2, '0');
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          formattedDate = `${year}-${month}-${day}`;
        }
      }
      
      // Ensure time includes AM/PM if not in 24-hour format
      let formattedTime = timeStr;
      if (!timeStr.toLowerCase().includes('am') && !timeStr.toLowerCase().includes('pm') && !timeStr.includes(':')) {
        // Assume 24-hour format if no AM/PM and has colon
        formattedTime = `${timeStr}:00`;
      }
      
      // Try to parse combined date/time
      const dateTimeStr = `${formattedDate}T${formattedTime}`;
      const date = new Date(dateTimeStr);
      
      if (isNaN(date.getTime())) {
        return { valid: false, error: 'Invalid date or time format' };
      }
      
      return { valid: true, date };
    } catch (error) {
      console.error('Error parsing date/time:', error);
      return { valid: false, error: 'Could not parse date or time' };
    }
  };

  if (authError) {
    return (
      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
        <h3 className="text-orange-700 font-medium">Authentication Required</h3>
        <p className="text-sm text-orange-600 mt-1">
          You need to be authenticated to use the calendar features. Please log in again.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {!showForm ? (
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Schedule Appointment
          </button>
          {eventTypes.length > 0 && (
            <button
              onClick={createCalendlyLinkDirectly}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
            >
              {loading ? 'Creating...' : 'Create Calendly Link'} 
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Create Appointment</h3>
            
            {detectedAppointment && (
              <div className="mt-2 mb-4 p-3 bg-green-50 border border-green-100 rounded-md">
                <div className="flex">
                  <svg className="h-5 w-5 text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Appointment details detected
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Date and time have been pre-filled based on the conversation. You can modify if needed.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-2 text-sm text-red-600">
                {error}
              </div>
            )}
            
            {renderCalendlyStatusInfo()}
            
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Scheduling Method:</div>
                <div className="flex flex-col space-y-3">
                  <label className={`flex items-start p-2 rounded ${eventTypes.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'}`}>
                    <input
                      type="radio"
                      className="form-radio mt-1"
                      name="schedulingMethod"
                      checked={useCalendlyDirectly}
                      onChange={() => eventTypes.length > 0 && setUseCalendlyDirectly(true)}
                      disabled={eventTypes.length === 0}
                    />
                    <div className="ml-2">
                      <span className="text-sm font-medium text-gray-700">Calendly Scheduling (Recommended)</span>
                      <p className="text-xs text-gray-500 mt-1">
                        {eventTypes.length === 0 
                          ? 'Currently unavailable - Calendly service is not properly configured'
                          : 'Send your client a Calendly link where they can choose from your available time slots'}
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start p-2 rounded hover:bg-gray-100 cursor-pointer">
                    <input
                      type="radio"
                      className="form-radio mt-1"
                      name="schedulingMethod"
                      checked={!useCalendlyDirectly}
                      onChange={() => setUseCalendlyDirectly(false)}
                    />
                    <div className="ml-2">
                      <span className="text-sm font-medium text-gray-700">Manual Entry</span>
                      <p className="text-xs text-gray-500 mt-1">
                        Set a specific date and time for the appointment
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              {useCalendlyDirectly && (
                <div className="border border-blue-100 bg-blue-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Client Information (Optional)</h4>
                  <p className="text-xs text-blue-700 mb-3">
                    Pre-fill your client's information to make scheduling easier for them.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Client Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Client's full name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Client Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="client@example.com"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {!useCalendlyDirectly && (
                <div className="border border-gray-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Appointment Details</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="date"
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required={!useCalendlyDirectly}
                        />
                      </div>
                      <div>
                        <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                          Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          id="time"
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          required={!useCalendlyDirectly}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                        Location
                      </label>
                      <input
                        type="text"
                        id="location"
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Property address or virtual meeting link"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Any additional details for the appointment"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label htmlFor="eventType" className="block text-sm font-medium text-gray-700">
                  Calendly Event Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="eventType"
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  required
                  disabled={eventTypes.length === 0}
                >
                  {eventTypes.length === 0 && (
                    <option value="">Calendly service unavailable (Error 503)</option>
                  )}
                  {eventTypes.map((type) => {
                    // Extract UUID from the URI
                    const uriParts = type.uri.split('/');
                    const uuid = uriParts[uriParts.length - 1];
                    return (
                      <option key={uuid} value={uuid}>
                        {type.name} ({type.duration} min)
                      </option>
                    );
                  })}
                </select>
                {eventTypes.length === 0 && (
                  <p className="mt-1 text-xs text-orange-600">
                    The Calendly service is currently unavailable. Please use manual scheduling instead or contact your administrator.
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {loading ? 'Creating...' : useCalendlyDirectly ? 'Create Calendly Link' : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCreator; 