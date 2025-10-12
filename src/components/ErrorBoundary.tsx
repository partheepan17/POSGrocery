import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Home, Bug } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { formatErrorDetails, copyErrorDetails, notify } from '@/lib/notifications';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorDetails: any | null;
  isRetrying: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails = formatErrorDetails(error, notify.getRequestId() || undefined);
    
    this.setState({
      error,
      errorInfo,
      errorDetails,
    });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service in production
    if (import.meta.env.PROD) {
      this.sendErrorToMonitoring(errorDetails);
    }
  }

  private async sendErrorToMonitoring(errorDetails: any) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorDetails),
      });
    } catch (err) {
      console.error('Failed to send error to monitoring service:', err);
    }
  }

  private handleRetry = async () => {
    if (this.retryCount >= this.maxRetries) {
      notify.error('Maximum retry attempts reached. Please refresh the page.');
      return;
    }

    this.setState({ isRetrying: true });
    this.retryCount++;

    try {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorDetails: null,
        isRetrying: false,
      });

      notify.success('Page recovered successfully!');
    } catch (error) {
      this.setState({ isRetrying: false });
      notify.error('Retry failed. Please try again or refresh the page.');
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleCopyError = async () => {
    if (!this.state.errorDetails) return;

    const success = await copyErrorDetails(this.state.errorDetails);
    if (success) {
      notify.success('Error details copied to clipboard');
    } else {
      notify.error('Failed to copy error details');
    }
  };

  private handleReportBug = () => {
    if (!this.state.errorDetails) return;

    const bugReportUrl = `https://github.com/your-org/virtual-pos/issues/new?title=Error%20Report&body=${encodeURIComponent(
      `**Error Details:**
- Message: ${this.state.errorDetails.message}
- Code: ${this.state.errorDetails.code}
- Request ID: ${this.state.errorDetails.requestId}
- Timestamp: ${this.state.errorDetails.timestamp}
- URL: ${this.state.errorDetails.url}

**Stack Trace:**
\`\`\`
${this.state.errorDetails.stack}
\`\`\``
    )}`;

    window.open(bugReportUrl, '_blank');
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl text-gray-900 dark:text-white font-bold">
                Something went wrong
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                We're sorry, but something unexpected happened. Don't worry, your data is safe.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error Details */}
              {this.state.errorDetails && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Error Details
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <strong>Message:</strong> {this.state.errorDetails.message}
                    </div>
                    {this.state.errorDetails.code && (
                      <div>
                        <strong>Code:</strong> {this.state.errorDetails.code}
                      </div>
                    )}
                    {this.state.errorDetails.requestId && (
                      <div>
                        <strong>Request ID:</strong> {this.state.errorDetails.requestId}
                      </div>
                    )}
                    <div>
                      <strong>Timestamp:</strong> {new Date(this.state.errorDetails.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                  className="flex-1"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                  {this.state.isRetrying ? 'Retrying...' : 'Try Again'}
                </Button>
                
                <Button
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Developer Actions */}
              {import.meta.env.DEV && this.state.errorDetails && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Developer Actions
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={this.handleCopyError}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Error Details
                    </Button>
                    
                    <Button
                      onClick={this.handleReportBug}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Bug className="w-4 h-4 mr-2" />
                      Report Bug
                    </Button>
                  </div>
                </div>
              )}

              {/* Help Text */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <p>
                  If this problem persists, please contact support with the Request ID above.
                </p>
                <p className="mt-1">
                  Your work has been automatically saved.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error boundary context
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}
