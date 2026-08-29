"use client";

import { useFormStatus } from "react-dom";
import { createChatbotAction } from "@/lib/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Opening setup…" : "Set up with AI"}
    </button>
  );
}

export function CreateChatbotButton() {
  return (
    <form action={createChatbotAction}>
      <Submit />
    </form>
  );
}
