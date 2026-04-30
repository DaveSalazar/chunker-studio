import type { ReactNode } from "react";

export interface DialogSectionProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}

export function DialogSection({ icon, title, description, children }: DialogSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div>{children}</div>
    </section>
  );
}
