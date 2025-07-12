import React, { useState, useRef } from "react";
import leadApi from "../api/leadApi";
import { LeadRow } from "../../../../backend/models/Lead";
import { LeadStatus } from "./SingleLeadForm";

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
    VALID_VALUES: [
      LeadStatus.NEW,
      LeadStatus.IN_CONVERSATION,
      LeadStatus.CONVERTED,
      LeadStatus.INACTIVE,
    ] as const,
  },
} as const;

// First message timing options
const FIRST_MESSAGE_TIMING_OPTIONS = [
  { value: "immediate", label: "Immediately" },
  { value: "next_day", label: "Next day" },
  { value: "one_week", label: "One week" },
  { value: "two_weeks", label: "Two weeks" },
];

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

interface BulkLeadFormProps {
  onLeadsCreated: (leads: LeadRow[]) => void;
}

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface ImportResult {
  success: boolean;
  message: string;
  created: LeadRow[];
  failed: { row: number; error: string }[];
}

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

  // Provide specific error messages for different cases
  if (cleanPhone.length < 7) {
    return "Phone number is too short";
  } else if (cleanPhone.length === 7) {
    return "Please include area code (e.g., 909-569-7757)";
  } else if (cleanPhone.length === 10) {
    // Valid US number with area code
    return undefined;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith("1")) {
    // Valid US number with country code
    return undefined;
  } else if (cleanPhone.length > 15) {
    return "Phone number is too long";
  }

  // For international numbers (length 8-15, not starting with 1)
  if (cleanPhone.length >= 8 && cleanPhone.length <= 15) {
    return undefined;
  }

  // Pattern validation as fallback
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

