"use client";

import React from "react";
import { cn } from "@/shared/lib/utils";

// ── Button ────────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "coral" | "yellow" | "ghost" | "danger";
type ButtonSize    = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   "evo-btn-primary",
  secondary: "evo-btn-secondary",
  coral:     "evo-btn-coral",
  yellow:    "evo-btn-coral",
  ghost:     "evo-btn-ghost",
  danger:    "evo-btn-danger",
};
const sizeClasses: Record<ButtonSize, string> = {
  sm: "evo-btn-sm",
  md: "",
  lg: "evo-btn-lg",
  xl: "evo-btn-xl",
};

export function Button({
  variant = "primary",
  size    = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn("evo-btn", variantClasses[variant], sizeClasses[size], className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size === "xl" || size === "lg" ? "md" : "sm"} />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };
  return (
    <svg
      className={cn("animate-spin", sizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, glass, hover = true, onClick }: CardProps) {
  return (
    <div
      className={cn(glass ? "evo-card-glass" : "evo-card", !hover && "hover:transform-none hover:shadow-none hover:border-[#315BFF]/25", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="evo-label">
          {label}
          {props.required && <span className="text-[#FF5370] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A98C0] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            "evo-input",
            leftIcon  && "pl-10",
            rightIcon && "pr-10",
            error     && "error",
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A98C0] pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-[#FF5370] text-xs mt-0.5" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-[#8A98C0] text-xs mt-0.5">
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

type BadgeVariant = "teal" | "coral" | "lime" | "violet" | "yellow" | "green" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  teal:   "evo-badge-teal",
  coral:  "evo-badge-coral",
  lime:   "evo-badge-teal",
  violet: "evo-badge-teal",
  yellow: "evo-badge-coral",
  green:  "evo-badge-teal",
  muted:  "evo-badge-muted",
};

export function Badge({ children, variant = "teal", className }: BadgeProps) {
  return (
    <span className={cn("evo-badge", badgeVariants[variant], className)}>
      {children}
    </span>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────

type AlertVariant = "error" | "success" | "info" | "warning";

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const alertVariants: Record<AlertVariant, string> = {
  error:   "evo-alert-error",
  success: "evo-alert-success",
  info:    "evo-alert-info",
  warning: "evo-alert-warning",
};

export function Alert({ variant = "info", children, className, icon }: AlertProps) {
  return (
    <div className={cn("evo-alert", alertVariants[variant], className)} role="alert">
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn("border-0 border-t border-[#315BFF]/20 my-6 sm:my-8", className)} />;
  return (
    <div className={cn("flex items-center gap-3 my-6 sm:my-8", className)}>
      <hr className="flex-1 border-0 border-t border-[#315BFF]/20 my-0" />
      <span className="text-xs font-mono uppercase tracking-wider text-[#8A98C0] shrink-0">{label}</span>
      <hr className="flex-1 border-0 border-t border-[#315BFF]/20 my-0" />
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const avatarSizes = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-14 h-14 text-xl",
  xl: "w-20 h-20 text-2xl",
};

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 font-bold select-none",
        avatarSizes[size],
        !src && "bg-[#182352] text-[#39DFFF] border border-[#315BFF]/40 shadow-[0_0_12px_rgba(49,91,255,0.2)]",
        className,
      )}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className, lines = 1 }: SkeletonProps) {
  if (lines === 1) {
    return <div className={cn("evo-skeleton h-4 w-full rounded", className)} />;
  }
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn("evo-skeleton h-4 rounded", i === lines - 1 ? "w-3/4" : "w-full", className)}
        />
      ))}
    </div>
  );
}

// ── EvoID display ─────────────────────────────────────────────────────────────

export function EvoIdBadge({ id, className }: { id: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg",
        "bg-[#101638] border border-[#315BFF]/35",
        "text-[#39DFFF] text-xs font-mono font-bold tracking-wider shadow-[0_0_8px_rgba(57,223,255,0.15)]",
        className,
      )}
    >
      {id}
    </span>
  );
}
