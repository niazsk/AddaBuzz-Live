# AddaBuzz Live --- Product Requirements Document (PRD)

**Version:** 2.0\
**Status:** Draft for implementation and architecture validation\
**Product:** AddaBuzz Live\
**Tagline:** Connect • Stream • Chat • Enjoy

## 1. Executive summary

AddaBuzz Live is a cross-platform social live-streaming product for Web,
installable PWA and native Android. Users can discover live creators,
watch video/audio broadcasts, host their own rooms, participate in
multi-guest rooms with up to eight guest seats, chat, follow creators
and send virtual gifts.

The product will use Firebase as its shared identity, database, storage
and notification platform, with one Firebase project serving Web and
Android. OpenVidu 3.x will provide real-time audio/video. A trusted
Node.js service (Cloud Functions or Cloud Run) will enforce business
rules, allocate guest seats, generate media access tokens and process
wallet transactions.

The initial delivery is phased: first establish the responsive UI, then
Firebase authentication/data/security, then media streaming, multi-guest
workflows, social features, wallet/gifts, moderation and production
hardening.


## Online-first operating model (mandatory)
- AddaBuzz Live is an **online, cloud-connected application**, not an offline/local-only app.
- An active internet connection is required for sign-in, profile and feed data, live rooms, chat, gifts, notifications, and all shared account features.
- Web/PWA and Android must connect to the same deployed Firebase project and trusted backend so user accounts and data stay synchronized across devices.
- Live audio/video must connect to the deployed OpenVidu service over the network; do not use a local mock media stream in production.
- Offline behavior is limited to a clear offline screen/state, safe caching of static app assets, and retry/reconnect handling. Do not present cached data as current live status.
- When connectivity is lost, show connection status, pause/disable actions that require the server, retry safely, and resynchronize room membership and messages after reconnection.

## 2. Goals

1.  Deliver an original, polished dark-themed social live-streaming
    experience.
2.  Support responsive Web and installable PWA.
3.  Deliver a native Android client using Kotlin and Jetpack Compose.
4.  Share Firebase Auth identity, profiles, rooms, messages,
    relationships and permissions across clients.
5.  Support real-time audio/video, not simulated playback.
6.  Support multi-guest rooms with a server-enforced maximum of eight
    guest seats.
7.  Apply Firebase Security Rules, trusted server operations, App Check
    where supported and auditable wallet transactions.
8.  Prefer free/open-source infrastructure without promising that
    production hosting, bandwidth or media infrastructure are cost-free.

## 3. Non-goals for the first release

-   Copying the UI, brand, assets or code of another live-streaming
    platform
-   Guaranteed unlimited free hosting or bandwidth
-   Real-money deposits, withdrawals or cash conversion without a
    separately approved compliance/payment design
-   AI companion features
-   Desktop native application
-   Offline live streaming; all live broadcasts require an active internet connection

## 4. Target users and roles

### Primary account ID types and operational roles

Every registered account has one primary account type and a unique platform ID:

- **User ID (`USER`):** default registered account. Can watch live rooms, follow, chat and use other features permitted by platform policy.
- **Agent ID (`AGENT`):** granted when an authorized Super Agent promotes an eligible User. Agent capabilities and limits are configured by the platform. Agents cannot promote other users by default.
- **Super Agent ID (`SUPER_AGENT`):** can promote eligible User accounts to Agent status. Super Agent status itself is assigned only by the trusted platform owner/administrator.

**Promotion workflow:** A Super Agent selects a User and requests promotion. The trusted backend verifies the Super Agent's authority, changes the account type from `USER` to `AGENT`, and writes an immutable audit record containing the actor, target, timestamp and before/after account type. Users cannot promote themselves. Agents cannot promote users unless a separate permission is explicitly granted in a future approved specification.

Host, Guest and Moderator are operational capabilities, not additional primary account ID types. A User or Agent may host or join a room when permitted. All account-type and permission checks must be enforced by trusted backend authorization and Firebase Security Rules, not merely by hiding UI controls.

## 5. Core user journeys

### 5.1 Registration and onboarding

1.  User opens AddaBuzz Live.
2.  User registers with email/password or configured Google sign-in.
3.  Email verification is completed where required.
4.  User selects a unique username and completes profile.
5.  User lands on the Home/Discover screen.

**Acceptance criteria** - Invalid credentials show a useful error. -
Password reset works through Firebase Authentication. - Session survives
app restart according to secure platform storage rules. - Duplicate
usernames are rejected atomically by trusted backend logic. - Web and
Android resolve to the same Firebase Auth UID for the same
account/provider.

