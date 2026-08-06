import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "PREZZY — Geração de Documentos com IA",
  description:
    "Plataforma SaaS de geração automatizada de apresentações e eBooks com Inteligência Artificial, RAG e multi-agentes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <div className="fixed bottom-6 right-6 z-50 bg-panel border border-rule shadow-lg rounded-full p-1">
          <ThemeToggle />
        </div>
      </body>
    </html>
  );
}
