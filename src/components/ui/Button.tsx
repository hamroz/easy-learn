import { forwardRef } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-ui font-medium transition-[background,color,box-shadow,transform,opacity] duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-text text-bg hover:opacity-90 shadow-sm",
  secondary: "bg-surface text-text border border-border hover:border-muted/60",
  ghost: "text-muted hover:text-text hover:bg-border/40",
  danger: "text-[#b42318] hover:bg-[#b42318]/10",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-[15px] rounded-2xl",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className = "", children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
});
