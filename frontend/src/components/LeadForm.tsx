import React, { useState } from "react";
import leadApi from "../api/leadApi";
import { Lead } from "../types/lead";

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
    VALID_VALUES: ["new", "contacted", "qualified", "lost"] as const,
  },
} as const;

interface FormErrors {
  name?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
  submit?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface LeadFormProps {
  onLeadCreated: (lead: Lead) => void;
}

interface FormData {
  name: string;
  email: string;
  phoneNumber: string;
  status: string;
  aiAssistantEnabled: boolean;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  phoneNumber: "",
  status: "new",
  aiAssistantEnabled: true,
};

// Validation functions
const validateName = (name: string): string | undefined => {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < VALIDATION_RULES.NAME.MIN_LENGTH) {
    return `Name must be at least ${VALIDATION_RULES.NAME.MIN_LENGTH} characters`;
  }
  if (name.trim().length > VALIDATION_RULES.NAME.MAX_LENGTH) {
    return `Name must be less than ${VALIDATION_RULES.NAME.MAX_LENGTH} characters`;
  }
  if (!VALIDATION_RULES.NAME.PATTERN.test(name.trim())) {
    return VALIDATION_RULES.NAME.PATTERN_MESSAGE;
  }
};

const validateEmail = (email: string): string | undefined => {
  if (!email) return "Email is required";
  if (!VALIDATION_RULES.EMAIL.PATTERN.test(email)) {
    return "Please enter a valid email address";
  }
  if (email.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) {
    return `Email must be less than ${VALIDATION_RULES.EMAIL.MAX_LENGTH} characters`;
  }
};

const validatePhone = (phone: string): string | undefined => {
  if (!phone) return "Phone number is required";
  const cleanPhone = phone.replace(/\D/g, "");
  if (
    cleanPhone.length < VALIDATION_RULES.PHONE.MIN_DIGITS ||
    cleanPhone.length > VALIDATION_RULES.PHONE.MAX_DIGITS
  ) {
    return `Phone number must be between ${VALIDATION_RULES.PHONE.MIN_DIGITS} and ${VALIDATION_RULES.PHONE.MAX_DIGITS} digits`;
  }
  if (!VALIDATION_RULES.PHONE.PATTERN.test(phone)) {
    return VALIDATION_RULES.PHONE.PATTERN_MESSAGE;
  }
};

const validateStatus = (status: string): string | undefined => {
  if (!VALIDATION_RULES.STATUS.VALID_VALUES.includes(status as any)) {
    return "Invalid status selected";
  }
};

const validateField = (name: string, value: string): string | undefined => {
  switch (name) {
    case "name":
      return validateName(value);
    case "email":
      return validateEmail(value);
    case "phoneNumber":
      return validatePhone(value);
    case "status":
      return validateStatus(value);
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
      if (key === "aiAssistantEnabled") return;
      const value = formData[key as keyof typeof formData];
      if (typeof value === "string") {
        const error = validateField(key, value);
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
      const error = validateField(name, value);
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
    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allFields = Object.keys(formData).filter(
      (key) => key !== "aiAssistantEnabled"
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
          fieldErrors[error.field as keyof FormErrors] = error.message;
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
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
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
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="phoneNumber"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Phone Number
        </label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          required
          value={formData.phoneNumber}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.phoneNumber
              ? "border-red-500 ring-red-100"
              : "border-gray-300"
          }`}
          disabled={isLoading}
        />
        {errors.phoneNumber && touchedFields.has("phoneNumber") && (
          <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
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
          <p className="mt-1 text-sm text-red-600">{errors.status}</p>
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
