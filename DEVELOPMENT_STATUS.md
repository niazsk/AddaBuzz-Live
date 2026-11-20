# AddaBuzz Live — Development Status

**Product:** AddaBuzz Live (`Connect • Stream • Chat • Enjoy`)  
**Firebase Project:** `addabuzzlive` (Project Number `1002525460523`)  
**Current Milestone:** Phases 1–4 + Web Stage Preview & PWA Connected

---

## Completed Deliverables

### Phase 1 — Responsive UI Foundation
- Custom AddaBuzz Live SVG emblem and brand PNG/SVG icons, dark obsidian/charcoal palette, violet–electric-blue action hierarchy, `Plus Jakarta Sans` / `DM Sans` / `JetBrains Mono` typography.
- Responsive Desktop 3-column layout, Tablet layout, and Mobile thumb-zone navigation.

### Phase 2 — Firebase Authentication & User Onboarding (`addabuzzlive`)
- Provisioned Firebase project `addabuzzlive` with `firebase-applet-config.json` and `getDocFromServer` boot connectivity verification.
- Google Sign-In (`signInWithPopup`), dedicated Email/Password Sign-In & Account Creation page, verification flow, and App Admin bootstrap (`niazskapp@gmail.com`, `fayselsk@gmail.com`).
- Unique username reservation (`/usernames/{username}`) with live availability check and split PII isolation (`/users/{uid}` public + `/userPrivate/{uid}` owner-only).

### Phase 3 — Cloud Firestore, Security Rules & Real-Time Features
- Defined `firebase-blueprint.json` and `security_spec.md`.
- Deployed ESLint-verified `firestore.rules` (`@firebase/eslint-plugin-security-rules`) enforcing:
  - Default-deny catch-all, strict field allowlists, string length bounds, ID regex checks, and server-timestamp enforcement (`request.time`).
  - Maximum 8 guest seats (`seat_1`..`seat_8`) with transactional seat requests, host approval, transactional decline, guest Step Down, mute/remove, and lock/unlock.
  - Real-time live room creation, ending, viewer count tracking, comments, animated gift celebrations, follows, blocks, private conversations, and safety reports.
  - Separate **Coins** and **Diamonds** wallet balances with debit-only client protection (no top-up, recharge, or purchase UI/endpoints) and append-only transaction ledger.
  - Super Agent-only `USER -> AGENT` promotion with immutable `/accountPromotions` audit records.

### Phase 4 & Web Stage — Express API, WebRTC Local Preview & Installable PWA
- Added Express `server.ts` serving Vite middleware in development, static production assets, `/api/health`, `/api/policy/wallet`, and `/api/media/session-token` (mints LiveKit/OpenVidu 3.x HS256 JWT tokens when SFU env vars are configured, or reports `local-preview` mode cleanly).
- Added real browser `getUserMedia` camera/microphone stage preview, front/rear camera switching, live Web Audio API speaking meter, and track mute/unmute for hosts and seated guests.
- Configured installable PWA (`vite-plugin-pwa`) with Workbox service worker, complete Web App Manifest, 192px/512px/maskable/Apple touch PNG icons, and in-app `PWAInstallButton` (Chromium prompt + iOS Safari guide).

### Phase 9 — Native Android Project (`android/`)
- Scaffolded Kotlin + Jetpack Compose + Material 3 Android application (`com.addabuzz.live`) connected to Firebase project `addabuzzlive` and the Firestore database (`(default)`), covering Discover, 8-seat Live Room + gift debit transactions (no top-up), Wallet, Roles/Promotions, and Email/Password Sign-In + Onboarding. Requires `google-services.json` from Firebase Console and Android Studio / Gradle to compile the `.apk`.

---

## Remaining External / Native Scope

| Phase | Scope | Status |
| --- | --- | --- |
| **Phase 6 (SFU)** | Live multi-party OpenVidu 3.x SFU connection (requires `OPENVIDU_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`) | Ready for SFU credentials |
| **Phase 7** | Firebase Cloud Messaging (FCM) push notifications & RTDB presence signals | Pending |
| **Phase 9 (APK Build)** | Add `google-services.json` in `android/app/` and build `.apk` via Android Studio | Scaffolded (requires Android Studio/JDK) |
| **Phase 10** | Load testing, budget alerts, and production launch hardening | Pending |
