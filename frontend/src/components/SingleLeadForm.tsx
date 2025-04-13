import React, { useState, useEffect } from "react";
import leadApi from "../api/leadApi";
import { Lead, LeadStatus, LeadFormData, LeadType } from "../types/lead";
import { useNavigate } from "react-router-dom";

// Validation constants
const VALIDATION_RULES = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s-']+$/,
    PATTERN_MESSAGE:
      "Name can only contain letters, spaces, hyphens, and apostrophes",
  },
  EMAIL: {
    MAX_LENGTH: 100,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    MIN_DIGITS: 10,
    MAX_DIGITS: 15,
    PATTERN: /^\+?[\d\s-()]+$/,
    PATTERN_MESSAGE:
      "Phone number can only contain numbers, spaces, +, -, and parentheses",
  },
  STATUS: {
    VALID_VALUES: ["new", "contacted", "qualified", "lost"] as LeadStatus[],
  },
  LEAD_TYPE: {
    VALID_VALUES: ["buyer", "seller"] as LeadType[],
  }
} as const;

// First message timing options
const FIRST_MESSAGE_TIMING_OPTIONS = [
  { value: "immediate", label: "Immediately" },
  { value: "next_day", label: "Next day" },
  { value: "one_week", label: "One week" },
  { value: "two_weeks", label: "Two weeks" },
];

interface FormErrors {
  name?: ValidationError;
  email?: ValidationError;
  phone?: ValidationError;
  status?: ValidationError;
  leadType?: ValidationError;
  submit?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface LeadFormProps {
  onLeadCreated: (lead: Lead) => void;
}

interface FormData extends LeadFormData {
  messageTime: string;
  aiAssistantEnabled: boolean;
  enableFollowUps: boolean;
  firstMessageTiming: string;
  messageCount: number;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  phone: "",
  status: "new",
  aiAssistantEnabled: true,
  messageTime: "now",
  leadType: "buyer",
  enableFollowUps: false,
  firstMessageTiming: "immediate",
  messageCount: 0
};

// Validation functions
const validateName = (name: string): ValidationError | undefined => {
  if (!name.trim()) return { field: "name", message: "Name is required" };
  if (name.trim().length < VALIDATION_RULES.NAME.MIN_LENGTH) {
    return { field: "name", message: `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters` };
  }
  if (name.trim().length > VALIDATION_RULES.NAME.MAX_LENGTH) {
    return { field: "name", message: `Name must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters` };
  }
  if (!VALIDATION_RULES.NAME.PATTERN.test(name.trim())) {
    return { field: "name", message: VALIDATION_RULES.NAME.PATTERN_MESSAGE };
  }
};

const validateEmail = (email: string): ValidationError | undefined => {
  if (!email) return { field: "email", message: "Email is required" };
  if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
    return { field: "email", message: "Please enter a valid email address" };
  }
  if (email.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) {
    return { field: "email", message: `Email must be less than ${VALIDATION_RULES.EMAIL.MAX_LENGTH} characters` };
  }
};

const validatePhone = (phone: string): ValidationError | undefined => {
  if (!phone) return { field: "phone", message: "Phone number is required" };
  const cleanPhone = phone.replace(/\D/g, "");
  if (
    cleanPhone.length < VALIDATION_RULES.PHONE.MIN_DIGITS ||
    cleanPhone.length > VALIDATION_RULES.PHONE.MAX_DIGITS
  ) {
    return { field: "phone", message: `Phone number must be between ${VALIDATION_RULES.PHONE.MIN_DIGITS} and ${VALIDATION_RULES.PHONE.MAX_DIGITS} digits` };
  }
  if (!VALIDATION_RULES.PHONE.PATTERN.test(phone)) {
    return { field: "phone", message: VALIDATION_RULES.PHONE.PATTERN_MESSAGE };
  }
};

const validateStatus = (status: string): ValidationError | undefined => {
  if (!VALIDATION_RULES.STATUS.VALID_VALUES.includes(status as any)) {
    return { field: "status", message: "Invalid status selected" };
  }
};

const validateLeadType = (leadType: string): ValidationError | undefined => {
  if (!VALIDATION_RULES.LEAD_TYPE.VALID_VALUES.includes(leadType as LeadType)) {
    return { field: "leadType", message: "Lead type must be 'buyer' or 'seller'" };
  }
  return undefined;
};