const BulkLeadForm: React.FC<BulkLeadFormProps> = ({ onLeadsCreated }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    created: number;
    failed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI feature configurations for all imported leads
  const [aiFeatures, setAiFeatures] = useState({
    aiAssistantEnabled: true,
    enableFollowUps: true,
    firstMessageTiming: "immediate",
  });

  const validateHeaders = (headers: string[]): boolean => {
    console.log("Validating headers:", headers);

    // Check for both "Phone Number" (with space) and "phoneNumber" (no space)
    const hasPhoneNumberField = headers.some(
      (h) =>
        h.toLowerCase() === "phone number" ||
        h.toLowerCase() === "phonenumber" ||
        h.toLowerCase() === "phone"
    );

    // Check for the name field
    const hasNameField = headers.some(
      (h) => h.toLowerCase() === "name" || h.toLowerCase() === "full name"
    );

    const missingFields = [];
    if (!hasNameField) missingFields.push("Name");
    if (!hasPhoneNumberField) missingFields.push("Phone Number");

    if (missingFields.length > 0) {
      setValidationErrors([
        `Missing required headers: ${missingFields.join(", ")}`,
      ]);
      return false;
    }

    setValidationErrors([]);
    return true;
  };

  const readCSVFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error("Failed to read file");
        }

        const csv = event.target.result as string;
        const lines = csv.split(/\r\n|\n/);

        if (lines.length === 0 || lines[0].trim() === "") {
          setValidationErrors(["CSV file appears to be empty"]);
          return;
        }

        // Parse headers
        const headers = lines[0].split(",").map((header) => header.trim());
        console.log("CSV headers found:", headers);

        // Validate headers
        if (!validateHeaders(headers)) {
          return;
        }

        // Parse rows (limit preview to 5 rows)
        const rows: string[][] = [];
        const displayLimit = 5;

        for (let i = 1; i < Math.min(lines.length, displayLimit + 1); i++) {
          if (lines[i].trim() !== "") {
            rows.push(lines[i].split(",").map((cell) => cell.trim()));
          }
        }

        // Count total non-empty rows
        const totalRows = lines
          .slice(1)
          .filter((line) => line.trim() !== "").length;

        setPreview({ headers, rows, totalRows });
      } catch (error) {
        console.error("Error parsing CSV:", error);
        setValidationErrors([
          "Invalid CSV format. Please check your file and try again.",
        ]);
        setPreview(null);
      }
    };

    reader.onerror = () => {
      setValidationErrors(["Error reading the file. Please try again."]);
    };

    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;

    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Reset previous state
    setValidationErrors([]);
    setUploadResult(null);

    // Check file type (accept only .csv)
    if (!file.name.endsWith(".csv")) {
      setValidationErrors(["Please upload a CSV file"]);
      return;
    }

    setSelectedFile(file);
    readCSVFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setValidationErrors(["Please select a CSV file"]);
      return;
    }

    if (validationErrors.length > 0) {
      return;
    }

    setIsUploading(true);

    try {
      const result = (await leadApi.importLeadsFromCSV(
        selectedFile,
        aiFeatures.aiAssistantEnabled
      )) as unknown as ImportResult;

      setUploadResult({
        success: result.success,
        message: result.message,
        created: result.created.length,
        failed: result.failed.length,
      });

      if (result.created.length > 0) {
        onLeadsCreated(result.created);
      }
    } catch (error: any) {
      console.error("Error uploading leads:", error);

      const errorDetails = error.response?.data?.details || [];
      if (Array.isArray(errorDetails) && errorDetails.length > 0) {
        setValidationErrors(errorDetails);
      } else {
        setValidationErrors([
          error.response?.data?.error || "Failed to upload leads",
        ]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    leadApi.downloadLeadTemplate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          <h3 className="font-medium">Please fix the following errors:</h3>
          <ul className="list-disc ml-5 mt-2">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {uploadResult && (
        <div
          className={`p-4 ${
            uploadResult.success
              ? "bg-green-50 border-l-4 border-green-400 text-green-700"
              : "bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700"
          }`}
        >
          <p className="font-medium">{uploadResult.message}</p>
          <p>Successfully created: {uploadResult.created} leads</p>
          {uploadResult.failed > 0 && (
            <p>Failed to create: {uploadResult.failed} leads</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Bulk Lead Import</h2>

        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            Upload a CSV file with the following standardized columns:
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Column Name
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Required
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    Name
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">
                    Yes
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    Lead's full name
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    Phone Number
                  </td>
                  <td className="border border-gray-300 px-4 py-2 font-semibold text-red-600">
                    Yes
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    Lead's contact phone (include area code, e.g., 909-569-7757)
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    Email
                  </td>
                  <td className="border border-gray-300 px-4 py-2">No</td>
                  <td className="border border-gray-300 px-4 py-2">
                    Lead's email address (optional)
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    Status
                  </td>
                  <td className="border border-gray-300 px-4 py-2">No</td>
                  <td className="border border-gray-300 px-4 py-2">
                    Lead status: new, contacted, qualified, or lost
                    <br />
                    <span className="text-xs text-gray-500">
                      Defaults to "new" if not specified
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-semibold text-blue-800 mb-1">
              💡 Tips for successful import:
            </h3>
            <ul className="list-disc text-xs text-blue-700 ml-5 space-y-1">
              <li>
                Keep the column headers exactly as shown in the template for
                best results
              </li>
              <li>Make sure your CSV file uses commas as separators</li>
              <li>Download our template file for the correct format</li>
            </ul>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-blue-600 hover:text-blue-800 underline inline-flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                ></path>
              </svg>
              Download CSV Template
            </button>
          </div>
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-gray-50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".csv"
          />

          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4h-8m-12 0H8m12 0a4 4 0 010-8m0 0v-8m0 0H8m12 9.5V20m0 0V8m20 12v8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium text-blue-600 hover:text-blue-500">
              Click to upload
            </span>
            {" or drag and drop"}
          </div>
          <p className="mt-1 text-xs text-gray-500">CSV files only</p>

          {selectedFile && (
            <div className="mt-3 text-sm text-green-600">
              Selected file: {selectedFile.name}
            </div>
          )}

          {!selectedFile && (
            <div className="mt-4 text-xs text-gray-500 max-w-sm mx-auto">
              <p className="mb-1 font-medium">Format example:</p>
              <div className="bg-white p-2 rounded border border-gray-300 font-mono text-left overflow-x-auto">
                <p>Name,Phone Number,Email,Status</p>
                <p>John Doe,+1234567890,john@example.com,new</p>
                <p>Jane Smith,+1987654321,jane@example.com,contacted</p>
              </div>
            </div>
          )}
        </div>

        {/* Preview Area */}
        {preview && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">
              Preview ({preview.rows.length} of {preview.totalRows} rows)
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-md max-h-[300px] overflow-y-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    {preview.headers.map((header, index) => (
                      <th
                        key={index}
                        className="border-b border-gray-300 px-4 py-2 text-left whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border-b border-gray-200 px-4 py-2 truncate max-w-[200px]"
                          title={cell}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.totalRows > preview.rows.length && (
              <p className="mt-2 text-sm text-gray-500">
                Showing first {preview.rows.length} rows of {preview.totalRows}{" "}
                total rows
              </p>
            )}
          </div>
        )}

        {/* AI Feature Configuration */}
        <div className="mt-6 p-4 border border-blue-100 rounded-md bg-blue-50">
          <h3 className="text-md font-semibold text-blue-800 mb-3">
            AI Features for Imported Leads
          </h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="aiAssistantEnabled"
                checked={aiFeatures.aiAssistantEnabled}
                onChange={(e) =>
                  setAiFeatures((prev) => ({
                    ...prev,
                    aiAssistantEnabled: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label
                htmlFor="aiAssistantEnabled"
                className="ml-2 text-sm text-gray-700"
              >
                Enable AI Assistant for all imported leads
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enableFollowUps"
                checked={aiFeatures.enableFollowUps}
                onChange={(e) =>
                  setAiFeatures((prev) => ({
                    ...prev,
                    enableFollowUps: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label
                htmlFor="enableFollowUps"
                className="ml-2 text-sm text-gray-700"
              >
                Enable automated follow-up messages
              </label>
            </div>

            <div className="mt-4">
              <label
                htmlFor="firstMessageTiming"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                When to send first message:
              </label>
              <select
                id="firstMessageTiming"
                name="firstMessageTiming"
                value={aiFeatures.firstMessageTiming}
                onChange={(e) =>
                  setAiFeatures((prev) => ({
                    ...prev,
                    firstMessageTiming: e.target.value,
                  }))
                }
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                disabled={!aiFeatures.enableFollowUps}
              >
                {FIRST_MESSAGE_TIMING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {!aiFeatures.enableFollowUps &&
                  "Enable follow-ups to set timing"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={
              isUploading || !selectedFile || validationErrors.length > 0
            }
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors 
              ${
                isUploading || !selectedFile || validationErrors.length > 0
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
          >
            {isUploading ? "Importing..." : "Import Leads"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default BulkLeadForm;
