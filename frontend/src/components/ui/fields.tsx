import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
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

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(control, invalid && "border-accent", className)} {...rest} />;
}

export function Textarea({
  className,
  invalid,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn(control, "min-h-28 resize-y", invalid && "border-accent", className)} {...rest} />;
}

export function Select({
  className,
  invalid,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cn(control, "appearance-none pr-8", invalid && "border-accent", className)} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({
  className,
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-ink/80", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-ink"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}