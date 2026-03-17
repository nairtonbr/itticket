import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let details = "";

      try {
        if (error?.message) {
          // Check if it's a raw index error from our handleFirestoreError
          if (error.message.includes("Índice necessário")) {
            const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
            errorMessage = "Índice do Banco de Dados Necessário";
            details = "Esta consulta precisa de um índice composto para funcionar.";
            const indexUrl = urlMatch ? urlMatch[0] : null;
            
            return (
              <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full text-center">
                  <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{errorMessage}</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-6">{details}</p>
                  
                  {indexUrl && (
                    <a 
                      href={indexUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-6 rounded-xl transition-all mb-4 text-sm"
                    >
                      Clique aqui para criar o índice no Firebase
                    </a>
                  )}
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Recarregar após criar
                  </button>
                </div>
              </div>
            );
          }

          const parsed = JSON.parse(error.message);
          if (parsed.error && parsed.error.includes("Missing or insufficient permissions")) {
            errorMessage = "Erro de Permissão";
            details = "Você não tem permissão para realizar esta operação ou acessar estes dados.";
          } else {
            errorMessage = parsed.error || errorMessage;
          }
        }
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{errorMessage}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8">{details || "Tente recarregar a página ou entre em contato com o suporte."}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
