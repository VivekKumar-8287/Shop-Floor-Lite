import { useToast } from '../components/ToastProvider';

// Hook version
export const useApiErrorHandler = () => {
  const { showToast } = useToast();

  const handleApiError = (error: any, context?: string) => {
    console.error(`API Error${context ? ` (${context})` : ''}:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config,
    });

    let errorMessage = 'Something went wrong';

    if (error.response?.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Session expired. Please login again.';
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message?.includes('Network Error')) {
      errorMessage = 'Network error. Check your connection.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    showToast(errorMessage, 'error');
    
    return errorMessage;
  };

  return { handleApiError };
};

// Function version (for use outside components)
let toastRef: any = null;
export const setToastRef = (ref: any) => {
  toastRef = ref;
};

export const showApiError = (error: any, context?: string) => {
  console.error(`API Error${context ? ` (${context})` : ''}:`, error);
  
  let errorMessage = 'Something went wrong';
  
  if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error.message) {
    errorMessage = error.message;
  }
  
  if (toastRef) {
    toastRef.showToast(errorMessage, 'error');
  } else {
    console.error('Toast not initialized:', errorMessage);
  }
};