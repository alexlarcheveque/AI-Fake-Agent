import React, { useState, useEffect } from "react";
import searchCriteriaApi from "../api/searchCriteriaApi";
import { SearchCriteriaRow } from "../../../../backend/models/SearchCriteria.ts";

interface SearchCriteriaModalProps {
  leadId: number;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (criteria: SearchCriteriaRow) => void;
}

const SearchCriteriaModal: React.FC<SearchCriteriaModalProps> = ({
  leadId,
  isOpen,
  onClose,
  onSave,
}) => {
  const [searchCriteria, setSearchCriteria] =
    useState<SearchCriteriaRow | null>(null);
  const [isEditingSearchCriteria, setIsEditingSearchCriteria] = useState(false);
  const [isLoadingSearchCriteria, setIsLoadingSearchCriteria] = useState(false);

  // Format currency
  const formatCurrency = (value?: number | null): string => {
    if (!value) return "Not specified";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format array as comma-separated string
  const formatArray = (arr?: string[] | null): string => {
    if (!arr || arr.length === 0) return "Not specified";
    return arr.join(", ");
  };

  // Fetch search criteria when modal opens
  useEffect(() => {
    if (isOpen && leadId) {
      const fetchSearchCriteria = async () => {
        setIsLoadingSearchCriteria(true);
        try {
          const criteria = await searchCriteriaApi.getSearchCriteriaByLeadId(
            leadId
          );
          setSearchCriteria(criteria);
        } catch (error) {
          console.error("Error fetching search criteria:", error);
        } finally {
          setIsLoadingSearchCriteria(false);
        }
      };

      fetchSearchCriteria();
    }
  }, [isOpen, leadId]);

  // Handle form submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Get form values
    const minPrice = formData.get("min_price")
      ? Number(formData.get("min_price"))
      : null;
    const maxPrice = formData.get("max_price")
      ? Number(formData.get("max_price"))
      : null;

    // Split comma-separated values into arrays
    const locationsString = formData.get("locations") as string;
    const locations = locationsString
      ? locationsString
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : null;

    const propertyTypesString = formData.get("property_types") as string;
    const propertyTypes = propertyTypesString
      ? propertyTypesString
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : null;

    const minBedrooms = formData.get("min_bedrooms")
      ? Number(formData.get("min_bedrooms"))
      : null;
    const maxBedroom = formData.get("max_bedroom")
      ? Number(formData.get("max_bedroom"))
      : null;
    const minBathrooms = formData.get("min_bathrooms")
      ? Number(formData.get("min_bathrooms"))
      : null;
    const maxBathrooms = formData.get("max_bathrooms")
      ? Number(formData.get("max_bathrooms"))
      : null;
    const minSquareFeet = formData.get("min_square_feet")
      ? Number(formData.get("min_square_feet"))
      : null;
    const maxSquareFeet = formData.get("max_square_feet")
      ? Number(formData.get("max_square_feet"))
      : null;

    try {
      const updatedCriteria = await searchCriteriaApi.upsertSearchCriteria({
        id: searchCriteria?.id,
        lead_id: leadId,
        min_price: minPrice,
        max_price: maxPrice,
        locations,
        property_types: propertyTypes,
        min_bedrooms: minBedrooms,
        max_bedroom: maxBedroom,
        min_bathrooms: minBathrooms,
        max_bathrooms: maxBathrooms,
        min_square_feet: minSquareFeet,
        max_square_feet: maxSquareFeet,
      });

      setSearchCriteria(updatedCriteria);
      setIsEditingSearchCriteria(false);

      if (onSave) {
        onSave(updatedCriteria);
      }
    } catch (error) {
      console.error("Error saving search criteria:", error);
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
        <div className="inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          <div className="relative">
            <div className="absolute top-0 right-0 pt-2 pr-2 z-10">
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
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
            </div>

            <div className="bg-white px-4 pt-12 pb-4 sm:px-6 sm:pt-12 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Search Criteria
                    </h3>
                    {searchCriteria && !isEditingSearchCriteria && (
                      <button
                        type="button"
                        onClick={() => setIsEditingSearchCriteria(true)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        Edit
                      </button>
                    )}
                  </div>

                  {isLoadingSearchCriteria ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : searchCriteria ? (
                    !isEditingSearchCriteria ? (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              Price Range
                            </h4>
                            <p className="text-base text-gray-900">
                              {searchCriteria.min_price &&
                              searchCriteria.max_price
                                ? `${formatCurrency(
                                    searchCriteria.min_price
                                  )} - ${formatCurrency(
                                    searchCriteria.max_price
                                  )}`
                                : searchCriteria.min_price
                                ? `${formatCurrency(searchCriteria.min_price)}+`
                                : searchCriteria.max_price
                                ? `Up to ${formatCurrency(
                                    searchCriteria.max_price
                                  )}`
                                : "Not specified"}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              Locations
                            </h4>
                            <p className="text-base text-gray-900">
                              {formatArray(searchCriteria.locations)}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              Property Types
                            </h4>
                            <p className="text-base text-gray-900">
                              {formatArray(searchCriteria.property_types)}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-500">
                                Bedrooms
                              </h4>
                              <p className="text-base text-gray-900">
                                {searchCriteria.min_bedrooms &&
                                searchCriteria.max_bedroom
                                  ? `${searchCriteria.min_bedrooms} - ${searchCriteria.max_bedroom} bedrooms`
                                  : searchCriteria.min_bedrooms
                                  ? `${searchCriteria.min_bedrooms}+ bedrooms`
                                  : searchCriteria.max_bedroom
                                  ? `Up to ${searchCriteria.max_bedroom} bedrooms`
                                  : "Not specified"}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium text-gray-500">
                                Bathrooms
                              </h4>
                              <p className="text-base text-gray-900">
                                {searchCriteria.min_bathrooms &&
                                searchCriteria.max_bathrooms
                                  ? `${searchCriteria.min_bathrooms} - ${searchCriteria.max_bathrooms} bathrooms`
                                  : searchCriteria.min_bathrooms
                                  ? `${searchCriteria.min_bathrooms}+ bathrooms`
                                  : searchCriteria.max_bathrooms
                                  ? `Up to ${searchCriteria.max_bathrooms} bathrooms`
                                  : "Not specified"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              Square Footage
                            </h4>
                            <p className="text-base text-gray-900">
                              {searchCriteria.min_square_feet &&
                              searchCriteria.max_square_feet
                                ? `${searchCriteria.min_square_feet.toLocaleString()} - ${searchCriteria.max_square_feet.toLocaleString()} sq ft`
                                : searchCriteria.min_square_feet
                                ? `${searchCriteria.min_square_feet.toLocaleString()}+ sq ft`
                                : searchCriteria.max_square_feet
                                ? `Up to ${searchCriteria.max_square_feet.toLocaleString()} sq ft`
                                : "Not specified"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <form
                          id="searchCriteriaForm"
                          onSubmit={handleSave}
                          className="space-y-4"
                        >
                          {/* Price Range */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="min_price"
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Min Price
                              </label>
                              <input
                                type="number"
                                id="min_price"
                                name="min_price"
                                defaultValue={searchCriteria?.min_price || ""}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Min price"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="max_price"
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Max Price
                              </label>
                              <input
                                type="number"
                                id="max_price"
                                name="max_price"
                                defaultValue={searchCriteria?.max_price || ""}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Max price"
                              />
                            </div>
                          </div>

                          {/* Locations */}
                          <div>
                            <label
                              htmlFor="locations"
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Locations
                            </label>
                            <input
                              type="text"
                              id="locations"
                              name="locations"
                              defaultValue={
                                searchCriteria?.locations?.join(", ") || ""
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Separate multiple locations with commas"
                            />
                          </div>

                          {/* Property Types */}
                          <div>
                            <label
                              htmlFor="property_types"
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Property Types
                            </label>
                            <input
                              type="text"
                              id="property_types"
                              name="property_types"
                              defaultValue={
                                searchCriteria?.property_types?.join(", ") || ""
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Separate multiple types with commas"
                            />
                          </div>

                          {/* Bedrooms */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="min_bedrooms"
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Min Bedrooms
                              </label>
                              <input
                                type="number"
                                id="min_bedrooms"
                                name="min_bedrooms"
                                defaultValue={
                                  searchCriteria?.min_bedrooms || ""
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Min bedrooms"
                                min="0"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="max_bedroom"
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Max Bedrooms
                              </label>
                              <input
                                type="number"
                                id="max_bedroom"
                                name="max_bedroom"
                                defaultValue={searchCriteria?.max_bedroom || ""}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Max bedrooms"
                                min="0"
                              />
                            </div>
                          </div>

                          {/* Bathrooms */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="min_bathrooms"
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Min Bathrooms
                              </label>
                              <input
                                type="number"
                                id="min_bathrooms"
                                name="min_bathrooms"
                                defaultValue={
                                  searchCriteria?.min_bathrooms || ""
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Min bathrooms"
                                min="0"
                                step="0.5"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="max_bathrooms"
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Max Bathrooms
                              </label>
                              <input
                                type="number"
                                id="max_bathrooms"
                                name="max_bathrooms"
                                defaultValue={
                                  searchCriteria?.max_bathrooms || ""
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Max bathrooms"
                                min="0"
                                step="0.5"
                              />
                            </div>
                          </div>

                          {/* Square Footage */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="min_square_feet"
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Min Square Feet
                              </label>
                              <input
                                type="number"
                                id="min_square_feet"
                                name="min_square_feet"
                                defaultValue={
                                  searchCriteria?.min_square_feet || ""
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Min square feet"
                                min="0"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="max_square_feet"
                                className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                Max Square Feet
                              </label>
                              <input
                                type="number"
                                id="max_square_feet"
                                name="max_square_feet"
                                defaultValue={
                                  searchCriteria?.max_square_feet || ""
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Max square feet"
                                min="0"
                              />
                            </div>
                          </div>
                        </form>
                      </div>
                    )
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">
                            Price Range
                          </h4>
                          <p className="text-base text-gray-400">
                            Not specified
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500">
                            Locations
                          </h4>
                          <p className="text-base text-gray-400">
                            Not specified
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500">
                            Property Types
                          </h4>
                          <p className="text-base text-gray-400">
                            Not specified
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              Bedrooms
                            </h4>
                            <p className="text-base text-gray-400">
                              Not specified
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              Bathrooms
                            </h4>
                            <p className="text-base text-gray-400">
                              Not specified
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500">
                            Square Footage
                          </h4>
                          <p className="text-base text-gray-400">
                            Not specified
                          </p>
                        </div>

                        <div className="flex justify-center mt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingSearchCriteria(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Create Search Criteria
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {isEditingSearchCriteria ? (
                <>
                  <button
                    type="submit"
                    form="searchCriteriaForm"
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setIsEditingSearchCriteria(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={onClose}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchCriteriaModal;
