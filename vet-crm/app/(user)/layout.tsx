"use client";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-[color:var(--background)] transition-colors">
      {/* SEM overflow aqui: como não há altura fixa, esse container nunca rolava (a janela rola),
          mas o overflow-auto QUEBRAVA o position:sticky de todas as telas (cabeçalhos, sala de espera). */}
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}
