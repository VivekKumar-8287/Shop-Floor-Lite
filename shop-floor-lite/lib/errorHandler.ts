import { Alert } from 'react-native';

export const handleApiError = (error: any, context: string) => {
  console.error(`${context} Error:`, error);
  
  if (error.response) {
    // Backend returned error
    switch (error.response.status) {
      case 401:
        Alert.alert('Session Expired', 'Please login again');
        // Clear token and redirect
        storage.removeItem('token');
        // Navigate to login
        break;
      case 403:
        Alert.alert('Access Denied', 'You don\'t have permission');
        break;
      case 404:
        Alert.alert('Not Found', 'Resource not found');
        break;
      case 500:
        Alert.alert('Server Error', 'Please try again later');
        break;
      default:
        Alert.alert('Error', error.response.data?.message || 'Something went wrong');
    }
  } else if (error.request) {
    // Network error
    Alert.alert('Network Error', 'Please check your connection');
  } else {
    // Other errors
    Alert.alert('Error', 'An unexpected error occurred');
  }
  
  // Return offline mode if network error
  if (error.message.includes('Network Error')) {
    return 'offline';
  }
  
  return 'error';
};