// Error Handling Utilities for the Trip Management System

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Main error class for the application
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, severity = ERROR_SEVERITY.MEDIUM, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Network error handling
export class NetworkError extends AppError {
  constructor(message = 'Network connection failed', details = null) {
    super(message, ERROR_TYPES.NETWORK, ERROR_SEVERITY.HIGH, details);
    this.name = 'NetworkError';
  }
}

// Authentication error handling
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details = null) {
    super(message, ERROR_TYPES.AUTHENTICATION, ERROR_SEVERITY.HIGH, details);
    this.name = 'AuthenticationError';
  }
}

// Authorization error handling
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', details = null) {
    super(message, ERROR_TYPES.AUTHORIZATION, ERROR_SEVERITY.HIGH, details);
    this.name = 'AuthorizationError';
  }
}

// Validation error handling
export class ValidationError extends AppError {
  constructor(message = 'Invalid data provided', details = null) {
    super(message, ERROR_TYPES.VALIDATION, ERROR_SEVERITY.MEDIUM, details);
    this.name = 'ValidationError';
  }
}

// Server error handling
export class ServerError extends AppError {
  constructor(message = 'Server error occurred', details = null) {
    super(message, ERROR_TYPES.SERVER, ERROR_SEVERITY.HIGH, details);
    this.name = 'ServerError';
  }
}

// Create error from fetch response
export const createErrorFromResponse = async (response, responseData = null) => {
  const message = responseData?.message || response.statusText || 'An error occurred';
  const status = response.status;
  
  if (status === 401) {
    return new AuthenticationError(message, { status, url: response.url });
  } else if (status === 403) {
    return new AuthorizationError(message, { status, url: response.url });
  } else if (status >= 400 && status < 500) {
    return new ValidationError(message, { status, url: response.url, data: responseData });
  } else if (status >= 500) {
    return new ServerError(message, { status, url: response.url });
  } else {
    return new AppError(message, ERROR_TYPES.UNKNOWN, ERROR_SEVERITY.MEDIUM, { status, url: response.url });
  }
};

// Handle fetch errors and create appropriate error objects
export const handleFetchError = async (response) => {
  try {
    const responseData = await response.json().catch(() => null);
    return createErrorFromResponse(response, responseData);
  } catch (error) {
    return new NetworkError(`Failed to parse error response: ${error.message}`, { 
      originalError: error,
      status: response.status,
      url: response.url 
    });
  }
};

// Generic error handler for API calls
export const handleApiError = (error, fallbackMessage = 'An unexpected error occurred') => {
  console.error('API Error:', error);
  
  if (error instanceof AppError) {
    return error;
  }
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new NetworkError('Network connection failed. Please check your internet connection.');
  }
  
  return new AppError(
    error.message || fallbackMessage, 
    ERROR_TYPES.UNKNOWN, 
    ERROR_SEVERITY.MEDIUM, 
    { originalError: error }
  );
};

// Retry logic for failed requests
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Error recovery strategies
export const getErrorRecoveryMessage = (error) => {
  switch (error.type) {
    case ERROR_TYPES.NETWORK:
      return 'Please check your internet connection and try again.';
    case ERROR_TYPES.AUTHENTICATION:
      return 'Please log in again to continue.';
    case ERROR_TYPES.AUTHORIZATION:
      return 'You don\'t have permission to perform this action.';
    case ERROR_TYPES.VALIDATION:
      return 'Please check your input and try again.';
    case ERROR_TYPES.SERVER:
      return 'Server is temporarily unavailable. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

// Error logging utility
export const logError = (error, context = {}) => {
  const errorInfo = {
    message: error.message,
    type: error.type,
    severity: error.severity,
    timestamp: error.timestamp || new Date().toISOString(),
    context,
    stack: error.stack
  };
  
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo);
  }
  
  // In production, you would send to logging service
  // Example: sendToLoggingService(errorInfo);
  
  return errorInfo;
};

// User-friendly error message formatter
export const formatErrorMessage = (error, includeDetails = false) => {
  if (typeof error === 'string') {
    return error;
  }
  
  let message = error.message || 'An unknown error occurred';
  
  if (includeDetails && error.details) {
    message += ` (${JSON.stringify(error.details)})`;
  }
  
  return message;
};

// Error boundary error handler
export const handleBoundaryError = (error, errorInfo) => {
  console.error('Error Boundary caught an error:', error, errorInfo);
  
  return {
    hasError: true,
    error: new AppError(
      'Something went wrong. Please refresh the page and try again.',
      ERROR_TYPES.UNKNOWN,
      ERROR_SEVERITY.HIGH,
      { originalError: error.message, componentStack: errorInfo.componentStack }
    )
  };
};

// Form validation error handler
export const handleValidationError = (errors) => {
  const formattedErrors = {};
  
  if (Array.isArray(errors)) {
    errors.forEach(error => {
      if (error.field && error.message) {
        formattedErrors[error.field] = error.message;
      }
    });
  } else if (typeof errors === 'object') {
    Object.assign(formattedErrors, errors);
  } else {
    formattedErrors.general = typeof errors === 'string' ? errors : 'Validation failed';
  }
  
  return formattedErrors;
};

// Check if error is retriable
export const isRetriableError = (error) => {
  return (
    error.type === ERROR_TYPES.NETWORK ||
    (error.type === ERROR_TYPES.SERVER && error.details?.status >= 500)
  );
};

// Get user-friendly error title
export const getErrorTitle = (error) => {
  switch (error.type) {
    case ERROR_TYPES.NETWORK:
      return 'Connection Problem';
    case ERROR_TYPES.AUTHENTICATION:
      return 'Login Required';
    case ERROR_TYPES.AUTHORIZATION:
      return 'Access Denied';
    case ERROR_TYPES.VALIDATION:
      return 'Invalid Input';
    case ERROR_TYPES.SERVER:
      return 'Server Error';
    default:
      return 'Something Went Wrong';
  }
};

// Error notification preferences
export const shouldShowNotification = (error) => {
  // Don't show notifications for certain types of errors
  const silentErrors = [
    ERROR_TYPES.AUTHENTICATION // Silent auth errors, handled by auth system
  ];
  
  return !silentErrors.includes(error.type);
};

// Default error handler for the app
export const defaultErrorHandler = (error, context = {}) => {
  const appError = error instanceof AppError ? error : handleApiError(error);
  const recoveryMessage = getErrorRecoveryMessage(appError);
  
  // Log the error
  logError(appError, context);
  
  // Show user-friendly notification if appropriate
  if (shouldShowNotification(appError)) {
    // In a real app, you would show a toast/notification here
    console.warn(`${getErrorTitle(appError)}: ${appError.message}`);
  }
  
  return {
    error: appError,
    recoveryMessage,
    isRetriable: isRetriableError(appError)
  };
};

export default {
  AppError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ServerError,
  createErrorFromResponse,
  handleFetchError,
  handleApiError,
  retryWithBackoff,
  getErrorRecoveryMessage,
  logError,
  formatErrorMessage,
  handleBoundaryError,
  handleValidationError,
  isRetriableError,
  getErrorTitle,
  shouldShowNotification,
  defaultErrorHandler,
  ERROR_TYPES,
  ERROR_SEVERITY
};