const validateField = (name: keyof FormData, value: string): ValidationError | undefined => {
  switch (name) {
    case "name":
      return validateName(value);
    case "email":
      return validateEmail(value);
    case "phone":
      return validatePhone(value);
    case "status":
      return validateStatus(value);
    case "leadType":
      return validateLeadType(value);
    default:
      return undefined;
  }
};

const LeadForm: React.FC<LeadFormProps> = ({ onLeadCreated }) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    Object.keys(formData).forEach((key) => {
      if (key === "aiAssistantEnabled" || key === "enableFollowUps") return;
      const value = formData[key as keyof typeof formData];
      if (typeof value === "string") {
        const error = validateField(key as keyof FormData, value);
        if (error) {
          newErrors[key as keyof FormErrors] = error;
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Only validate if field has been touched
    if (touchedFields.has(name)) {
      const error = validateField(name as keyof FormData, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Mark field as touched
    setTouchedFields((prev) => new Set(prev).add(name));

    // Validate on blur
    const error = validateField(name as keyof FormData, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allFields = Object.keys(formData).filter(
      (key) => key !== "aiAssistantEnabled" && key !== "enableFollowUps"
    );
    setTouchedFields(new Set(allFields));

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const newLead = await leadApi.createLead(formData);
      onLeadCreated(newLead);
      setFormData(initialFormData);
      setErrors({});
      setTouchedFields(new Set());
    } catch (err: any) {
      if (err.response?.data?.details) {
        const apiErrors = err.response.data.details;
        const fieldErrors: FormErrors = {};
        apiErrors.forEach((error: ValidationError) => {
          fieldErrors[error.field as keyof FormErrors] = error;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({
          submit:
            err.response?.data?.error ||
            "An error occurred while creating the lead",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          {errors.submit}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? "border-red-500 ring-red-100" : "border-gray-300"
          }`}
          disabled={isLoading}
        />
        {errors.name && touchedFields.has("name") && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? "border-red-500 ring-red-100" : "border-gray-300"
          }`}
          disabled={isLoading}
        />
        {errors.email && touchedFields.has("email") && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          required
          value={formData.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.phone ? "border-red-500 ring-red-100" : "border-gray-300"
          }`}
          disabled={isLoading}
        />
        {errors.phone && touchedFields.has("phone") && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.status ? "border-red-500 ring-red-100" : "border-gray-300"
          }`}
          disabled={isLoading}
        >
          {VALIDATION_RULES.STATUS.VALID_VALUES.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
        {errors.status && touchedFields.has("status") && (
          <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="leadType"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Lead Type
        </label>
        <select
          id="leadType"
          name="leadType"
          value={formData.leadType}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.leadType ? "border-red-500 ring-red-100" : "border-gray-300"
          }`}
          disabled={isLoading}
        >
          {VALIDATION_RULES.LEAD_TYPE.VALID_VALUES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
        {errors.leadType && touchedFields.has("leadType") && (
          <p className="mt-1 text-sm text-red-600">{errors.leadType.message}</p>
        )}
      </div>

      {/* AI Assistant Toggle */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
            <p className="text-sm text-gray-500">
              Enable AI to automatically respond to lead messages
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                aiAssistantEnabled: !prev.aiAssistantEnabled,
              }))
            }
            className={`${
              formData.aiAssistantEnabled ? "bg-blue-600" : "bg-gray-200"
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            disabled={isLoading}
          >
            <span
              className={`${
                formData.aiAssistantEnabled ? "translate-x-5" : "translate-x-0"
              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
          </button>
        </div>
      </div>

      {/* Automated Follow-ups Toggle */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Automated Follow-ups
            </h3>
            <p className="text-sm text-gray-500">
              Enable AI to automatically follow up with leads who don't respond
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                enableFollowUps: !prev.enableFollowUps,
              }))
            }
            className={`${
              formData.enableFollowUps ? "bg-blue-600" : "bg-gray-200"
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            disabled={isLoading}
          >
            <span
              className={`${
                formData.enableFollowUps ? "translate-x-5" : "translate-x-0"
              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
          </button>
        </div>

        {/* First message timing options */}
        {formData.enableFollowUps && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              When to send first message
            </label>
            <select
              name="firstMessageTiming"
              value={formData.firstMessageTiming}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {FIRST_MESSAGE_TIMING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Choose when the first automated message should be sent
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isLoading ? "Creating..." : "Create Lead"}
        </button>
      </div>
    </form>
  );
};

export default LeadForm;
