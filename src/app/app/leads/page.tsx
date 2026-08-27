import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui";
import { LeadListTable } from "@/components/leads/lead-list-table";
import { getClinicContext } from "@/lib/auth";
import { isLeadStatus, LEAD_STAGE_LABELS, LEAD_STATUSES } from "@/lib/leads";
import { readStore } from "@/lib/store";

const PAGE_SIZE = 8;

function hrefWith(params: { q?: string; status?: string; assigned?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.assigned) search.set("assigned", params.assigned);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `/app/leads?${qs}` : "/app/leads";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; assigned?: string; page?: string; ok?: string }>;
}) {
  const { q, status, assigned, page: pageRaw, ok } = await searchParams;
  const { org } = await getClinicContext();
  const store = await readStore();
  const query = (q || "").trim().toLowerCase();
  const staff = store.profiles.filter((p) => p.organizationId === org.id);
  const bots = store.chatbots.filter((b) => b.organizationId === org.id);

  const all = store.leads
    .filter((l) => l.organizationId === org.id)
    .filter((l) => {
      if (!query) return true;
      return `${l.name} ${l.email} ${l.phone} ${l.inquiry} ${l.status}`.toLowerCase().includes(query);
    })
    .filter((l) => {
      if (!status) return true;
      return l.status === status;
    })
    .filter((l) => {
      if (!assigned) return true;
      if (assigned === "unassigned") return !l.assignedTo;
      return l.assignedTo === assigned;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageRaw) || 1), totalPages);
  const leads = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filters = { q: query, status: status || "", assigned: assigned || "" };

  return (
    <div>
      <PageHeader
        kicker="Patient CRM"
        title="Patient leads"
        description="Every enquiry from your widget, ready for reception to follow up."
        action={<span className="lead-count-badge">{all.length} leads</span>}
      />
      {ok === "deleted" ? <p className="lead-flash">Selected leads were deleted.</p> : null}

      <form action="/app/leads" method="get" className="lead-toolbar page-enter">
        <input name="q" defaultValue={q || ""} placeholder="Search patients, emails, reasons…" />
        <select name="status" defaultValue={status && isLeadStatus(status) ? status : ""}>
          <option value="">All stages</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <select name="assigned" defaultValue={assigned || ""}>
          <option value="">All staff</option>
          <option value="unassigned">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="btn secondary" type="submit">
          Filter
        </button>
      </form>

      <div className="lead-chips">
        <Link href={hrefWith({ q: query, assigned: filters.assigned })} className={!status ? "active" : undefined}>
          All
        </Link>
        {LEAD_STATUSES.map((s) => (
          <Link
            key={s}
            href={hrefWith({ q: query, status: s, assigned: filters.assigned })}
            className={status === s ? "active" : undefined}
          >
            {LEAD_STAGE_LABELS[s]}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="table-wrap page-enter">
          <EmptyState
            title="No patient leads yet"
            body="When a visitor submits the chat form, they appear here as an enquiry to follow up."
          />
        </div>
      ) : (
        <LeadListTable
          leads={leads.map((lead) => ({
            id: lead.id,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            inquiry: lead.inquiry,
            status: lead.status,
            followUpAt: lead.followUpAt,
            source: bots.find((b) => b.id === lead.chatbotId)?.name ?? "Widget",
            owners: staff.filter((s) => s.id === lead.assignedTo).map((s) => ({ id: s.id, name: s.name })),
          }))}
        />
      )}

      {all.length > PAGE_SIZE ? (
        <div className="lead-pager">
          {page > 1 ? (
            <Link className="btn secondary" href={hrefWith({ ...filters, page: page - 1 })}>
              Previous
            </Link>
          ) : (
            <span className="btn secondary lead-pager-disabled">Previous</span>
          )}
          <span className="text-sm text-neutral-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link className="btn secondary" href={hrefWith({ ...filters, page: page + 1 })}>
              Next
            </Link>
          ) : (
            <span className="btn secondary lead-pager-disabled">Next</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
