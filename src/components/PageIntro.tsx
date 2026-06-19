import type { ReactNode } from "react";

type PageIntroProps = {
  title: string;
  description: string;
  children?: ReactNode;
  wide?: boolean;
};

export default function PageIntro({ title, description, children, wide = false }: PageIntroProps) {
  return (
    <main className={`mx-auto min-h-[calc(100vh-145px)] px-6 py-16 ${wide ? "max-w-[92rem]" : "max-w-6xl"}`}>
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900 sm:p-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-600">
          Property Rental
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
          {description}
        </p>
        {children && <div className="mt-10">{children}</div>}
      </section>
    </main>
  );
}
