"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { HeroChat } from "./hero-chat";

const treatments = [
  "Invisalign",
  "Whitening",
  "Implants",
  "Hygiene",
  "Emergency",
  "Composite bonding",
  "NHS & private",
  "New patients",
];

export function MarketingHome() {
  const loop = [...treatments, ...treatments];

  return (
    <div className="mkt">
      <header className="mkt-nav">
        <Link href="/" className="no-underline">
          <BrandLogo on="light" size="nav" />
        </Link>
        <nav className="mkt-nav-links max-md:hidden">
          <a href="#product">Product</a>
          <a href="#growth">Growth</a>
          <a href="#preview">Live chat</a>
        </nav>
        <div className="flex gap-2">
          <Link href="/login" className="btn ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn lime">
            Start free clinic
          </Link>
        </div>
      </header>

      <section className="mkt-hero">
        <div className="mkt-orbs" />
        <div className="relative">
          <p className="mkt-kicker">Innovative AI for dental clinics</p>
          <h1>
            The receptionist that <em>never clocks off.</em>
          </h1>
          <p className="mkt-lead">
            LeadDoc is ChatGPT for your practice website — trained on your treatments, FAQs and voice. It greets
            visitors, captures the enquiry, and drops a lead in your CRM before reception opens.
          </p>
          <div className="mkt-actions">
            <Link href="/signup" className="btn lime">
              Grow my clinic
            </Link>
            <a href="#preview" className="btn ghost">
              Watch it talk
            </a>
          </div>
          <p className="mkt-note">One snippet on WordPress or any site. Live in an afternoon. Cancel anytime.</p>
        </div>
        <HeroChat />
      </section>

      <div className="mkt-marquee" aria-hidden>
        <div className="mkt-marquee-track">
          {loop.map((item, i) => (
            <span key={`${item}-${i}`}>✦ {item}</span>
          ))}
        </div>
      </div>

      <section className="mkt-section" id="growth">
        <p className="mkt-kicker">Growth, not just a widget</p>
        <h2 className="mt-3 max-w-2xl">Turn quiet hours into booked consults.</h2>
        <p className="mkt-muted mt-3 max-w-xl">
          Most clinic sites lose the visitor who arrives at 9pm. LeadDoc answers immediately, asks the right questions,
          and hands your team a named lead — not a missed call.
        </p>
        <div className="mkt-stats mt-10">
          {[
            ["3×", "more after-hours enquiries captured vs a contact form"],
            ["< 3s", "to first reply — visitors stay instead of bouncing"],
            ["1", "script tag. No WordPress plugin stack to maintain"],
            ["100%", "your brand, colours, Linda (or your own avatar)"],
          ].map(([stat, label]) => (
            <div key={stat} className="mkt-stat">
              <b>{stat}</b>
              <p className="mkt-muted mt-2 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section" id="product">
        <div className="mkt-grid three">
          {[
            ["Your clinic’s GPT", "System prompt, FAQs and treatment buttons you control. No generic medical chatbot."],
            ["Leads, not chat logs", "Name, email, phone and enquiry land in a pipeline with follow-ups and assignment."],
            ["Book or call in one tap", "Invisalign, emergency, whitening — open Dentally or dial the practice number."],
          ].map(([title, body]) => (
            <div key={title} className="mkt-card lift">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mkt-muted mt-2 text-sm">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-section" id="preview">
        <p className="mkt-kicker">Preview</p>
        <h2 className="mt-3 max-w-2xl">Same chat your patients will see.</h2>
        <p className="mkt-muted mt-3 max-w-xl">
          This is a static preview of the LeadDoc widget: sequential greetings, treatment grid, then a lead form. Your
          live clinic uses the same skins after you finish setup.
        </p>
        <div className="mkt-actions">
          <Link href="/signup" className="btn lime">
            Put this on my site
          </Link>
          <Link href="/login" className="btn ghost">
            Log in
          </Link>
        </div>
        <div className="mkt-browser mt-8">
          <div className="mkt-chrome">
            <span className="mkt-dot" />
            <span className="mkt-dot" />
            <span className="mkt-dot" />
            <span className="ml-3">eadental.example / book</span>
          </div>
          <div className="mkt-site">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">EA Dental Specialists</p>
            <h3 className="mt-2 max-w-xs text-2xl font-semibold tracking-tight">Smile with a team that answers tonight.</h3>
            <p className="mt-2 max-w-sm text-sm text-neutral-600">
              Hygiene, Invisalign, whitening and emergencies. Use the chat — Linda is on it.
            </p>
            <div className="mt-6">
              <HeroChat />
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-grid three">
          {[
            ["01", "Brand it", "Name, colours, avatar, greetings and treatments in the dashboard."],
            ["02", "Paste one tag", "WordPress HTML block, Webflow, or any footer. Hosted by us."],
            ["03", "Follow the lead", "Pipeline, notes and reminders — then grow the diary."],
          ].map(([n, title, body]) => (
            <div key={n} className="mkt-card">
              <div className="text-sm font-semibold text-[#14382c]">{n}</div>
              <h3 className="mt-2 text-lg font-semibold">{title}</h3>
              <p className="mkt-muted mt-2 text-sm">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-cta">
        <p className="mkt-kicker">Ready when they are</p>
        <h2 className="mx-auto mt-3 max-w-xl">Every unread enquiry is a chair sitting empty.</h2>
        <p className="mkt-muted mx-auto mt-3 max-w-lg">
          Start a clinic workspace, drop the snippet, and let AI take the first conversation. Your team takes the
          booking.
        </p>
        <div className="mkt-actions justify-center">
          <Link href="/signup" className="btn lime">
            Create your clinic
          </Link>
          <Link href="/login" className="btn ghost">
            Log in
          </Link>
        </div>
      </section>

      <footer className="mkt-footer">
        <BrandLogo on="light" size="footer" />
        <span>AI software for dental clinics. © {new Date().getFullYear()}</span>
        <span className="flex gap-3 text-sm">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
