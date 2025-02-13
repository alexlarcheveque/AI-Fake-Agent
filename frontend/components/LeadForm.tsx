import { useState } from "react";
import leadApi, { Lead } from "../src/api/leadApi";
import React from "react";

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  submit?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface ApiError {
  error: string;
  details?: ValidationError[];
}

interface LeadFormProps {
  onLeadCreated?: (newLead: Lead) => void;
}

const LeadForm: React.FC<LeadFormProps> = ({ onLeadCreated }) => {
  const [lead, setLead] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    status: "new",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!lead.name.trim()) {
      newErrors.name = "Name is required";
    } else if (lead.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!lead.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(lead.email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Phone validation
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!lead.phoneNumber) {
      newErrors.phone = "Phone is required";
    } else if (!phoneRegex.test(lead.phoneNumber)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const newLead = await leadApi.createLead(lead);
      setLead({ name: "", email: "", phoneNumber: "", status: "new" });
      setErrors({});
      onLeadCreated?.(newLead);
    } catch (error) {
      if ((error as ApiError).details) {
        const apiError = error as ApiError;
        const newErrors: FormErrors = {};
        apiError.details?.forEach((err) => {
          newErrors[err.field as keyof FormErrors] = err.message;
        });
        setErrors(newErrors);
      } else {
        setErrors({ submit: "Failed to create lead" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          placeholder="Name"
          value={lead.name}
          onChange={(e) => setLead({ ...lead, name: e.target.value })}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
          required
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
      </div>

      <div>
        <input
          type="email"
          placeholder="Email"
          value={lead.email}
          onChange={(e) => setLead({ ...lead, email: e.target.value })}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? "border-red-500" : "border-gray-300"
          }`}
          required
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      <div>
        <input
          type="tel"
          placeholder="Phone"
          value={lead.phoneNumber}
          onChange={(e) => setLead({ ...lead, phoneNumber: e.target.value })}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.phone ? "border-red-500" : "border-gray-300"
          }`}
          required
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full bg-blue-500 text-white py-2 px-4 rounded-md transition-colors ${
          isSubmitting ? "bg-blue-300 cursor-not-allowed" : "hover:bg-blue-600"
        }`}
      >
        {isSubmitting ? "Adding Lead..." : "Add Lead"}
      </button>
    </form>
  );
};

export default LeadForm;
