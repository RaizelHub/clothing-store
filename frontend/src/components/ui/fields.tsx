import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full border border-stone-300 bg-transparent px-3 py-3 text-sm text-ink placeholder:text-stone-400 transition-colors duration-200 ease-editorial focus:border-ink focus:outline-none disabled:opacity-50";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}

export function Field({ label, error, hint, optional, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs uppercase tracking-widest text-stone-500">
        {label}
        {optional && <span className="normal-case tracking-normal text-stone-400">optional</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-accent">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-stone-400">{hint}</span>
      ) : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => {
    return <input ref={ref} className={cn(control, invalid && "border-accent", className)} {...rest} />;
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...rest }, ref) => {
    return <textarea ref={ref} className={cn(control, "min-h-28 resize-y", invalid && "border-accent", className)} {...rest} />;
  }
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  ({ className, invalid, children, ...rest }, ref) => {
    return (
      <select ref={ref} className={cn(control, "appearance-none pr-8", invalid && "border-accent", className)} {...rest}>
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ className, label, ...rest }, ref) => {
    return (
      <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-ink/80", className)}>
        <input
          ref={ref}
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-ink"
          {...rest}
        />
        <span>{label}</span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";