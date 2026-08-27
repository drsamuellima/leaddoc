"use client";

export function DeleteLeadButton({ leadId, name }: { leadId: string; name: string }) {
  return (
    <form
      action="/api/form/deleteLeads"
      method="post"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete ${name}'s lead? Chat history and follow-ups for this enquiry will also be removed.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="ids" value={leadId} />
      <button className="btn danger" type="submit">
        Delete
      </button>
    </form>
  );
}
