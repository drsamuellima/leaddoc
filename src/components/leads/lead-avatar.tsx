import { initials } from "@/lib/leads";

export function LeadAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return <div className={`lead-avatar lead-avatar-${size}`}>{initials(name) || "?"}</div>;
}
