import { type ReactNode } from "react";

interface PageSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageSection({ title, action, children }: PageSectionProps) {
  return (
    <section className="page-section">
      <div className="section-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