### 5.2 Discover and watch a live room

1.  User opens Home or Discover.
2.  User browses featured, popular, trending, category or followed
    rooms.
3.  User opens a live room.
4.  Client requests permission to join from the trusted API.
5.  API verifies the Firebase ID token, room state, access policy and
    user restrictions.
6.  API returns a short-lived OpenVidu-compatible media access token.
7.  Client joins the media session and subscribes to available tracks.
8.  User can comment, follow, share, report or leave.

**Acceptance criteria** - Viewer count and room state come from
authoritative backend/media events. - Media is actual live
audio/video. - Unauthorized users cannot join private/restricted
rooms. - Reconnection and leave behavior are handled without stale
participant records. - A client cannot mint its own media token or
elevate its media permissions.

### 5.3 Host a live room

1.  Authenticated user chooses Video Live or Audio Live.
2.  User enters title, description and category.
3.  User grants the relevant device permissions.
4.  Trusted backend creates the Firestore room record and authorizes
    host access.
5.  Host receives a short-lived publish token and publishes media.
6.  Host can mute/unmute, toggle camera, switch camera where supported,
    manage participants and end the room.

**Acceptance criteria** - Room creation is rejected for suspended or
otherwise ineligible accounts. - Host controls are checked
server-side. - Ending a room updates persistent room state and cleans up
participant state. - A network interruption does not incorrectly mark a
room as healthy indefinitely. - OpenVidu lifecycle events are reconciled
with Firestore room/participant records.

### 5.4 Multi-guest room

1.  Host creates a multi-guest room.
2.  User requests an available seat or host sends an invitation.
3.  Host accepts/rejects.
4.  Trusted backend atomically assigns an available seat (Firestore
    transaction or equivalent serialized server operation) and issues
    appropriately scoped media credentials.
5.  Guest publishes permitted tracks.
6.  Host can mute/remove guests and lock/unlock seats.
7.  Seat state is synchronized to all participants.

**Acceptance criteria** - Maximum guest seat count is eight, enforced
transactionally on the server. - Concurrent requests cannot
over-allocate seats. - Only host/authorized moderators can accept,
remove, mute or lock seats. - Removed guests lose publish permission and
cannot rejoin without authorization. - Product owner must decide whether
eight seats means eight guests plus host or eight total publishers
before implementation. - Media permissions are revoked or the
participant is removed from the media room when access is withdrawn.

### 5.5 Chat and social

-   Users can follow/unfollow and block/unblock.
-   Users can send private messages subject to block and privacy rules.
-   Room comments appear in real time.
-   Notifications are delivered in-app and through FCM where enabled.
-   Users can report a room or account.

**Acceptance criteria** - Block rules are applied consistently to
messaging and interactions. - Chat is rate-limited and content is
validated. - Message delivery and unread state are persisted. -
Firestore reads use pagination and indexes; no unbounded collection
scans are used.

### 5.6 Coins, Diamonds, gifts and wallet

-   The app provides two separate virtual balance types: **Coins** and **Diamonds**.
-   Users can view their Coin and Diamond balances and transaction histories.
-   Users can send virtual gifts where permitted; gift prices and settlement currency must be explicitly configured in the gift catalog/business rules.
-   Every Coin or Diamond credit/debit creates an immutable ledger record, and balance updates happen atomically in trusted server code using Firestore transactions.
-   **There is no top-up, purchase, recharge, deposit or payment option** for Coins or Diamonds in the product. No payment gateway or real-money purchase flow is included.
-   The allowed non-purchase sources and uses of Coins and Diamonds (for example, platform grants, rewards or gifts) must be configured and approved as business rules before implementation; do not assume a conversion rate or allow client-created balances.

**Acceptance criteria** - Client cannot directly edit balances or transaction history. - Duplicate requests do not double-credit or double-debit (idempotency key required). - Every transaction records currency type, amount, reason, actor/source and timestamp and can be audited. - No top-up/recharge/buy-coins/buy-diamonds UI, API, payment SDK or payment workflow exists. - No real-money payment or cash conversion is implemented.

### 5.7 Administration

-   Admins review reports and manage users/rooms/catalog.
-   Moderators receive only scoped permissions.
-   Sensitive actions create audit records.

