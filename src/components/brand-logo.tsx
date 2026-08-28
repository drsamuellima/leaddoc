type BrandLogoProps = {
  on: "light" | "dark";
  size?: "nav" | "auth" | "footer" | "sidebar" | "widget";
  className?: string;
};

const SRC = {
  light: "/brand/leaddr-on-light.png?v=7",
  dark: "/brand/leaddr-on-dark.png?v=7",
} as const;

export function BrandLogo({ on, size = "nav", className }: BrandLogoProps) {
  const cls = ["brand-logo", `brand-logo-${size}`, className].filter(Boolean).join(" ");
  return <img src={SRC[on]} alt="LeadDr." width={1024} height={248} decoding="async" className={cls} />;
}
