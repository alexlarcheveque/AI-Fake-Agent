import React, { useState } from "react";
import { format } from "date-fns";
import appointmentApi, {
  CreateAppointmentRequest,
} from "../api/appointmentApi";
import { useNotifications } from "../contexts/NotificationContext";

interface AppointmentCreatorProps {
  lead_id: number;
  messageText?: string;
  onSuccess?: (calendlyLink: string | null) => void;
  onError?: (error: string) => void;
}

const AppointmentCreator: React.FC<AppointmentCreatorProps> = ({
  lead_id,
  messageText,
  onSuccess,
  onError,
}) => {
  const [title, setTitle] = useState("Property Showing");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { createNotification } = useNotifications();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!title || !date || !time) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      // Parse date and time
      const dateTime = parseDateTime(date, time);
      if (!dateTime.valid || !dateTime.date) {
        setError(dateTime.error || "Invalid date/time format");
        setLoading(false);
        return;
      }

      const startDate = dateTime.date;
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      const appointmentData: CreateAppointmentRequest = {
        lead_id,
        title,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        location,
        description,
      };

      const result = await appointmentApi.createAppointment(appointmentData);

      // Add notification for the new appointment
      await createNotification({
        type: "appointment",
        title: "New Appointment Created",
        message: `${title} on ${format(startDate, "MMMM d")} at ${format(
          startDate,
          "h:mm a"
        )}`,
        data: {
          ...result,
          lead_id,
        },
      });

      if (onSuccess) {
        onSuccess(null);
      }

      // Reset form
      setTitle("Property Showing");
      setDate("");
      setTime("");
      setLocation("");
      setDescription("");
      setShowForm(false);
    } catch (err: any) {
      console.error("Error creating appointment:", err);
      setError("Failed to create appointment. Please try again.");
      if (onError) onError("Failed to create appointment.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse date and time with error handling
  const parseDateTime = (
    dateStr: string,
    timeStr: string
  ): { valid: boolean; date?: Date; error?: string } => {
    try {
      const dateTimeStr = `${dateStr}T${timeStr}`;
      const date = new Date(dateTimeStr);

      if (isNaN(date.getTime())) {
        return { valid: false, error: "Invalid date or time format" };
      }

      return { valid: true, date };
    } catch (error) {
      console.error("Error parsing date/time:", error);
      return { valid: false, error: "Could not parse date or time" };
    }
  };

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
        </div>
      ) : (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Create Appointment
            </h3>

            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
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

              <div className="border border-gray-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-gray-800 mb-2">
                  Appointment Details
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="date"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="date"
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="time"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        id="time"
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium text-gray-700"
                    >
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
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
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
                  {loading ? "Creating..." : "Schedule Appointment"}
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
