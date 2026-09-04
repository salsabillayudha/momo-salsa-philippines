# MOMO ✕ SALSA — Philippines, December 2026

A one-page trip hub for our 21-day Philippines adventure:

- **Live countdown** to Manila (Day 1)
- **Interactive map** (Leaflet + OpenStreetMap) showing both flights in — Dubai → Manila
  and Jakarta → Manila — plus the full island-hopping route and every stop
- **Day-by-day itinerary** across Palawan, Boracay, and the Visayas, each day broken
  down morning → night
- **Real photos** of every destination (Wikimedia Commons)
- A **booking checklist** that saves your progress in the browser

Built as a single `index.html`. The only external things it loads are Google Fonts,
Leaflet, OpenStreetMap tiles, and the destination photos — all free, all over HTTPS,
so it works locally and on GitHub Pages with no build step.

## `chat.html` — the conversation reader

A second page that turns a WhatsApp chat export back into a conversation you can
actually read: bubbles and tails, day dividers, grouped runs, media and location
placeholders, oversized emoji-only messages, `*bold*` / `_italic_` markup, edited
and deleted markers, light and dark, and a stats panel (who talked more, what was
sent, busiest day, longest streak, hours you two are awake, most-used emoji).

Open `chat.html`, drop your `_chat.txt` in (WhatsApp → **Chat → Export chat →
Without media**) and it renders. Tested on a 33,000-message export — it loads the
tail of the thread first and pulls in more as you scroll, so it stays smooth.

- ⌘/Ctrl + F searches the whole conversation; Enter / Shift+Enter walk the matches
- The ⋮ menu swaps which person sits on the right, jumps to the start or the end,
  and forgets the chat again
- The info panel has a jump-to-date box

**The chat stays on your device.** It is parsed in the browser and, so you don't
have to drop it in every time, kept in that browser's own IndexedDB — nothing is
uploaded and nothing is committed here. `.gitignore` already blocks `chat.txt` and
`*_chat*.txt` so an export dropped into this folder can't be pushed by accident.

## Edit the countdown date
Open `index.html`, find the line near the bottom that starts with `var DEPARTURE =`
and set it to the real Day-1 arrival date/time (Philippines time, `+08:00`).

♥ see you in Manila
