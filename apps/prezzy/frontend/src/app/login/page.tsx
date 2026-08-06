"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // ── LOGIN ────────────────────────────────────────
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  // ── CADASTRO ─────────────────────────────────────
  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
      setLoading(false);
      return;
    }

    setMessage({
      text: 'Conta criada! Verifique seu e-mail para confirmar o cadastro.',
      type: 'success',
    });
    setLoading(false);
  }

  // ── RECUPERAÇÃO DE SENHA ─────────────────────────
  async function handleResetPassword() {
    const email = prompt('Digite seu e-mail para recuperar a senha:');
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/login`,
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'Link de recuperação enviado! Verifique seu e-mail.', type: 'success' });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      {/* Container Principal com Perspectiva para a animação 3D (Flip) */}
      <div className="w-full max-w-md relative" style={{ perspective: '1000px' }}>
        
        {/* Feedback Messages */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg text-sm font-medium border ${
            message.type === 'error' 
              ? 'bg-red-500/10 border-red-500/30 text-red-500' 
              : 'bg-green-500/10 border-green-500/30 text-green-500'
          }`}>
            {message.text}
          </div>
        )}

        {/* Wrapper que vai girar */}
        <div 
          className="relative w-full transition-transform duration-700"
          style={{ 
            transformStyle: 'preserve-3d', 
            transform: isLogin ? 'rotateY(0deg)' : 'rotateY(180deg)',
            height: '480px'
          }}
        >
          {/* Lado da Frente: LOGIN */}
          <div 
            className="absolute inset-0 bg-panel p-8 rounded-2xl border border-rule shadow-2xl flex flex-col justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 tracking-tight">Bem-vindo de volta</h1>
              <p className="opacity-70">Acesse seu Workspace no PREZZY</p>
            </div>
            
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <input name="email" type="email" placeholder="Seu e-mail" required className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <input name="password" type="password" placeholder="Sua senha" required minLength={6} className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors" />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-white p-3 rounded-lg hover:bg-accent transition-colors font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <button onClick={handleResetPassword} className="text-xs opacity-50 hover:opacity-100 hover:text-primary transition-all">
                Esqueceu a senha?
              </button>
            </div>
            <div className="mt-2 text-center">
              <p className="text-sm opacity-70">
                Ainda não tem uma conta?{' '}
                <button onClick={() => { setIsLogin(false); setMessage(null); }} className="text-primary hover:underline font-bold">
                  Criar agora
                </button>
              </p>
            </div>
          </div>

          {/* Lado de Trás: CADASTRO */}
          <div 
            className="absolute inset-0 bg-panel p-8 rounded-2xl border border-rule shadow-2xl flex flex-col justify-center"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 tracking-tight">Criar Conta</h1>
              <p className="opacity-70">Junte-se ao futuro da criação via IA</p>
            </div>
            
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div>
                <input name="name" type="text" placeholder="Seu nome" required className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <input name="email" type="email" placeholder="Seu e-mail" required className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <input name="password" type="password" placeholder="Crie uma senha" required minLength={6} className="w-full bg-background border border-rule p-3 rounded-lg focus:outline-none focus:border-primary transition-colors" />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-background text-primary border border-primary p-3 rounded-lg hover:bg-primary/10 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando...' : 'Cadastrar'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm opacity-70">
                Já possui uma conta?{' '}
                <button onClick={() => { setIsLogin(true); setMessage(null); }} className="text-primary hover:underline font-bold">
                  Fazer Login
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Botão de voltar para a Home */}
      <Link href="/" className="fixed top-8 left-8 text-sm opacity-50 hover:opacity-100 hover:text-primary transition-all">
        ← Voltar
      </Link>
    </div>
  );
}
