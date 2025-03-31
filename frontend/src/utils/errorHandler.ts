import axios, { AxiosError } from 'axios';

/**
 * Standard error handler for API calls
 * @param error - The error object from the API call
 * @returns - A standardized error object or throws the error if it's critical
 */
export const handleApiError = (error: unknown): any => {
  console.error('API Error:', error);
  
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Handle axios errors
    if (axiosError.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error data:', axiosError.response.data);
      console.error('Response error status:', axiosError.response.status);
      
      // Return the server error message if available
      if (axiosError.response.data && typeof axiosError.response.data === 'object') {
        return axiosError.response.data;
      }
      
      // Return a standard error message based on status code
      if (axiosError.response.status === 401) {
        return { error: 'Authentication required. Please log in.' };
      } else if (axiosError.response.status === 403) {
        return { error: 'You do not have permission to perform this action.' };
      } else if (axiosError.response.status === 404) {
        return { error: 'The requested resource was not found.' };
      } else if (axiosError.response.status >= 500) {
        return { error: 'Server error. Please try again later.' };
      }
      
      return { error: 'An error occurred while communicating with the server.' };
    } else if (axiosError.request) {
      // The request was made but no response was received
      console.error('Request error:', axiosError.request);
      return { error: 'No response received from the server. Please check your network connection.' };
    } else {
      // Something happened in setting up the request that triggered an error
      console.error('Error message:', axiosError.message);
      return { error: 'An error occurred while setting up the request.' };
    }
  }
  
  // For non-axios errors
  console.error('Non-Axios error:', error);
  return { error: 'An unexpected error occurred.' };
}; 