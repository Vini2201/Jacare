import Link from 'next/link';
import { ArrowRight, Sparkles, Layers, FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary">
      {/* Navbar */}
      <nav className="border-b border-rule backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(255,106,0,0.5)]">
              P
            </div>
            <span className="text-xl font-bold tracking-widest uppercase">Prezzy</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="px-6 py-2 rounded-lg font-medium hover:bg-panel transition-colors border border-transparent hover:border-rule">
              Entrar
            </Link>
            <Link href="/login" className="px-6 py-2 bg-primary hover:bg-accent text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-primary/25">
              ComeÃ§ar GrÃ¡tis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight tracking-tight">
            De um Briefing ao <span className="text-primary">Documento Perfeito</span>.
          </h1>
          <p className="text-xl md:text-2xl opacity-70 mb-12 max-w-2xl mx-auto leading-relaxed">
            PREZZY Ã© a sua agÃªncia de design autÃ´noma. Nossa InteligÃªncia Artificial lÃª seus PDFs, escreve o roteiro e gera o arquivo final na identidade da sua marca.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="px-8 py-4 bg-primary text-white hover:bg-accent rounded-xl font-bold text-lg transition-all shadow-[0_0_25px_rgba(255,106,0,0.3)] flex items-center justify-center gap-2">
              Acessar Workspace <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-panel border-y border-rule">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">A verdadeira geraÃ§Ã£o em massa.</h2>
            <p className="opacity-70 text-lg">Sem templates engessados. A IA se adapta Ã  sua marca.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-background border border-rule rounded-2xl hover:border-primary transition-colors group">
              <Sparkles className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Multi-Agent Pipeline</h3>
              <p className="opacity-70 leading-relaxed">Um batalhÃ£o de agentes (Researcher, Copywriter e Designer) trabalhando no seu projeto de forma assÃ­ncrona.</p>
            </div>
            <div className="p-8 bg-background border border-rule rounded-2xl hover:border-primary transition-colors group">
              <FileText className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">RAG Memory</h3>
              <p className="opacity-70 leading-relaxed">FaÃ§a o upload do seu histÃ³rico de planilhas e Word. O PREZZY nÃ£o inventa, ele lÃª a sua base de conhecimento real e processa via vetores.</p>
            </div>
            <div className="p-8 bg-background border border-rule rounded-2xl hover:border-primary transition-colors group">
              <Layers className="w-10 h-10 text-primary mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-3">Brand Kits</h3>
              <p className="opacity-70 leading-relaxed">Sua logo, suas cores, suas fontes. O motor visual injeta a sua identidade corporativa perfeitamente em cada slide ou pÃ¡gina.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