**Acceptance criteria** - Admin APIs verify role and permission on every
request. - Users cannot grant themselves Agent, Super Agent, moderator or
admin privileges. Only an authorized Super Agent can promote a User to
Agent through the trusted promotion workflow; Super Agent assignment is
platform-admin controlled. - Suspensions and bans are enforced across Web
and Android.

## 6. Functional requirements

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  FR-01                   Responsive Web          P0
                          application             

  FR-02                   Installable PWA         P1

  FR-03                   Native Android          P1
                          application             

  FR-04                   Firebase email          P0
                          registration/login and  
                          session management      

  FR-05                   Profile creation and    P0
                          editing                 

  FR-06                   Home, search, discovery P0
                          and categories          

  FR-07                   Real video and audio    P0
                          live rooms via OpenVidu 
                          3.x                     

  FR-08                   Viewer join/leave and   P0
                          participant state       

  FR-09                   Host camera/mic         P0
                          controls and end-live   

  FR-10                   Eight guest seats and   P0
                          host approval workflow  

  FR-11                   Real-time room comments P1

  FR-12                   Follow/unfollow, block  P1
                          and report              

  FR-13                   Private messages and    P1
                          FCM notifications       

  FR-14                   Virtual gifts, Coins    P2
                          and Diamonds; secure    
                          ledger; no top-up       

  FR-15                   Admin/moderation        P1
                          console                 

  FR-16                   Shared Web/Android      P0
                          Firebase Auth identity  
                          and data                

  FR-17                   Firebase Security       P1
                          Rules, audit logs and   
                          operational status      

  FR-18                   User, Agent and         P0
                          Super Agent account IDs 

  FR-19                   Super Agent-only       P1
                          User-to-Agent promotion 

  FR-20                   Coin and Diamond       P1
                          balances and ledger;    
                          no top-up or purchase   
  -----------------------------------------------------------------------

P0 = essential foundation/first usable release; P1 = next release; P2 =
later release. Priorities may be refined after the MVP scope is
approved.

## 7. Non-functional requirements

### Performance

-   Avoid blocking the UI during network/media operations.
-   Use pagination for feeds and message history.
-   Optimize images and use appropriate caching.
-   Define target latency, startup and concurrency budgets during
    load-test planning.
-   Avoid excessive Firestore document reads/listeners; detach listeners
    when screens are no longer active.

### Online connectivity and synchronization
- The product is online-first; an internet connection is required for core functionality.
- Web/PWA and Android use the same deployed Firebase project and trusted backend.
- Live sessions use the deployed OpenVidu service; local/demo media is not acceptable in production.
- On disconnect, show an offline/reconnecting state, prevent unsafe duplicate actions, and reconcile room/participant/message state after reconnect.
- PWA caching may cover the app shell and static assets only; cached screens must not imply that live data is current.

### Availability and scale

-   Document that Firebase free quotas and self-hosted media
    infrastructure have capacity, quota and uptime limits.
-   Monitor CPU, memory, network throughput, packet loss, active rooms
    and concurrent publishers on the OpenVidu deployment.
-   Test with multiple devices before public launch.
-   Select Firestore region close to the primary user base after
    evaluating latency, data location and service availability.

### Security

-   Use Firebase Authentication and verify Firebase ID tokens in trusted
    backend endpoints.
-   Use deny-by-default Firestore, RTDB and Storage Security Rules.
-   Use Firebase App Check where supported and configured.
-   Keep Firebase Admin credentials and OpenVidu secrets server-side.
-   Generate short-lived media tokens server-side with room/role
    restrictions.
-   Apply input validation, rate limiting, authorization checks and
    audit logging.
-   Secure Android session/token storage.

### Accessibility and usability

-   Touch targets appropriate for mobile.
-   Text contrast and scalable typography.
-   Loading, empty, offline, permission-denied and error states.
-   Clear consent prompts for camera and microphone.

### Compatibility

-   Current supported desktop browsers and Android versions to be
    defined in the release matrix.
-   Test real devices, different network conditions and Android
    lifecycle transitions.
-   Confirm the exact OpenVidu 3.x client SDK versions used by Web and
    Android.

## 8. Proposed system architecture

### Client applications

-   **Web/PWA:** React, TypeScript, Vite, Tailwind CSS, Firebase
    JavaScript SDK.
-   **Android:** Kotlin, Jetpack Compose, Material 3, Firebase Android
    SDK.

### Firebase services

-   **Firebase Authentication:** shared user identity.
-   **Cloud Firestore:** durable application records.
-   **Realtime Database:** presence and selected ephemeral room state,
    if needed.
