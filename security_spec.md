# Security Specification & Payload Audit — AddaBuzz Live

## 1. Data Invariants
1. **Identity & PII Isolation**: Public profiles (`/users/{uid}`) contain zero PII (`email` lives strictly in `/userPrivate/{uid}`). Users may only create/update their own profile and may never alter their own `accountType` (`USER` / `AGENT` / `SUPER_AGENT`).
2. **Username Uniqueness**: `/usernames/{username}` locks a handle atomically to `request.auth.uid` on creation and cannot be reassigned.
3. **Role Hierarchy Enforcement**: Only a verified `SUPER_AGENT` (looked up from `/users/$(request.auth.uid).data.accountType`) or platform admin can promote a `USER` to `AGENT`, and must atomically write an immutable `/accountPromotions/{promotionId}` audit record.
4. **8-Seat Multi-Guest Limit**: `/liveRooms/{roomId}/seats/{seatId}` only accepts IDs `seat_1` through `seat_8` with `seatNumber` 1..8, enforcing the 8-guest-seat ceiling at the rule level.
5. **Wallet Integrity (No Top-Up / No Self-Inflation)**: `/wallets/{uid}` can only be initialized with the exact welcome grant (`500` Coins, `120` Diamonds) and client updates can never increase `coinBalance` or `diamondBalance` (debit-only by owner, or admin). `/wallets/{uid}/transactions/{transactionId}` is strictly append-only (no update or delete).
6. **Master Gate & Conversation Privacy**: Direct messages under `/conversations/{conversationId}/messages/{messageId}` check membership via `get()` on the parent conversation's `memberUids` (`size() == 2`).
7. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must match `request.time`.
8. **Path ID Poisoning Guard**: All single-document operations enforce `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Fail with PERMISSION_DENIED)
1. **Self-Role Escalation**: User updates `/users/{uid}` setting `accountType: "SUPER_AGENT"`.
2. **Unauthorized Promotion**: A `USER` or `AGENT` attempts to update another user's `accountType` to `"AGENT"`.
3. **PII Blanket Read**: Non-owner user reads `/userPrivate/{otherUid}`.
4. **Wallet Coin Minting**: Owner updates `/wallets/{uid}` setting `coinBalance: 999999`.
5. **Ledger Tampering**: Owner attempts `update` or `delete` on `/wallets/{uid}/transactions/{txId}`.
6. **9th Guest Seat Injection**: Host attempts to create `/liveRooms/{roomId}/seats/seat_9` with `seatNumber: 9`.
7. **Shadow Field Injection**: User creates `/liveRooms/{roomId}` with undocumented field `isVerified: true`.
8. **ID Poisoning**: User creates document with 1KB junk document ID.
9. **Room Hijack**: Non-host attempts to set `status: "ENDED"` on another host's `/liveRooms/{roomId}`.
10. **Terminal State Mutation**: Host attempts to mutate an already `"ENDED"` live room back to `"LIVE"`.
11. **Conversation Eavesdropping**: Third party attempts `get` or `list` on `/conversations/{convId}` where they are not in `memberUids`.
12. **Client Timestamp Spoofing**: User creates comment with backdated `createdAt` not equal to `request.time`.
