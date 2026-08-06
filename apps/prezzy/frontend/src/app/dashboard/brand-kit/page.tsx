"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface BrandKitData {
  id?: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  logo_url?: string;
}

export default function BrandKit() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [kit, setKit] = useState<BrandKitData>({
    name: 'Meu Template Base',
    primary_color: '#ff6a00',
    secondary_color: '#0d0d0d',
    font_family: 'Inter'
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBrandKit();
  }, []);

  async function loadBrandKit() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const resp = await fetch(`${apiUrl}/api/brand-kits`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.brand_kits && data.brand_kits.length > 0) {
          setKit(data.brand_kits[0]); // For now, we manage 1 active brand kit per user
        }
      }
    } catch (err) {
      console.error("Failed to load brand kit", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const formData = new FormData();
    formData.append('name', kit.name);
    formData.append('primary_color', kit.primary_color);
    formData.append('secondary_color', kit.secondary_color);
    formData.append('font_family', kit.font_family);
    if (kit.id) formData.append('id', kit.id);
    if (logoFile) formData.append('logo', logoFile);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const resp = await fetch(`${apiUrl}/api/brand-kits`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });

      if (resp.ok) {
        const data = await resp.json();
        setKit(data.brand_kit);
        setMessage("Brand Kit salvo com sucesso!");
        setLogoFile(null); // Clear file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const errData = await resp.json();
        setError(errData.detail || "Erro ao salvar.");
      }
    } catch (err) {
      setError("Erro de comunicação com o servidor.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8">Carregando Brand Kit...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-3xl font-bold mb-6">Brand Kit</h1>
      
      <div className="bg-panel p-8 rounded-xl border border-rule max-w-2xl">
        <p className="opacity-70 mb-8">Defina as cores e logo da sua marca. Estes elementos serão aplicados em todos os PDFs gerados pelo PREZZY.</p>
        
        {message && <div className="mb-6 p-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg">{message}</div>}
        {error && <div className="mb-6 p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">{error}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Nome do Template</label>
            <input 
              type="text" 
              value={kit.name}
              onChange={e => setKit({...kit, name: e.target.value})}
              className="w-full bg-background border border-rule p-3 rounded focus:border-primary outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">Cor Primária (HEX)</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={kit.primary_color}
                  onChange={e => setKit({...kit, primary_color: e.target.value})}
                  className="h-12 w-12 rounded cursor-pointer border border-rule"
                />
                <input 
                  type="text" 
                  value={kit.primary_color}
                  onChange={e => setKit({...kit, primary_color: e.target.value})}
                  className="flex-1 bg-background border border-rule p-3 rounded focus:border-primary outline-none uppercase"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">Cor Secundária (HEX)</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={kit.secondary_color}
                  onChange={e => setKit({...kit, secondary_color: e.target.value})}
                  className="h-12 w-12 rounded cursor-pointer border border-rule"
                />
                <input 
                  type="text" 
                  value={kit.secondary_color}
                  onChange={e => setKit({...kit, secondary_color: e.target.value})}
                  className="flex-1 bg-background border border-rule p-3 rounded focus:border-primary outline-none uppercase"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Família de Fonte</label>
            <select 
              value={kit.font_family}
              onChange={e => setKit({...kit, font_family: e.target.value})}
              className="w-full bg-background border border-rule p-3 rounded focus:border-primary outline-none"
            >
              <option value="Inter">Inter (Sans Serif)</option>
              <option value="Roboto">Roboto</option>
              <option value="Space Grotesk">Space Grotesk</option>
              <option value="Merriweather">Merriweather (Serif)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">Upload de Logo (PNG/JPG)</label>
            {kit.logo_url && (
              <div className="mb-3 text-sm text-primary">
                ✓ Logo atual salva. Faça upload apenas se quiser substituir.
              </div>
            )}
            <input 
              type="file" 
              accept="image/png, image/jpeg"
              ref={fileInputRef}
              onChange={e => setLogoFile(e.target.files ? e.target.files[0] : null)}
              className="w-full bg-background border border-rule p-3 rounded file:bg-primary file:text-white file:border-0 file:rounded file:px-4 file:py-1 file:mr-4 file:cursor-pointer hover:file:bg-accent"
            />
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="bg-primary text-white font-bold py-3 px-8 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Brand Kit'}
          </button>
        </form>
      </div>
    </div>
  );
}