-   **Cloud Storage:** profile images, thumbnails and approved assets.
-   **Firebase Cloud Messaging:** push notifications.
-   **Firebase App Check:** app attestation for supported services.
-   **Firebase Emulator Suite:** local development and Security Rules
    testing.

### Trusted application backend

-   Node.js API deployed to Cloud Run or Cloud Functions for Firebase.
-   Firebase Admin SDK used only in trusted server environment.
-   Verify Firebase ID tokens on protected endpoints.
-   Enforce business rules, username uniqueness, room permissions, seat
    assignment, gift/wallet transactions and moderation.
-   Generate OpenVidu access tokens using server-side media credentials.
-   Enforce account type hierarchy (`USER`, `AGENT`, `SUPER_AGENT`) and Super Agent-only User-to-Agent promotion.
-   Process Coin and Diamond ledger transactions without any top-up or payment flow.
-   Never rely on client-side Security Rules alone for operations
    requiring atomic business logic or privileged media control.

### Media server

-   OpenVidu 3.x deployment (self-hosted or supported cloud deployment).
-   Web and Android clients use the compatible LiveKit client SDKs
    against OpenVidu 3.x, according to current OpenVidu documentation.
    OpenVidu is the media server/platform; the SDK naming reflects its
    API compatibility.
-   Node.js backend uses the compatible server SDK/API to generate
    access tokens and manage rooms/participants as required.

### Media flow

1.  Client signs in with Firebase Authentication.
2.  Client obtains a Firebase ID token.
3.  Client calls the trusted Node.js API with that ID token.
4.  API verifies identity and checks Firestore records, room state, user
    restrictions and role.
5.  API creates/updates the media room as required and generates a
    short-lived, scoped OpenVidu-compatible token.
6.  Client connects to OpenVidu and publishes/subscribes to real WebRTC
    tracks.
7.  Backend receives/records relevant lifecycle events and reconciles
    Firestore room/participant state.
8.  FCM sends push notifications for relevant events when the user is
    not actively connected.

## 9. Firebase architecture and data rules

### Firestore as the durable source of truth

Use collections for users, rooms, participants, seats, messages,
conversations, gifts, wallets, transactions, reports and audit logs.
Define document shapes, indexes and retention rules before
implementation.

### Realtime Database

Use RTDB for online presence and short-lived high-frequency state only
when it provides a clear benefit. Define a single authoritative source
for each data field. Do not mirror all Firestore records into RTDB.

### Security Rules

-   Deny access by default.
-   Public profile reads expose only explicitly public fields.
-   Private user settings are readable/writable only by the owner and
    trusted backend as appropriate.
-   Users may create messages only as themselves and only if they are
    valid conversation/room members.
-   Clients cannot write Coin/Diamond balances, wallet ledger entries, gift
    settlement records, account types, admin roles or audit logs.
-   Only trusted backend code may promote `USER` to `AGENT`, and only after verifying the requesting account is an authorized `SUPER_AGENT`.
-   Client room writes must not allow users to assign seats, promote
    themselves, change host ownership or increase participant limits.
-   Storage uploads must validate user ownership, path, file size and
    content type.
-   Rules are not a replacement for backend validation, abuse prevention
    or transaction logic.

### Suggested Firestore collections

-   `users/{uid}`
-   `userPrivate/{uid}`
-   `usernames/{normalizedUsername}`
-   `follows/{followId}` or user subcollections
-   `blocks/{blockId}`
-   `liveRooms/{roomId}`
-   `liveRooms/{roomId}/participants/{uid}`
-   `liveRooms/{roomId}/seats/{seatId}`
-   `liveRooms/{roomId}/joinRequests/{requestId}`
-   `liveRooms/{roomId}/messages/{messageId}`
-   `conversations/{conversationId}`
-   `conversations/{conversationId}/members/{uid}`
-   `conversations/{conversationId}/messages/{messageId}`
-   `users/{uid}/notifications/{notificationId}`
-   `giftCatalog/{giftId}`
-   `wallets/{uid}` (separate `coinBalance` and `diamondBalance` fields)
-   `wallets/{uid}/transactions/{transactionId}` (currency type: `COIN` or `DIAMOND`; immutable ledger)
-   `accountPromotions/{promotionId}` (Super Agent promotion audit trail)
-   `giftTransactions/{transactionId}`
-   `reports/{reportId}`
-   `auditLogs/{logId}`

Suggested RTDB paths: - `/status/{uid}` -
`/roomPresence/{roomId}/{uid}` - `/typing/{conversationId}/{uid}`
(optional)

