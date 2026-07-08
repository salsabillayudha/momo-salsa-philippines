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

## Edit the countdown date
Open `index.html`, find the line near the bottom that starts with `var DEPARTURE =`
and set it to the real Day-1 arrival date/time (Philippines time, `+08:00`).

♥ see you in Manila
