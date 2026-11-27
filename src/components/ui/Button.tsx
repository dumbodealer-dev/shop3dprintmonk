import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline-dark" | "ghost" | "dark" | "plain";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background,color,border,transform] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-ink-950 hover:bg-accent-soft shadow-[0_6px_24px_-10px_rgb(44_198_238/0.7)]",
  dark: "bg-ink-900 text-white hover:bg-ink-700",
  secondary: "border border-line bg-white text-text hover:border-ink-300 hover:bg-paper",
  "outline-dark": "border border-ink-600 text-white hover:border-accent hover:text-accent",
  ghost: "text-accent-ink hover:text-text",
  plain: "",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

type LinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({ variant = "primary", size = "md", className = "", children, ...props }: LinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

type BtnProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant = "primary", size = "md", className = "", ...props }: BtnProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
