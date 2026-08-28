type BrandLogoProps = {
  on: "light" | "dark";
  size?: "nav" | "auth" | "footer" | "sidebar" | "widget";
  className?: string;
};

const SRC = {
  light: "/brand/leaddr-on-light.png",
  dark: "/brand/leaddr-on-dark.png",
} as const;

export function BrandLogo({ on, size = "nav", className }: BrandLogoProps) {
  const cls = ["brand-logo", `brand-logo-${size}`, className].filter(Boolean).join(" ");
  return <img src={SRC[on]} alt="LeadDr." width={2237} height={541} decoding="async" className={cls} />;
}
