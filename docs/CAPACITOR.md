# Pastelly – Capacitor mobil-oppsett

Denne guiden viser hvordan du bygger og kjører Pastelly som native app på iOS
og Android via Capacitor.

## Forutsetninger

- **iOS**: macOS med Xcode 15+ og en Apple Developer-konto
- **Android**: Android Studio (Giraffe eller nyere) og Java 17
- Node 20+, npm eller bun

## 1. Klon og installer

```bash
git clone <repo>
cd pastelly
npm install
```

## 2. Legg til plattformer (kjøres kun én gang)

```bash
npx cap add ios
npx cap add android
```

Dette oppretter `ios/` og `android/` mapper. Disse skal committes.

## 3. Bygg webappen og synk til native

Hver gang du endrer web-kode:

```bash
npm run cap:sync
```

## 4. Kjør på simulator eller enhet

**iOS (kun macOS):**
```bash
npm run cap:ios       # åpner Xcode
# eller
npm run cap:run:ios   # kjører på valgt simulator/enhet
```

**Android:**
```bash
npm run cap:android       # åpner Android Studio
# eller
npm run cap:run:android
```

## 5. Deep links / auth-callback

Universal/App links konfigureres i `capacitor.config.ts` og i de native
prosjektene. Custom-scheme `pastelly://auth/callback` håndteres av
`src/lib/native/deepLinks.ts` og krever at Supabase-prosjektet har
`pastelly://auth/callback` i **Redirect URLs**-listen.

I native Xcode-prosjektet: Info.plist → URL Types → `pastelly`.
I Android: `AndroidManifest.xml` → intent-filter med
`android:scheme="pastelly"` på Main Activity.

## 6. App-metadata

- **appId**: `no.studiopah.pastelly`
- **appName**: `Pastelly`
- **Ikoner og splash**: legg native-ikoner i `ios/App/App/Assets.xcassets`
  og `android/app/src/main/res/mipmap-*/`.

## 7. Publisering

- iOS: Xcode → Product → Archive → App Store Connect
- Android: Android Studio → Build → Generate Signed Bundle → Google Play

## Feilsøking

- **Blank skjerm**: kjør `npm run cap:sync` på nytt.
- **Auth-callback åpner Safari/nettleser**: sjekk at deep-link scheme er
  registrert i både native prosjekt og Supabase.
- **Safe-area feil**: `viewport-fit=cover` må stå i `index.html` (allerede satt).
