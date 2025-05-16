import React, { useState } from "react";
import { format } from "date-fns";
import appointmentApi from "../api/appointmentApi";
import { useNotifications } from "../contexts/NotificationContext";
import { AppointmentInsert } from "../../../../backend/models/Appointment";
import AppointmentsList from "./AppointmentsList";

interface AppointmentModalProps {
  lead_id: number;
  messageText?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (calendlyLink: string | null) => void;
  onError?: (error: string) => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  lead_id,
  isOpen,
  onClose,
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

      const appointmentData: AppointmentInsert = {
        lead_id,
        title,
        start_time_at: startDate.toISOString(),
        end_time_at: endDate.toISOString(),
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
      onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-3xl sm:w-full">
          <div className="relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-500 focus:outline-none"
              aria-label="Close"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Upcoming Appointments
                </h3>
                <AppointmentsList lead_id={lead_id} />
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Create Appointment
                  </h3>

                  {error && (
                    <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="date"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="date"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="time"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          id="time"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="location"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Location
                      </label>
                      <input
                        type="text"
                        id="location"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Property address or virtual meeting link"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Description
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Any additional details for the appointment"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                      >
                        {loading ? "Creating..." : "Schedule Appointment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
