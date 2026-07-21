"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import toast, { Toaster } from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // Verificar se o usuário já está logado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        
        if (session) {
          // Se já estiver autenticado, redirecionar para o dashboard
          router.push("/dashboard");
        } else {
          setIsCheckingAuth(false);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Usar NextAuth para fazer login
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false});

      console.log("Login result:", result); // Debug

      if (result?.error) {
        const errorMessage = result.error.toLowerCase();
        
        if (errorMessage.includes("email") || errorMessage.includes("senha") || errorMessage.includes("inválido")) {
          toast.error("Email ou senha inválidos. Verifique suas credenciais.", {
            duration: 5000,
            position: "top-center",
            style: {
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca'}});
        } else if (errorMessage.includes("obrigatório")) {
          toast.error("Email e senha são obrigatórios.", {
            duration: 4000,
            position: "top-center"});
        } else {
          toast.error(`Erro ao fazer login: ${result.error}`, {
            duration: 5000,
            position: "top-center"});
        }
        return;
      }

      if (result?.ok) {
        // Notificação de sucesso
        toast.success("Login realizado com sucesso! Redirecionando...", {
          duration: 3000,
          position: "top-center",
          style: {
            background: '#f0fdf4',
            color: '#16a34a',
            border: '1px solid #bbf7d0'}});

        console.log("Login successful, waiting for session...");
        
        // Aguardar a session ser estabelecida
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se a session foi criada
        const session = await getSession();
        console.log("Session after login:", session);
        
        if (session) {
          console.log("Redirecting to dashboard...");
          router.push("/dashboard");
          router.refresh();
        } else {
          console.log("No session found, but redirecting anyway...");
          router.push("/dashboard");
        }
      } else {
        toast.error("Erro desconhecido no login. Tente novamente.", {
          duration: 4000,
          position: "top-right"});
      }
      
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro inesperado ao fazer login. Tente novamente.", {
        duration: 5000,
        position: "top-right"});
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading enquanto verifica a autenticação
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg 
              className="h-8 w-8 text-white animate-pulse" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verificando autenticação...</h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Componente Toaster para as notificações */}
      <Toaster
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500'},
          success: {
            style: {
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #bbf7d0'},
            iconTheme: {
              primary: '#16a34a',
              secondary: '#f0fdf4'}},
          error: {
            style: {
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca'},
            iconTheme: {
              primary: '#dc2626',
              secondary: '#fef2f2'}}}}
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          {/* Logo e Cabeçalho */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg 
                className="h-8 w-8 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
                />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Entre na sua conta para continuar
            </p>
          </div>

          {/* Formulário */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Campo Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 transition-all duration-200"
                    placeholder="seu@email.com"
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg 
                      className="h-5 w-5 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" 
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Campo Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 transition-all duration-200"
                    placeholder="Sua senha"
                    disabled={isLoading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <LuEyeOff className="h-5 w-5" />
                      ) : (
                        <LuEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lembrar de mim e Esqueci a senha */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Lembrar de mim
                </label>
              </div>

              <div className="text-sm">
                <Link 
                  href="/forgot-password" 
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </div>

            {/* Botão de Entrar */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </div>
                ) : (
                  "Entrar"
                )}
              </button>
            </div>

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-500">
                  Ou continue com
                </span>
              </div>
            </div>

            {/* Link para Cadastro */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{" "}
                <Link 
                  href="/registro" 
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                >
                  Cadastre-se
                </Link>
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              © 2026 Empório do Pet. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
