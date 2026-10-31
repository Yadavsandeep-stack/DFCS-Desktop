import { Loader2 } from "lucide-react";
import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Input with floating label + neon focus ring expansion. */
export function NeonField({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined }) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const filled = String(props.value ?? "").length > 0;
  const raised = focused || filled;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          id={id}
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          placeholder=""
          className={cn(
            "peer h-14 w-full rounded-xl border border-input bg-secondary/40 px-4 pt-5 pb-1.5 text-sm text-foreground outline-none transition-all duration-300",
            "focus:border-primary/60 focus:bg-secondary/60 focus:ring-4 focus:ring-primary/25",
            error && "border-destructive/60 focus:ring-destructive/25",
            className,
          )}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-4 text-muted-foreground transition-all duration-200",
            raised ? "top-2 text-[11px] tracking-wide uppercase" : "top-4 text-sm",
            focused && "text-primary",
          )}
        >
          {label}
        </label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function GlowButton({
  children,
  loading,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "ghost" | "outline";
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -1 }}
      {...(props as object)}
      disabled={props.disabled || loading}
      className={cn(
        "light-sweep inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold tracking-wide transition-all duration-300 disabled:opacity-60",
        variant === "primary" &&
          "bg-gradient-primary text-primary-foreground hover:shadow-glow",
        variant === "outline" &&
          "border border-glass-border bg-secondary/40 text-foreground hover:border-primary/50",
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </motion.button>
  );
}

export function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    approved: "border-success/40 bg-success/10 text-success",
    pending: "border-warning/40 bg-warning/10 text-warning",
    rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase",
        map[status],
      )}
    >
      {status}
    </span>
  );
}

export function GlassAlert({
  tone = "info",
  title,
  description,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
}) {
  const tones = {
    info: "border-primary/35 bg-primary/10",
    success: "border-success/35 bg-success/10",
    warning: "border-warning/35 bg-warning/10",
    error: "border-destructive/35 bg-destructive/10",
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "rounded-xl border px-4 py-3 backdrop-blur-xl",
        tones[tone],
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </motion.div>
  );
}
