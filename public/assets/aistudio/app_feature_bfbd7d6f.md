# AddaBuzz Live --- app_feature.md

**Product:** AddaBuzz Live\
**Tagline:** Connect • Stream • Chat • Enjoy\
**Platforms:** Responsive Web, Installable PWA, Native Android\
**Backend:** Firebase\
**Media platform:** OpenVidu 3.x\
**Product direction:** Original social live-streaming platform with one
shared identity and data layer across Web and Android.

## 1. Product vision

AddaBuzz Live is a social live-streaming application where people
discover creators, watch and host live video/audio rooms, join
multi-guest conversations, chat, follow users and interact through
virtual gifts. The product must have its own brand, visual language,
icons, assets and interaction patterns; it must not copy another
product's proprietary design or code.

The app should be free for end users. The implementation should be
free-first and open-source wherever practical. "Free-first" does not
guarantee zero operating cost: Firebase usage, public hosting,
media-server compute, bandwidth, domain names, TURN relay capacity and
app-store distribution may incur costs.


## Online-first operating model (mandatory)
- AddaBuzz Live is an **online, cloud-connected application**, not an offline/local-only app.
- An active internet connection is required for sign-in, profile and feed data, live rooms, chat, gifts, notifications, and all shared account features.
- Web/PWA and Android must connect to the same deployed Firebase project and trusted backend so user accounts and data stay synchronized across devices.
- Live audio/video must connect to the deployed OpenVidu service over the network; do not use a local mock media stream in production.
- Offline behavior is limited to a clear offline screen/state, safe caching of static app assets, and retry/reconnect handling. Do not present cached data as current live status.
- When connectivity is lost, show connection status, pause/disable actions that require the server, retry safely, and resynchronize room membership and messages after reconnection.

## 2. Platforms and technology

### Web and PWA

-   React + TypeScript + Vite
-   Tailwind CSS
-   Firebase JavaScript SDK
-   Responsive layouts for phones, tablets and desktop
-   Installable PWA with app manifest, icons and service-worker caching
    for safe static/offline shell behavior

### Native Android

-   Kotlin
-   Jetpack Compose + Material 3
-   Android Studio / Gradle
-   Firebase Android SDK (Firebase Authentication, Cloud Firestore,
    Realtime Database, Cloud Storage and Firebase Cloud Messaging as
    required)
-   Native media permissions and lifecycle handling

### Shared Firebase backend

-   **Firebase Authentication:** email/password, Google sign-in and
    session identity
-   **Cloud Firestore:** primary application database for profiles,
    rooms, social graph, chat history, gifts, wallet ledger metadata,
    reports and admin records
-   **Firebase Realtime Database (RTDB):** online presence and
    short-lived high-frequency room/seat state where appropriate; do not
    duplicate all durable records unnecessarily
-   **Cloud Storage for Firebase:** profile images, room thumbnails and
    approved gift/media assets
-   **Firebase Cloud Messaging (FCM):** push notifications
-   **Firebase App Check:** help protect supported Firebase resources
    from unauthorized clients
-   **Cloud Functions for Firebase or Node.js API on Cloud Run:**
    trusted business logic, privileged operations, OpenVidu token
    generation, seat allocation, moderation and wallet transactions

Both clients must use the same Firebase project and user identity
(Firebase Auth UID). Do not create a separate Android database. Use
Firebase Security Rules for client access control; there is no
Supabase-style PostgreSQL RLS in this architecture.

### OpenVidu media client strategy

-   Use **OpenVidu 3.x server/platform**, not legacy OpenVidu v2.
-   OpenVidu 3.x is API-compatible with LiveKit client/server SDKs. The
    Web client can use the compatible JavaScript SDK and Android can use
    the compatible LiveKit Android Kotlin SDK to connect to the OpenVidu
    server. This is the documented client integration path, not a switch
    back to a LiveKit-hosted media service.
-   The Node.js trusted backend creates short-lived room access tokens
    using server-side credentials. Never place media-server secrets in
    the browser bundle or APK.
-   Keep the media provider behind an internal interface so the media
    implementation can be changed without rewriting product features.

## 3. Design system

### Visual direction

-   Premium dark interface
-   Deep black / charcoal surfaces
-   Purple and violet gradients
-   Electric-blue accents
-   High-contrast white and muted secondary typography
-   Restrained glassmorphism, soft glow, rounded cards and smooth
    transitions
