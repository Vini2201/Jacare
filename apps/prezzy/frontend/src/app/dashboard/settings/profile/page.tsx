"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function ProfileSettings() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  type ProfileUser = { email?: string | null; user_metadata?: { full_name?: string | null } };
  const [user, setUser] = useState<ProfileUser | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    setFullName(user.user_metadata?.full_name || '');
    setLoading(false);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    
    const updates: any = { data: { full_name: fullName } };
    if (newPassword.trim()) {
      updates.password = newPassword;
    }

    const { error } = await supabase.auth.updateUser(updates);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Perfil atualizado com sucesso!");
      setNewPassword(''); // Clear password field
    }
  }

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Configurações de Conta</h1>
      
      <div className="bg-panel p-8 rounded-xl border border-rule">
        {message && <div className="mb-4 p-3 bg-green-500/10 text-green-500 border border-green-500/20 rounded">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded">{error}</div>}
        
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Email</label>
            <input 
              type="email" 
              value={user?.email || ''} 
              disabled 
              className="w-full bg-panel-2 border border-rule p-3 rounded opacity-50 cursor-not-allowed"
            />
            <p className="text-xs opacity-50 mt-1">O email não pode ser alterado diretamente.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Nome Completo</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-background border border-rule p-3 rounded focus:border-primary outline-none"
              placeholder="Seu nome"
            />
          </div>

          <div className="pt-4 border-t border-rule">
            <h3 className="text-lg font-bold mb-4">Segurança</h3>
            <label className="block text-sm font-medium mb-1 opacity-70">Nova Senha (deixe em branco para não alterar)</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-background border border-rule p-3 rounded focus:border-primary outline-none"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-accent transition-colors"
          >
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  );
}

