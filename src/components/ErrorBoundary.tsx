import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorHandler, ErrorInfo as AppErrorInfo } from '@/utils/errorHandler';
import { toast } from 'react-hot-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: AppErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler = ErrorHandler.getInstance();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appErrorInfo = this.errorHandler.handleError(error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
    });

    this.setState({
      errorInfo: appErrorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    if (error && errorInfo) {
      // In a real app, you might send this to a reporting service
      console.error('Error reported:', { error, errorInfo });
      toast.success('Error has been reported to the development team.');
    }
  };

  private handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: (errorInfo as any)?.componentStack || '',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
      this.setState({ copied: true });
      toast.success('Error details copied to clipboard');
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      toast.error('Failed to copy error details');
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Oops! Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                We encountered an unexpected error. Don't worry, your data is safe. 
                This error has been logged and our team will look into it.
              </p>
              
              {this.state.error && (
                <details className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bug className="w-4 h-4" />
                      Technical Details
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={this.handleCopyError}
                      leftIcon={this.state.copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    >
                      {this.state.copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <strong className="text-red-600 dark:text-red-400">Error:</strong>
                      <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-2 border-red-300 dark:border-red-600 text-sm">
                        {this.state.error.message}
                      </div>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong className="text-blue-600 dark:text-blue-400">Stack Trace:</strong>
                        <pre className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-2 border-blue-300 dark:border-blue-600 text-xs overflow-auto max-h-32">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  Try Again
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  leftIcon={<Home className="w-4 h-4" />}
                >
                  Go Home
                </Button>
              </div>

              {import.meta.env.DEV && (
                <Button
                  onClick={this.handleReportError}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  Report Error
                </Button>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  If this problem continues, please contact support with the error details above.
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

/**
 * Hook for functional components to handle errors
 */
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

export default ErrorBoundary;