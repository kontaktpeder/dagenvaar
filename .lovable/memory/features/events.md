---
name: Event model and features
description: Multi-day events, day-part intervals, invite members from app
type: feature
---
## Event date model
- `event_date` + optional `end_date` for multi-day events
- `day_part` kept for backward compat, new fields: `day_part_start`, `day_part_end`
- Valid day parts: morning, late_morning, afternoon, evening, night, all_day
- Constraint: end_date >= event_date
- Validation trigger for day_part values

## Day-part interval selection (NewEventFlow step 3)
- Click one: select only that
- Click another: select range between
- Click active single: deselect all
- "Hele dagen" (all_day) spans full col-span-2

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
