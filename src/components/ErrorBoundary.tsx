import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      let errorDetails = '';

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error) {
            errorMessage = 'Erro de permissão ou acesso ao banco de dados.';
            errorDetails = parsedError.error;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-zinc-100 dark:border-zinc-800 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">Ops! Algo deu errado</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-6">{errorMessage}</p>
            
            {errorDetails && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 mb-8 text-left overflow-auto max-h-32">
                <code className="text-[10px] text-zinc-400 dark:text-zinc-500 break-all">
                  {errorDetails}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200 dark:shadow-none"
            >
              <RotateCcw className="w-5 h-5" />
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
