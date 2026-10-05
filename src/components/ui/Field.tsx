import { forwardRef } from "react";

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-muted/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className = "", ...rest }, ref) {
  return <input ref={ref} className={`${inputClass} ${className}`} {...rest} />;
});

export function Label({ children, hint, htmlFor }: { children: React.ReactNode; hint?: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px] font-medium text-text">
      <span>{children}</span>
      {hint && <span className="font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-3 rounded-lg bg-[#b42318]/8 px-3 py-2 text-[13px] text-[#b42318] dark:text-[#ff8a80]">
      {children}
    </p>
  );
}