## 10. Suggested API areas

-   `POST /api/rooms` --- create room
-   `POST /api/rooms/:roomId/join` --- authorize join and return media
    connection details
-   `POST /api/rooms/:roomId/leave` --- leave and reconcile membership
-   `POST /api/rooms/:roomId/end` --- end room (host/admin only)
-   `POST /api/rooms/:roomId/join-requests` --- request guest seat
-   `POST /api/rooms/:roomId/join-requests/:requestId/decision` --- host
    decision
-   `POST /api/rooms/:roomId/seats/:seatId/lock` --- lock/unlock
-   `POST /api/rooms/:roomId/participants/:participantId/moderation` ---
    mute/remove
-   `POST /api/gifts/send` --- atomic gift transaction using configured virtual currency
-   `POST /api/super-agents/users/:uid/promote` --- Super Agent-only User-to-Agent promotion with audit record
-   `POST /api/reports` --- submit report

There must be no Coin/Diamond top-up, recharge, purchase or payment endpoint.

All protected routes verify Firebase ID tokens and perform server-side
authorization. Exact request/response schemas are implementation
deliverables.

## 11. Firebase cost and free-tier policy

-   Start with Firebase Spark where the required products/features and
    quotas allow.
-   Check current per-product limits before enabling production traffic.
-   Firestore, Cloud Storage, Realtime Database, Cloud Functions and
    phone authentication have quota/billing conditions that vary by
    product and plan.
-   Exceeding a Spark quota can cause that product's usage to stop for
    the remainder of the billing period; paid usage generally requires
    Blaze billing.
-   Phone/SMS authentication, high-volume database reads/writes, storage
    downloads, network egress and server compute can create costs.
-   OpenVidu self-hosting separately requires compute, bandwidth, TLS
    and potentially TURN infrastructure.
-   Set budget alerts and usage monitoring before public launch. Do not
    describe the full app as "100% free".

## 12. OpenVidu 3.x architecture decision --- validation required

OpenVidu 3.x is a plausible self-hosted WebRTC media platform for
AddaBuzz Live. Current OpenVidu documentation describes API
compatibility with LiveKit client/server SDKs, including JavaScript and
Android. Therefore the selected media server is OpenVidu; the compatible
SDK used by the client may still carry the LiveKit SDK name.

Before committing to production, run a technical spike that verifies: -
Exact OpenVidu 3.x release and edition licensing/features - Deployment
model, server sizing and operational dependencies - React/Web SDK
compatibility and Android Kotlin SDK compatibility for the pinned
versions - Session/room and token creation using trusted backend
credentials - Eight guest publishers plus host/viewer topology and
resource consumption - Host moderation, participant removal,
reconnection and event callbacks - TURN/STUN, UDP/TCP ports, reverse
proxy and TLS requirements - Docker/local development and production
deployment instructions - Whether any required feature is restricted to
a commercial edition

**Decision gate:** Keep media integration behind an internal
`MediaProvider` interface. Approve the production design only after Web
and Android proof-of-concepts both publish and subscribe to real media
in the same room with the intended participant count. If the Android SDK
path or licensing does not meet requirements, reassess before full
implementation.

## 13. Delivery phases

### Phase 1 --- UI foundation

-   Inspect existing repository and preserve working functionality.
-   Create original branding and responsive application shell.
-   Build home, navigation, room cards, streamer cards, categories and
    mobile layout.
-   Use clearly labeled preview data only.
-   Run build, fix errors and update `DEVELOPMENT_STATUS.md`.

### Phase 2 --- Firebase project and authentication

-   Create Firebase project and register Web and Android apps.
-   Configure Authentication providers, authorized domains and Android
    SHA fingerprints as required.
-   Implement email/password, email verification, password reset and
    Google sign-in.
-   Add profile onboarding and unique username reservation endpoint.
-   Configure Firebase Emulator Suite for local auth/rules tests.

### Phase 3 --- Firestore, RTDB and Storage

-   Define Firestore document schemas and indexes.
-   Implement Security Rules for Firestore, RTDB and Storage.
-   Add Storage upload flows and image validation.
-   Implement profile, follow, block and discovery queries.
-   Add pagination and emulator-based rules tests.

### Phase 4 --- Trusted Node.js backend

-   Deploy API to Cloud Run or Cloud Functions.
-   Verify Firebase ID tokens.
-   Implement User/Agent/Super Agent account type checks, Super Agent-only promotion, rate limits and audit logs.
-   Add server-only secrets management.
-   Implement username uniqueness and room lifecycle endpoints.

