interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
        API Manager
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 [text-wrap:pretty]">
        {description}
      </p>
    </header>
  );
}
