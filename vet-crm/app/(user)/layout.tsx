"use client";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-[color:var(--background)] transition-colors">
      <main className="flex-1 w-full overflow-auto">
        {children}
      </main>
    </div>
  );
}
