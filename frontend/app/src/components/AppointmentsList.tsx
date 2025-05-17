import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import appointmentApi from "../api/appointmentApi";
import { AppointmentRow } from "../../../../backend/models/Appointment";

interface AppointmentsListProps {
  lead_id?: number;
}

const AppointmentsList: React.FC<AppointmentsListProps> = ({ lead_id }) => {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  console.log("appointments", appointments);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        let data: AppointmentRow[];

        if (lead_id) {
          data = await appointmentApi.getAppointmentsByLeadId(lead_id);
        } else {
          data = [];
        }

        // Sort appointments by start time (most recent first)
        data.sort((a, b) => {
          if (!a.start_time_at) return 1;
          if (!b.start_time_at) return -1;
          return (
            new Date(b.start_time_at).getTime() -
            new Date(a.start_time_at).getTime()
          );
        });

        setAppointments(data);
        setError(null);
        setAuthError(false);
      } catch (err: any) {
        console.error("Error fetching appointments:", err);

        if (err && typeof err === "object" && "code" in err) {
          if (err.code === 401) {
            setAuthError(true);
            setError("Authentication error. Please log in again.");
          } else {
            setError(err.message || "Failed to load appointments.");
          }
        } else {
          setError("Failed to load appointments. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [lead_id]);

  const handleCancelAppointment = async (id: number) => {
    try {
      await appointmentApi.deleteAppointment(id);
      setAppointments((prevAppointments) =>
        prevAppointments.filter((appointment) => appointment.id !== id)
      );
    } catch (err: any) {
      console.error("Error cancelling appointment:", err);

      if (err && typeof err === "object" && "code" in err) {
        if (err.code === 401) {
          setAuthError(true);
          setError("Authentication error. Please log in again.");
        } else {
          setError(err.message || "Failed to cancel appointment.");
        }
      } else {
        setError("Failed to cancel appointment. Please try again later.");
      }
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading appointments...</div>;
  }

  if (authError) {
    return (
      <div className="p-4 text-center text-orange-600">
        <p>{error}</p>
        <p className="mt-2 text-sm">
          Authentication is required to view appointments.
        </p>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (appointments.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No upcoming appointments.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
      <ul className="divide-y divide-gray-200">
        {(Array.isArray(appointments) ? appointments : []).map(
          (appointment) => (
            <li key={appointment.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-600">
                    {appointment.title}
                  </p>

                  {appointment.start_time_at && appointment.end_time_at ? (
                    <p className="text-sm text-gray-500">
                      {format(
                        parseISO(appointment.start_time_at),
                        "MMMM d, yyyy"
                      )}{" "}
                      at {format(parseISO(appointment.start_time_at), "h:mm a")}{" "}
                      - {format(parseISO(appointment.end_time_at), "h:mm a")}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Time to be scheduled
                    </p>
                  )}
                  {appointment.location && (
                    <p className="text-sm text-gray-500">
                      Location: {appointment.location}
                    </p>
                  )}
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        appointment.status === "scheduled"
                          ? "bg-green-100 text-green-800"
                          : appointment.status === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : appointment.status === "cancelled" ||
                            appointment.status === "canceled"
                          ? "bg-red-100 text-red-800"
                          : appointment.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {appointment.status
                        ? appointment.status.charAt(0).toUpperCase() +
                          appointment.status.slice(1)
                        : "Unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {(appointment.status === "scheduled" ||
                    appointment.status === "pending") && (
                    <button
                      onClick={() => handleCancelAppointment(appointment.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-red-600 text-xs font-medium rounded text-red-600 bg-white hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  );
};

export default AppointmentsList;
