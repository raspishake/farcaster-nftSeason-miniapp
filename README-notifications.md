# NFT Season — Farcaster Notifications: What We Wish We Knew on Day One

This document exists because the official documentation was **insufficient for real-world implementation**.

It is written for engineers who want to ship Farcaster Mini App notifications **without Neynar**, **without vendors**, and **without guesswork**.

If you read this first, you would avoid ~90% of the friction we hit.

---

## Executive Summary (TL;DR)

- Farcaster **notifications are not an API you “turn on”**.
- They are a **token lifecycle** managed entirely by the Farcaster client.
- Your backend is responsible for:
  - capturing opt-in events
  - persisting tokens
  - handling invalidation and rate limits
  - sending notifications correctly
- The Mini App UI **cannot toggle notifications directly**.
- The bell icon is UX sugar, not a switch.
- Neynar is **not required** for notifications.
- The Farcaster docs (https://miniapps.farcaster.xyz/docs/guides/notifications) omit several critical behaviors that only show up when you actually ship.

---

## The Big Mental Model (This Is the Missing Piece)

Think of Farcaster notifications as:

> **Ephemeral, client-issued capability tokens**  
> that you may use **only while they remain valid**

You do **not** control:
- token issuance
- token revocation
- rate limits
- retry semantics

You **do** control:
- storage
- deduplication
- invalid-token handling
- user-facing UX around enabling

This is closer to **web push + OAuth-style tokens** than a normal webhook system.

---

## What Actually Happens When a User Enables Notifications

1. User opens your Mini App in Warpcast
2. User taps ⋮ → Notifications → ON
3. Warpcast sends your app a **webhook event**:
   - `event: notifications_enabled`
   - includes:
     - `token`
     - `url` (always Farcaster’s notifications endpoint)
     - `fid`
4. That token is now valid **until Farcaster decides otherwise**

Important:
- Tokens can be invalidated **without another webhook**
- Tokens can be rate-limited **per token**
- Tokens are **not reusable across users**
- Tokens are **not permanent**

---

## What the Bell Icon Can and Cannot Do

### ❌ What it cannot do
- It cannot toggle notifications
- It cannot directly enable notifications
- It cannot query server state

### ✅ What it can do
- Call `sdk.actions.addMiniApp()`
- Signal intent
- Show state derived from `sdk.context`
- Teach the user where to toggle notifications

### Correct UX Pattern (Phone-first)

- Bell icon
- Blue checkmark when enabled
- Tap shows **instructional toast**, not a tooltip:

> Never miss another NFT mint or allowlist on Farcaster!  
> Tap the 3 dots menu to toggle Notifications ON / OFF.

Anything else is lying to the user.

---

## The Only Reliable Source of Truth for State

```ts
const ctx = await sdk.context
const enabled =
  Boolean(ctx?.client?.notificationDetails?.token) &&
  Boolean(ctx?.client?.notificationDetails?.url)
````

Not:

* your database
* your webhook logs
* your last send result

The client is the authority.

---

## Webhooks: What You Must Do (and the Docs Don’t Emphasize)

When you receive `notifications_enabled`:

1. Store the token
2. Associate it with `fid`
3. Mark it enabled
4. Send **exactly one** welcome notification
5. Never send that welcome again for the same token

When you receive `notifications_disabled`:

* Mark all tokens for that `fid` disabled

You must treat tokens as **single-use lifecycles**, not identities.

---

## Sending Notifications: The Gotchas

### Required payload fields (not optional)

* `notificationId` is **required**
* `tokens` must be an array
* Missing either yields HTTP 400

### HTTP 200 does NOT mean success

You must inspect the response body:

```json
{
  "result": {
    "successfulTokens": [],
    "invalidTokens": ["..."],
    "rateLimitedTokens": []
  }
}
```

Rules:

* If token appears in `invalidTokens`, disable it permanently
* If token appears in `rateLimitedTokens`, show:

  > rate limited, try again
* Do **not** retry automatically unless you want chaos

The docs do not emphasize this enough.

---

## Rate Limiting Reality

* Rate limits are **token-specific**
* Hitting the limit does not invalidate the token
* Immediate retry often fails again
* Best UX is:

  * show error
  * wait for human retry

We intentionally did **no auto-retry**.

---

## Database Design (Minimal and Correct)

You need two tables. Nothing more.

### `miniapp_notification_subscribers`

* `fid`
* `token`
* `enabled`
* `updated_at`

### `miniapp_notification_webhook_events`

* raw headers
* raw body
* decoded payload
* timestamp

Why store webhook events?

* debugging
* auditability
* sanity

You will need them.

---

## Why This Is NOT a Neynar App

Neynar provides:

* social graph APIs
* casts
* reactions
* profiles

Notifications do **not** require Neynar.

This project:

* uses Farcaster’s **official** notifications endpoint
* uses Farcaster-issued tokens
* has zero third-party vendors in the path

If you see Neynar mentioned anywhere, it is unrelated.

---

## What the Official Docs Get Right

Credit where due:

* The basic flow is described
* Endpoint URLs are correct
* Payload shapes are mostly accurate

---

## What the Official Docs Get Wrong or Omit

Regarding
[https://miniapps.farcaster.xyz/docs/guides/notifications](https://miniapps.farcaster.xyz/docs/guides/notifications)

### Major omissions

* No explanation of token invalidation behavior
* No warning that HTTP 200 can still mean failure
* No guidance on rate limits
* No UX guidance for Mini App UI
* No explanation of bell icon limitations
* No real-world examples of admin tooling
* No lifecycle model

### Quality assessment

* **Conceptual clarity**: 4/10
* **Operational usefulness**: 3/10
* **Production readiness**: 2/10

Good for orientation.
Insufficient for shipping.

---

## The Correct Engineering Posture

If you are implementing Farcaster notifications:

* Expect trial-and-error
* Log everything
* Build tooling early
* Never assume a token is valid
* Treat the client as the source of truth
* Keep UX honest

---

## Final Advice

If Farcaster ever asks for feedback:

> “The notifications guide needs a lifecycle diagram,
> explicit failure semantics,
> and a real Mini App UX example.”

Until then, this document exists.

You’re welcome.

— NFT Season

```
