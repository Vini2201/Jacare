export default function Page() {
  return (
    <div className="p-8">
      <div className="max-w-3xl rounded-2xl border border-rule bg-panel p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-50 mb-3">Settings</p>
        <h1 className="text-3xl font-bold mb-3">Preferências</h1>
        <p className="opacity-70 leading-relaxed mb-6">
          Aqui vão ficar idioma, tema, formato padrão de exportação e preferências de geração.
          Ainda não existe backend específico para isso, então a tela foi deixada propositalmente simples.
        </p>
        <div className="rounded-xl border border-rule bg-background p-4 text-sm opacity-70">
          Próximo passo recomendado: persistir preferências em `user_profiles` ou numa tabela dedicada.
        </div>
      </div>
    </div>
  );
}

