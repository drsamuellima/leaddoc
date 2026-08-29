import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { DeletePipelineButton } from "@/components/leads/delete-pipeline-button";
import { getClinicContext } from "@/lib/auth";
import { createPipelineAction } from "@/lib/actions";
import { readClinicStore } from "@/lib/store";

export default async function PipelinesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const { org } = await getClinicContext();
  const store = await readClinicStore(org.id, "pipelines");
  const pipelines = store.pipelines.filter((p) => p.organizationId === org.id);
  const counts = Object.fromEntries(
    pipelines.map((p) => [p.id, store.leads.filter((l) => l.pipelineId === p.id).length]),
  );

  return (
    <div>
      <PageHeader
        kicker="Patient CRM"
        title="Treatment pipelines"
        description="Each treatment has its own stages. Assign a lead to a pipeline from the list or the record."
      />
      {ok === "created" ? <p className="lead-flash">Pipeline created.</p> : null}
      {ok === "deleted" ? <p className="lead-flash">Pipeline deleted. Leads were moved to another treatment.</p> : null}

      <form action={createPipelineAction} className="card lead-toolbar page-enter" style={{ marginBottom: 16 }}>
        <input name="name" required placeholder="Treatment name, e.g. Whitening" />
        <button className="btn" type="submit">
          Create pipeline
        </button>
      </form>

      {pipelines.length === 0 ? (
        <div className="table-wrap">
          <EmptyState title="No pipelines" body="Create a treatment pipeline to start tracking stages." />
        </div>
      ) : (
        <div className="table-wrap page-enter">
          <table>
            <thead>
              <tr>
                <th>Treatment</th>
                <th>Stages</th>
                <th>Leads</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pipelines.map((pipeline) => (
                <tr key={pipeline.id}>
                  <td>
                    <Link href={`/app/pipelines/${pipeline.id}`} className="font-semibold hover:underline">
                      {pipeline.name}
                    </Link>
                  </td>
                  <td className="text-neutral-600">
                    {pipeline.stages
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((s) => s.name)
                      .join(" → ")}
                  </td>
                  <td>{counts[pipeline.id] || 0}</td>
                  <td>
                    {pipelines.length > 1 ? (
                      <DeletePipelineButton id={pipeline.id} name={pipeline.name} />
                    ) : (
                      <span className="text-sm text-neutral-400">Keep at least one</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
