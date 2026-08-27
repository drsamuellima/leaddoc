import { LeadAvatar } from "./lead-avatar";
import type { Profile } from "@/lib/types";

export function StaffAvatars({ people }: { people: Profile[] }) {
  if (people.length === 0) {
    return <span className="lead-unassigned">Unassigned</span>;
  }
  return (
    <div className="lead-avatars" title={people.map((p) => p.name).join(", ")}>
      {people.map((person) => (
        <LeadAvatar key={person.id} name={person.name} size="sm" />
      ))}
    </div>
  );
}