-   Original AddaBuzz Live logo and favicon

### Responsive composition

**Desktop:** left navigation sidebar, central content feed, right
recommendation/online-friends rail.\
**Mobile:** compact top bar, touch-friendly controls, bottom navigation,
immersive full-screen live room.\
**Tablet:** adaptive two-column or compact three-column layout depending
on available width.

### Shared components

Buttons, inputs, avatar, live badge, viewer-count chip, room card,
streamer card, category chip, bottom navigation, sidebar item, modal,
toast, loading skeleton, empty state, error state, confirmation dialog
and permission prompt.

## 4. Authentication and account

-   Email/password registration and login using Firebase Authentication
-   Email verification
-   Password reset
-   Google sign-in (only after OAuth provider and redirect/package
    configuration are supplied)
-   Username and profile setup; enforce username uniqueness in trusted
    backend logic
-   Gender selection (Male/Female, if retained as a product requirement)
-   Confirm password on registration (client-side confirmation only;
    Firebase stores the password securely)
-   Session persistence and logout
-   Account settings
-   Account deletion flow that also handles associated user data
    according to the retention policy

Never simulate successful authentication in production. Do not expose
Firebase Admin SDK credentials or service-account keys in client
applications.

## 5. User profile and social graph

-   Avatar and cover image
-   Username, display name and bio
-   Country
-   Followers and following counts
-   Online/last-active presence (with privacy controls)
-   Edit profile
-   Follow/unfollow
-   Block/unblock
-   Report user
-   Search users (initially by indexed username/display-name fields; add
    a dedicated search service if advanced full-text search is required)
-   Followers and following lists

## 6. Home and discovery

Home dashboard sections: - Featured live rooms - Popular streamers -
Recommended users - Trending rooms - New streamers - Following feed -
Recently active users - Online friends - Notifications - Search

Room categories: - Popular - Music - Entertainment - Friendship - Chat -
Gaming - Talent - New Live

Every live-room card should display, when available: - Streamer avatar
and username - Room thumbnail - Room title - Viewer count - Live status

Use real backend data after integration. Clearly label any preview/demo
data during UI development. Use pagination and indexed Firestore
queries; avoid unbounded collection reads.

## 7. Live streaming

### Room modes

1.  Video Live
2.  Audio Live
3.  Viewer mode
4.  Multi-guest Live

### Host controls

-   Create room with title, description, category and mode
-   Start and end live
-   Camera on/off
-   Microphone mute/unmute
-   Switch front/rear camera (where supported)
-   View participant list
-   Follow streamer
-   Share room
-   Moderator controls
-   Live duration and connection/network state
-   Report room and block user

### Viewer experience

-   Join/leave room
-   Subscribe to host media
-   Watch video or listen to audio
-   Send live comments
-   View participant list and viewer count
-   Follow host, share and report

### Media engine requirement

Use OpenVidu 3.x as the media platform. The app must publish/subscribe
to actual WebRTC tracks; static thumbnails or prerecorded clips are not
live streaming. Validate the exact server release, edition, deployment
requirements, supported SDK versions and room topology before production
rollout.

## 8. Multi-guest room --- maximum 8 guest seats

-   Up to 8 guest seats, with host participation accounted for
    separately unless product rules define otherwise
-   Seat states: available, requested, occupied, locked
-   Guest request to join
-   Host invite
-   Accept/reject request
-   Host mute/unmute guest
-   Remove guest
-   Lock/unlock seat
-   Host/moderator permission management
-   Real-time seat and participant state synchronization
-   Real media tracks for every connected participant

Clarify whether "8 seats" means 8 guests plus host or 8 total
publishers/participants before implementation. Enforce the limit in
trusted server-side transaction logic, not only in the UI. Concurrent
requests must never over-allocate seats.

## 9. Chat, messaging and notifications

-   Live room comments
-   Private conversations
-   Conversation membership
-   Private messages
-   Real-time delivery and unread state
-   FCM push notifications for follows, invitations, join requests and
    relevant activity
-   Block/report safeguards and rate limiting

Use Firestore for durable message history and RTDB only for ephemeral
typing/presence signals when needed. Apply pagination to message history
and validate membership on every send/read path.

