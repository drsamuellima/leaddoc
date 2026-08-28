"use client";

import { adminDeleteChatbotAction, deleteChatbotAction } from "@/lib/actions";

export function DeleteChatbotButton(props: {
  id: string;
  name: string;
  organizationId?: string;
  className?: string;
  label?: string;
}) {
  const label = props.name === "New chatbot" ? "this untitled chatbot" : props.name;
  return (
    <form
      action={props.organizationId ? adminDeleteChatbotAction : deleteChatbotAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete ${label}? The widget snippet will stop working. Patient leads stay in the CRM.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={props.id} />
      {props.organizationId ? <input type="hidden" name="organizationId" value={props.organizationId} /> : null}
      <button className={props.className || "btn danger tiny"} type="submit">
        {props.label || "Delete"}
      </button>
    </form>
  );
}
