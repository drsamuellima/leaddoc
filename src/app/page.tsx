import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-full bg-[var(--canvas)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="dash-mark">D</div>
          <div className="text-lg font-bold tracking-tight">DentChat</div>
        </div>
        <nav className="flex gap-2">
          <Link href="/login" className="btn secondary">
            Log in
          </Link>
          <Link href="/signup" className="btn">
            Start free clinic
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="page-enter overflow-hidden rounded-[32px] bg-white px-8 py-14 shadow-[var(--shadow)] md:px-16">
          <p className="page-kicker">For dental practices</p>
          <h1 className="mt-3 max-w-2xl text-5xl font-semibold tracking-tight">
            Your own AI clinic chatbot, as a monthly subscription.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-neutral-500">
            Build branded widgets, drop a snippet on WordPress, capture name, email, phone and enquiry as CRM leads, and
            get notified on every conversation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn">
              Create your clinic
            </Link>
            <Link href="/login" className="btn secondary">
              Demo logins
            </Link>
          </div>
        </div>
        <div className="stagger mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Widget on any site", "Copy one script tag. The chat runs on our cloud, not on WordPress hosting."],
            ["Leads CRM", "Every visitor fills in contact details. Pipeline, assignment and follow-ups live in your dashboard."],
            ["Platform admin", "Add clinics, connect Stripe, charge cards, and edit any practice’s chatbots and leads."],
          ].map(([title, body]) => (
            <div key={title} className="card lift">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-neutral-500">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
