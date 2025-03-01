import { useState, useCallback } from "react";

interface ErrorState {
  message: string | null;
  field?: string | null;
  status?: number;
}

export function useApiError() {
  const [error, setError] = useState<ErrorState>({ message: null });
  const [isLoading, setIsLoading] = useState(false);

  const handleApiCall = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      onSuccess?: (data: T) => void
    ): Promise<T | null> => {
      setIsLoading(true);
      setError({ message: null });

      try {
        const data = await apiCall();
        if (onSuccess) {
          onSuccess(data);
        }
        return data;
      } catch (err: any) {
        const errorMessage = err.message || "An unexpected error occurred";
        const errorStatus = err.status || 500;

        setError({
          message: errorMessage,
          status: errorStatus,
          field: err.field || null,
        });

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError({ message: null });
  }, []);

  return {
    error,
    isLoading,
    handleApiCall,
    clearError,
  };
}
