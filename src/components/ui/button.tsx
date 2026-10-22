import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Button system.
 *
 * `primary` uses `--color-primary-strong` (#A81455), not the logo pink
 * (#FF0366): white-on-#FF0366 is 3.84:1 and fails WCAG AA for normal text,
 * while white-on-#A81455 reaches 7.25:1. The logo pink is reserved for
 * decoration and large display type.
 * See docs/design-tokens.md.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative isolate inline-flex items-center justify-center gap-2 text-center font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out disabled:pointer-events-none disabled:opacity-60 sm:whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary:
    "stt-btn-primary text-white hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "stt-btn-secondary border border-border-strong text-foreground hover:-translate-y-0.5 active:translate-y-0",
  ghost: "text-foreground hover:bg-primary-soft hover:text-primary-strong",
  inverse: "stt-btn-inverse shadow-soft hover:-translate-y-0.5 active:translate-y-0",
};

/**
 * `min-h` + vertical padding rather than a fixed height: a label that wraps on a
 * narrow screen grows the button instead of being clipped. The padding is sized
 * so a single-line label lands on exactly the intended height
 * (sm 36px, md 44px, lg 52px).
 *
 * There is deliberately no `whitespace-nowrap` at the base — see `base` above.
 * A nowrap label has a large `min-content` width, and inside a grid or flex item
 * that is enough to push the whole layout wider than a 360px phone.
 */
const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 rounded-full px-4 py-2 text-sm",
  md: "min-h-11 rounded-full px-5 py-2.5 text-[0.9375rem]",
  lg: "min-h-13 rounded-full px-7 py-3.5 text-base",
};

/** Light sweep that crosses the button once on hover. */
function Sheen() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 -translate-x-[120%] -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-[900ms] ease-out group-hover/btn:translate-x-[120%]"
    />
  );
}

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  /** Light sweep on hover. Defaults to on for `primary`. */
  sheen?: boolean;
};

function withSheen(show: boolean, children: ReactNode) {
  if (!show) return children;
  return (
    <>
      <Sheen />
      {children}
    </>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & CommonProps;

export function Button({
  variant = "primary",
  size = "md",
  sheen,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const showSheen = sheen ?? variant === "primary";
  return (
    <button
      type={type}
      data-focus-ring=""
      className={cn(buttonStyles(variant, size, className), showSheen && "group/btn overflow-hidden")}
      {...props}
    >
      {withSheen(showSheen, children)}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps & {
  href: string;
  /** Use a plain `<a>` (tel:, mailto:, external) instead of `next/link`. */
  external?: boolean;
};

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  sheen,
  className,
  children,
  external = false,
  ...props
}: ButtonLinkProps) {
  const showSheen = sheen ?? variant === "primary";
  const classes = cn(buttonStyles(variant, size, className), showSheen && "group/btn overflow-hidden");
  const rel = external ? "noopener noreferrer" : undefined;
  const target = external ? "_blank" : undefined;
  const body = withSheen(showSheen, children);

  if (external || href.startsWith("tel:") || href.startsWith("mailto:")) {
    return (
      <a
        href={href}
        className={classes}
        data-focus-ring=""
        rel={rel}
        target={target}
        {...props}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} data-focus-ring="" {...props}>
      {body}
    </Link>
  );
}
