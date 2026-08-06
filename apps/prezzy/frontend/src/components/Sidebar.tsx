"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Wand2,
  Palette,
  FileText,
  User,
  Shield,
  Sliders,
  CreditCard,
  BarChart,
  Users,
  Gift,
  Globe,
  Key,
  Activity,
  ScrollText,
  Bell,
  Gauge,
} from 'lucide-react';
import LogoutButton from '@/app/dashboard/logout-button';

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const isSuperuser = role === 'superuser';

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-primary/10 text-primary'
            : 'text-foreground opacity-70 hover:opacity-100 hover:bg-rule'
        }`}
      >
        <Icon size={18} />
        {label}
      </Link>
    );
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h4 className="px-3 text-xs font-bold uppercase tracking-wider opacity-50 mb-2">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );

  return (
    <aside className="w-64 bg-panel border-r border-rule h-screen overflow-y-auto flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
          PREZZY
        </Link>
      </div>

      <div className="flex-1 px-3">
        <Section title="Workspace">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/dashboard/wizard" icon={Wand2} label="Novo Projeto" />
          <NavItem href="/dashboard/projects" icon={FolderOpen} label="Projetos" />
          <NavItem href="/dashboard/templates" icon={FileText} label="Templates" />
          <NavItem href="/dashboard/templates/chat" icon={Wand2} label="Chat IA" />
          <NavItem href="/dashboard/brand-kit" icon={Palette} label="Brand Kit" />
        </Section>

        <Section title="Account">
          <NavItem href="/dashboard/settings/profile" icon={User} label="Perfil" />
          <NavItem href="/dashboard/settings/security" icon={Shield} label="Segurança" />
          <NavItem href="/dashboard/settings/preferences" icon={Sliders} label="Preferências" />
          <NavItem href="/dashboard/settings/credits" icon={CreditCard} label="Créditos" />
        </Section>

        {isSuperuser && (
          <>
            <Section title="Admin">
              <NavItem href="/dashboard/admin/overview" icon={BarChart} label="Visão Geral" />
              <NavItem href="/dashboard/admin/users" icon={Users} label="Usuários" />
              <NavItem href="/dashboard/admin/projects" icon={Globe} label="Projetos Globais" />
              <NavItem href="/dashboard/admin/api-keys" icon={Key} label="API Keys" />
              <NavItem href="/dashboard/admin/gifts" icon={Gift} label="Convites & Gifts" />
            </Section>

            <Section title="Observabilidade">
              <NavItem href="/dashboard/admin/events" icon={Activity} label="Eventos (Live)" />
              <NavItem href="/dashboard/admin/logs" icon={ScrollText} label="Audit Logs" />
              <NavItem href="/dashboard/admin/notifications" icon={Bell} label="Notificações" />
              <NavItem href="/dashboard/admin/performance" icon={Gauge} label="Performance" />
            </Section>
          </>
        )}
      </div>

      <div className="p-4 border-t border-rule mt-auto">
        <LogoutButton />
      </div>
    </aside>
  );
}

