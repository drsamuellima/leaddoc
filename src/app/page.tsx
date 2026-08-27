import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-full bg-[#f4f7f6]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="text-lg font-semibold tracking-tight text-teal-800">DentChat</div>
        <nav className="flex gap-3">
          <Link href="/login" className="btn secondary">
            Log in
          </Link>
          <Link href="/signup" className="btn">
            Start free clinic
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">For dental practices</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900">
          Your own AI clinic chatbot, as a monthly subscription.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          Build branded widgets, drop a snippet on WordPress, capture name, email, phone and enquiry as CRM leads, and
          get notified on every conversation.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="btn">
            Create your clinic
          </Link>
          <Link href="/login" className="btn secondary">
            Demo logins
          </Link>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            ["Widget on any site", "Copy one script tag. The chat runs on our cloud, not on WordPress hosting."],
            ["Leads CRM", "Every visitor fills in contact details. Pipeline, assignment and follow-ups live in your dashboard."],
            ["Platform admin", "Add clinics, connect Stripe, charge cards, and edit any practice’s chatbots and leads."],
          ].map(([title, body]) => (
            <div key={title} className="card">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
