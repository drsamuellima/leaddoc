# Public chat widget

The embeddable chat clinics put on their own websites. Visitors never log in. They are identified only by a widget key.

How access, preview, and billing interact: [architecture.md](../architecture.md). Studio UI: [clinic-app.md](clinic-app.md#appchatbotsid). HTTP: [apis.md](../apis.md).

## /w/[widgetKey]

**File:** `src/app/w/[widgetKey]/page.tsx`  
**Client UI:** `chat-widget.tsx`, skins in `widget-skins.tsx`, fonts in `widget-fonts.ts`  
**Layout:** `layout.tsx` (transparent page, widget font class)  
**Who:** anyone with a valid widget key (clinic website iframe, or studio preview)

The chat UI itself. `loadWidget` finds that chatbot and its organisation by widget key (not the whole database). Treatment buttons load for that bot only. If the bot is missing, the page 404s.

**Live (not preview):** the widget is hidden behind “this chat is temporarily unavailable” unless the clinic may serve chat (`active` / `trialing` subscription, or admin widget exception). Inactive bots are not loaded.

**Visitor flow:**

1. Closed launcher in the chosen corner — bottom right (default) or bottom left. On a live site the iframe is a small square in that corner; the button sits in the iframe’s matching bottom corner. After a short beat the panel grows open from that corner (the iframe resizes with the same motion). If the visitor closes it, it stays closed for that browser tab. Studio preview always plays the open animation.
2. Opened panel is a compact card in that same corner — not a full-page column. It greets the visitor (one or more greetings) and shows treatment buttons. On a phone it is nearly full width but still inset so the clinic site stays visible around it.
3. Buttons are **lead** (start a chat about that treatment), **book** (open the booking URL), or **call** (tel: the practice phone). Phone and booking URL fall back from bot → organisation.
4. Before chatting, the visitor must submit **name, email, phone, and enquiry**. That posts to `/api/widget/lead` and creates the CRM lead plus first AI reply.
5. Further messages post to `/api/widget/chat`.

**Skins** (every skin still does lead, book, call, and chat): orbital, glass, sheet, messenger, dock, pulse. Each skin ships a modern suggested colour palette (accent, panel, ink, surface, bubbles, launcher). Clinics can mix any palette with any skin. A compact official LeadDr. wordmark sits on the panel instead of a “By LeadDoc” text badge. Clinic avatars and colours stay the practice’s branding.

**Preview** (`?preview=1`, used by the studio): inactive bots are allowed; the launcher appears then the panel auto-opens with the same grow animation as the live embed; query params can overlay colours, font, skin, and location without saving. Preview must not be treated as a real visitor session for production traffic.

**Reads/writes:** reads chatbot, options, org branding. Writes happen via the widget APIs (lead, conversation, messages, notification, email).

## /widget.js

**File:** `src/app/widget.js/route.ts`  
**Who:** any website that includes the snippet (CORS `*`)

The loader script clinics paste on their site:

```html
<script src="https://your-origin/widget.js" data-widget-key="dc_..." async></script>
```

It reads `data-widget-key`, attaches a transparent iframe (`#dentchat-widget`) to the page root (the `html` element, or `body` only if `html` itself would trap `position: fixed`), and points it at `/w/{key}`. It listens for `postMessage` from the iframe (`source: "dentchat"`, types `open` / `close`, plus `position`) so the iframe can sit on the left or right. Open and close resize the iframe with a short ease, unless the visitor prefers reduced motion.

The loader does not trust CSS `position: fixed` alone. Some clinic sites put `transform`, `filter`, `perspective`, `contain`, or `will-change` on an ancestor; that makes “fixed” stick to a grey band or header instead of the real viewport. WordPress themes also style every `iframe` (for example a 3rem vertical margin, or `width: 100%`). Those rules would shove the chat off the bottom of the screen or stretch it. The script therefore sets its own pixel box with `!important`: no margin or padding, explicit `top` / `left` / `width` / `height`. It applies those isolation styles once and only updates the box when the size or corner changes, so a busy host page cannot keep restarting the iframe load. Closed: about 80×80 in the chosen corner (the 56px launcher plus padding). Open: a card up to 400×650, never wider than the viewport minus 32px (24px on a phone), and never taller than the viewport minus about 100px (80px on a phone). It is inset 20px on desktop and 12px on a phone — not a full-viewport stretch from the top. It recalculates on resize, scroll, visual-viewport changes, and orientation change. Existing snippets that only set `data-widget-key` keep working.

The script is generated with the public site origin: a non-local `NEXT_PUBLIC_APP_URL`, the incoming host, or the Vercel production domain. Localhost is only used in local demo. Cached for 60 seconds.

**Reads/writes:** none on the store. GET only.

**Related:** [lead](../apis.md#apiwidgetlead) and [chat](../apis.md#apiwidgetchat) APIs.
