
Mål: få opprettelse av hendelser til å fungere igjen, og samtidig rydde opp i følgefeil som gjør feilen vanskelig å forstå.

Hva jeg fant
- Selve POST-en til `public.events` feiler med 403/RLS.
- Payloaden ser riktig ut:
  - `household_id = 06cefb57-...`
  - `owner_member_id = fbb24e17-...`
  - den `owner_member_id`-raden finnes i `household_members`, er aktiv, og tilhører innlogget bruker.
- Feilen skjer også for `visibility_type: "all_members"`, så dette ser ikke ut til å være spesifikt for `selected_members`.
- Derfor er det mest sannsynlig en DB-side policy/funksjon-tilstand, ikke NewEventFlow sitt skjema alene.
- I tillegg finnes noen følgefeil i UI:
  - `NewEventFlow` og `EditEventFlow` har ingen `try/catch`/toast rundt `mutateAsync`, så brukeren får bare “Lagrer...” -> tilbake uten forklaring.
  - `CalendarView` sender `currentMemberId=""` til `EventDetailSheet`, som gjør edit/delete-logikken feil derfra.
  - `ListView` bruker `ViewHeader` på en måte som gir ref-warning i console.

Plan
1. Verifisere og reparere RLS for `events`
- Lage en ny migrasjon som re-oppretter insert policyen på `public.events` på en helt eksplisitt måte.
- Ikke anta at forrige migrasjon faktisk er anvendt riktig; re-deklarere policyen rent og idempotent.
- Holde policyen enkel og robust:
  - bruker må ha en aktiv `household_members`-rad
  - `owner_member_id` må være brukerens egen member-rad
  - `household_id` må matche samme household
- Hvis nødvendig, re-opprette hjelpefunksjonen `is_own_active_household_member_row(...)` som `SECURITY DEFINER` for å unngå policy-kanttilfeller.

2. Gjøre create/update-feil synlige i appen
- Pakke `handleSubmit` i `NewEventFlow` og `EditEventFlow` i `try/catch`.
- Vise toast med faktisk Supabase-feilmelding ved 403/400 i stedet for stille feil.
- Ikke lukke modal hvis insert/update feiler.

3. Rydde opp i følgefeil som kan skape sekundære bugs
- `CalendarView`: sende riktig `currentMemberId` videre til `EventDetailSheet`.
- `ViewHeader`: gjøre komponenten kompatibel med framer-motion/ref-bruk, sannsynligvis via `forwardRef` eller ved å unngå ref-passing der den brukes.
- Gå raskt gjennom event-relatert flyt for andre steder som kan skjule DB-feil.

4. Kontrollere at create-flyten ikke sender problematiske verdier
- Beholde dagens day-part mapping, men verifisere at payload er konsistent for:
  - vanlig hendelse
  - hele dagen
  - range over flere day-parts
- Siden nettverksloggen viste at også `all_members` feiler, blir dette sekundært, men jeg vil fortsatt sikre at UI ikke sender unødvendig rare kombinasjoner.

5. Verifisering etter fix
- Teste oppretting av:
  - vanlig hendelse
  - hele dagen-hendelse
  - hendelse med kategori
- Bekrefte at den faktisk dukker opp i kalender og liste.
- Bekrefte at feilmelding vises hvis DB fortsatt avviser noe.

Tekniske detaljer
- Filer jeg vil endre:
  - `supabase/migrations/...sql`
  - `src/components/NewEventFlow.tsx`
  - `src/components/EditEventFlow.tsx`
  - `src/components/CalendarView.tsx`
  - `src/components/ViewHeader.tsx`
  - eventuelt `src/components/ListView.tsx` hvis ref-warningen kommer derfra i samspill med motion
- Mest sannsynlig rotårsak:
  - policy/funksjon-state i Supabase er ikke i praksis lik det koden antar, selv om repoet nå har en “riktig” policyfil.
- Viktig observasjon:
  - requesten som feilet med `visibility_type: "all_members"` hadde korrekt `owner_member_id`, så dette peker bort fra brukerinput og mot RLS-evaluering i databasen.

Når jeg implementerer
- Jeg vil starte med DB-fixen først.
- Deretter legge til tydelig error handling i UI.
- Så rydde opp i `currentMemberId`-bugen og ref-warningen.
- Til slutt verifisere hele flyten ende til ende.