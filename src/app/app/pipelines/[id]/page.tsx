import { notFound } from "next/navigation";
import { BackLink, PageHeader } from "@/components/ui";
import { getClinicContext } from "@/lib/auth";
import {
  addPipelineStageAction,
  deletePipelineStageAction,
  updatePipelineAction,
  updatePipelineStageAction,
} from "@/lib/actions";
import { readStore } from "@/lib/store";
import { sortedStages } from "@/lib/pipelines";

export default async function PipelineDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  const { org } = await getClinicContext();
  const store = await readStore();
  const pipeline = store.pipelines.find((p) => p.id === id && p.organizationId === org.id);
  if (!pipeline) notFound();
  const stages = sortedStages(pipeline);
  const leadCount = store.leads.filter((l) => l.pipelineId === pipeline.id).length;

  return (
    <div>
      <BackLink href="/app/pipelines">All pipelines</BackLink>
      <PageHeader
        kicker="Treatment pipeline"
        title={pipeline.name}
        description={`${leadCount} lead${leadCount === 1 ? "" : "s"} on this pathway.`}
      />
      {ok === "saved" ? <p className="lead-flash">Pipeline updated.</p> : null}

      <form action={updatePipelineAction} className="card space-y-3 page-enter" style={{ marginBottom: 16, maxWidth: 520 }}>
        <input type="hidden" name="id" value={pipeline.id} />
        <div>
          <label>Treatment name</label>
          <input name="name" defaultValue={pipeline.name} required />
        </div>
        <button className="btn" type="submit">
          Save name
        </button>
      </form>

      <section className="card page-enter">
        <h2 className="mb-4 font-semibold">Stages</h2>
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.id} className="lead-stage-row">
              <span className="lead-stage-index">{index + 1}</span>
              <form action={updatePipelineStageAction} className="lead-stage-edit">
                <input type="hidden" name="id" value={pipeline.id} />
                <input type="hidden" name="stageId" value={stage.id} />
                <input name="stageName" defaultValue={stage.name} required />
                <button className="btn secondary" type="submit">
                  Rename
                </button>
              </form>
              {stages.length > 1 ? (
                <form action={deletePipelineStageAction}>
                  <input type="hidden" name="id" value={pipeline.id} />
                  <input type="hidden" name="stageId" value={stage.id} />
                  <button className="btn danger" type="submit">
                    Remove
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
        <form action={addPipelineStageAction} className="lead-toolbar" style={{ marginTop: 16 }}>
          <input type="hidden" name="id" value={pipeline.id} />
          <input name="stageName" required placeholder="Add a stage, e.g. Deposit taken" />
          <button className="btn" type="submit">
            Add stage
          </button>
        </form>
      </section>
    </div>
  );
}
