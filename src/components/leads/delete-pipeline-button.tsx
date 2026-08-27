"use client";

import { deletePipelineAction } from "@/lib/actions";

export function DeletePipelineButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deletePipelineAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${name}? Leads on this treatment will move to another pipeline.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn danger" type="submit">
        Delete
      </button>
    </form>
  );
}
