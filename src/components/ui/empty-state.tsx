import type { ReactNode } from "react";

export function EmptyState({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-5 py-10 text-center">
      {icon && <div className="text-4xl" aria-hidden>{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="max-w-md text-text-muted">{body}</p>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