### Phase 5 --- OpenVidu technical spike

-   Deploy a pinned OpenVidu 3.x version.
-   Connect Web client and Android test app to the same room.
-   Verify publish/subscribe, audio/video permissions, reconnect and
    room cleanup.
-   Test host + intended guest count + viewer topology.
-   Record bandwidth, CPU, memory and network behavior.
-   Approve the media design only after the spike passes.

### Phase 6 --- Live rooms and multi-guest

-   Implement room create/join/leave/end.
-   Generate scoped media tokens server-side.
-   Implement atomic seat assignment and guest approval.
-   Add host/moderator controls and participant reconciliation.
-   Test simultaneous seat requests and permission revocation.

### Phase 7 --- Social, chat and notifications

-   Implement follows, blocks, reports and search.
-   Add room comments and private messaging.
-   Add FCM notification registration and delivery.
-   Add RTDB presence/typing only where required.

### Phase 8 --- Coins, Diamonds, gifts and wallet

-   Add separate Coin and Diamond balances, gift catalog and transaction history.
-   Implement server-side Firestore transactions and idempotency for all credits/debits.
-   Deny client writes to balances and ledger records.
-   Do not build top-up, recharge, purchase, payment gateway or cash-conversion flows.
-   Confirm the approved non-purchase earning/reward rules and gift currency rules before enabling transactions.

### Phase 9 --- Android/PWA hardening and admin

-   Complete PWA installability and safe static-shell caching; all live streaming remains fully online and requires internet connectivity.
-   Complete native Android lifecycle, permissions and notification
    flows.
-   Add admin/moderator screens and protected endpoints.
-   Test across supported browsers and physical Android devices.

### Phase 10 --- QA and production readiness

-   Run Security Rules tests, API tests and end-to-end tests.
-   Perform media load tests and abuse/rate-limit tests.
-   Configure monitoring, budget alerts, backups and incident
    procedures.
-   Complete privacy policy, terms, moderation policy and store
    compliance review.
-   Publish deployment, recovery and operations documentation.

## 14. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  Firebase reads/writes   Unexpected billing or   Query design,
  grow rapidly            quota exhaustion        pagination, listener
                                                  lifecycle, usage
                                                  monitoring and budget
                                                  alerts

  Spark quota reached     Feature may stop until  Load-test estimates;
                          quota resets or plan    document Blaze upgrade
                          changes                 requirement

  OpenVidu server         Poor media quality or   Benchmark target
  capacity                failed rooms            topology; size
                                                  CPU/network; monitor
                                                  and scale intentionally

  Eight-seat ambiguity    Incorrect room capacity Product owner confirms
                          implementation          whether host is
                                                  additional

  Concurrent seat         Over-allocation         Trusted transactional
  requests                                        seat assignment

  Client-side privilege   Account, wallet or room Deny-by-default
  escalation              abuse                   Security Rules and
                                                  trusted backend checks

  Wallet duplication/race Incorrect balances      Idempotency keys and
                                                  server-side atomic
                                                  transactions

  Presence state becomes  Incorrect online/viewer RTDB presence
  stale                   indicators              disconnect handling and
                                                  reconciliation

  Search limitations      Weak discovery          Start with indexed
                          experience              prefix/search fields;
                                                  evaluate dedicated
                                                  search later

  Self-hosted media       Downtime and            Deployment runbooks,
  operations              maintenance burden      monitoring, backups and
                                                  tested recovery
  -----------------------------------------------------------------------

## 15. Definition of done

A feature is complete only when: - It works with real Firebase accounts
and persisted data. - Firestore/RTDB/Storage rules prevent unauthorized
access. - Trusted endpoints verify Firebase ID tokens and roles. -
Loading, empty, error, offline and permission-denied states are
handled. - Relevant automated tests pass. - Web and Android behavior is
consistent where the feature is shared. - Documentation and
`DEVELOPMENT_STATUS.md` are updated. - No secrets are committed to
source control or shipped in client apps.

## 16. Immediate implementation instruction

Start with **Phase 1 only** unless explicitly authorized to proceed
further. First inspect the repository, preserve existing work, implement
the responsive AddaBuzz Live UI with clearly labeled preview data, and
document what is complete versus pending. Do not claim Firebase,
OpenVidu, authentication or live streaming is integrated until the
corresponding phases have been implemented and tested.
