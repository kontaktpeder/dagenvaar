# Project Memory

## Core
Norsk-språklig kalender-app. Lys pastell, hvit bg, runde former, app-feel.
Nunito headings, DM Sans body. Aldri mørkt tema.
Supabase med RLS. Husholdning-basert deling.
Kun tre nav-faner: Kalender, Ny (+), Liste. Profil via avatar-ikon i header.
Ikke enterprise-kalender. Enkel, myk, personlig.
Grønn knapp (bg-green-200) for primær handling i event-flow. Blå (calendar-accent) for progress/valg.

## Memories
- [Design system](mem://design/tokens) — Pastel palette, member colors, day part colors, fonts, radius, shadows
- [App structure](mem://features/structure) — Calendar month/year, list=day view, 4-step event creation (category→title→when→visibility)
- [Data model](mem://features/data) — households, members, events (multi-day: end_date, day_part_start/end), list_items, event_comments with visibility
- [Event model](mem://features/events) — Multi-day support, day-part interval selection, invite from ProfileSheet