## 10. Virtual gifts and wallet

-   Gift catalog with original gift artwork/animation
-   Send gift in a live room
-   Gift transaction history
-   Wallet balance and ledger
-   Trusted server-side atomic balance updates using Firestore
    transactions
-   Idempotency protection against duplicate requests
-   Audit trail for all balance-changing operations

Do not implement real-money deposits, withdrawals, payments or cash
conversion unless a separate legal, payment-provider, fraud and
compliance specification is approved. Never let the client directly set
or increment a wallet balance. Wallet and transaction writes must be
denied by client Security Rules and performed only by trusted server
code.

## 11. Administration and moderation

-   User management
-   Room management
-   Moderator assignment
-   Report review
-   Suspension/ban actions
-   Gift catalog management
-   Audit logs
-   Role-based access control using trusted custom claims and
    server-side checks
-   Server-side authorization for every administrative operation

## 12. Firebase data model

Suggested Firestore collections/documents: - `users/{uid}` --- public
profile fields - `userPrivate/{uid}` --- private settings and sensitive
account metadata; owner/server access only -
`usernames/{normalizedUsername}` --- UID mapping for atomic username
uniqueness - `follows/{followId}` or `users/{uid}/following/{targetUid}`
and corresponding follower indexes - `blocks/{blockId}` -
`liveRooms/{roomId}` - `liveRooms/{roomId}/participants/{uid}` -
`liveRooms/{roomId}/seats/{seatId}` -
`liveRooms/{roomId}/joinRequests/{requestId}` -
`liveRooms/{roomId}/messages/{messageId}` -
`conversations/{conversationId}` -
`conversations/{conversationId}/members/{uid}` -
`conversations/{conversationId}/messages/{messageId}` -
`notifications/{notificationId}` or
`users/{uid}/notifications/{notificationId}` - `giftCatalog/{giftId}` -
`wallets/{uid}` --- server-only balance document -
`wallets/{uid}/transactions/{transactionId}` --- immutable ledger
entries - `giftTransactions/{transactionId}` - `reports/{reportId}` -
`auditLogs/{logId}`

Suggested RTDB paths for ephemeral data: - `/status/{uid}` ---
online/offline presence and last-seen coordination -
`/roomPresence/{roomId}/{uid}` --- ephemeral connection/presence
signals, if needed - `/typing/{conversationId}/{uid}` --- optional
typing indicators

Choose either Firestore or RTDB as the authoritative source for each
field; do not allow two unsynchronized sources of truth. Use
deterministic IDs where useful, indexes for query patterns, TTL/cleanup
policies for ephemeral data, and server timestamps.

## 13. Security, privacy and reliability

-   Firebase Authentication for identity; verify ID tokens in trusted
    backend endpoints
-   Firebase Security Rules with deny-by-default posture and least
    privilege
-   Firebase App Check for supported client-accessible Firebase services
-   No Firebase Admin credentials, service-account keys or OpenVidu
    secrets in browser bundles or APKs
-   Short-lived, room-scoped media access tokens generated server-side
-   Validate room membership and host/moderator permissions server-side
-   Rate-limit authentication-sensitive actions, chat, gifts, join
    requests and room creation
-   Validate and sanitize user-generated content
-   Secure Storage Rules: restrict paths, MIME types, file sizes and
    ownership
-   Report/block workflows
-   Handle network loss, reconnects, app backgrounding and permission
    denial
-   Use Cloud Functions/Cloud Run logs and monitoring; alert on failures
    and unusual transaction patterns
-   Do not claim features are complete until tested with real accounts
    and devices

## 14. Development and delivery

-   Inspect existing project before changing it
-   Preserve working features
-   Build in phases and keep `DEVELOPMENT_STATUS.md` current
-   Include `.env.example` (only public Firebase web config values; no
    Admin secrets), Firebase configuration/rules/index files, README and
    deployment notes
-   Include `firestore.rules`, `firestore.indexes.json`,
    `database.rules.json` (if RTDB is used), and `storage.rules`
-   Add emulator-based tests for Authentication, Firestore Rules, RTDB
    Rules and Storage Rules
-   Add tests for authorization, room limits, wallet transactions and
    core flows
-   Run lint/type-check/build and fix errors
-   Document unimplemented features, Firebase quotas/billing
    requirements and infrastructure prerequisites
