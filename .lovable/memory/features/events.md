---
name: Event model and features
description: Multi-day events, day-part intervals, two-way time sync, invite members
type: feature
---
## Event date model
- `event_date` + optional `end_date` for multi-day events
- `day_part` kept for backward compat, new fields: `day_part_start`, `day_part_end`
- Valid day parts: morning, late_morning, afternoon, evening, night, all_day
- Constraint: end_date >= event_date
- Validation trigger for day_part values

## Shared time mapping (src/lib/dayParts.ts)
Single source of truth for day-part ↔ time conversions:
- morning: 06:00–09:00
- late_morning: 09:00–12:00
- afternoon: 12:00–18:00
- evening: 18:00–24:00
- night: 00:00–06:00
- all_day: 00:00–24:00

## Two-way sync in NewEventFlow
- Selecting day-part auto-sets startTime/endTime from mapping
- Changing time manually auto-updates selected day-part range
- "Last action wins" conflict resolution

## Timeline (ListView)
- Segment labels show short format: 06–09, 09–12, etc.
- Event bars show title only (no clock text)
- Segments use proportional widths based on hour spans

## Day-part interval selection (NewEventFlow step 1)
- Click one: select only that
- Click another: select range between
- Click active single: deselect all

## Multi-day UI
- Default: only start date shown
- "+1 dag" button adds/extends end_date
- End date can be removed with X button

## Query logic
- Events fetched by overlap: event_date <= end AND coalesce(end_date, event_date) >= start
- Calendar maps events to each day in their range

## Invite members
- Owner can create invite from ProfileSheet
- Uses `create_household_invite` RPC
- Shows code + expiry + copy button
