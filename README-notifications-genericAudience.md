# Farcaster Mini App Notifications  
## A Practical Guide for Developers (What the Docs Don’t Tell You)

This document is written for **any Farcaster Mini App developer** implementing notifications **without vendors** and **without Neynar**.

You do **not** need access to any specific repo or prior codebase to benefit from this.  
Everything here applies broadly to Mini Apps running their own backend.

This exists because the official documentation explains *what* notifications are, but not *how they actually behave in production*.

Official documentation: https://miniapps.farcaster.xyz/docs/guides/notifications
---

## Who This Is For

You are the target audience if:

- You are building a Farcaster Mini App
- You want to send notifications
- You are running your own backend
- You are not using Neynar for notifications
- You want notifications to **actually send**, not just “work once”

If you only read the official docs, you will miss critical details.

---

## Core Mental Model (Read This First)

Farcaster notifications are **not** a simple push API.

They are best understood as:

> **Client-issued, short-lived capability tokens**  
> that your backend may use **only while Farcaster allows**

Key consequences:

- You do not control token creation
- You do not control token expiration
- Tokens can silently stop working
- HTTP success does not equal delivery success

Treat this like OAuth-style capability delegation, not a webhook fire-and-forget system.

---

## The Real Notification Lifecycle

### 1. User opt-in happens entirely in the client

When a user enables notifications in Warpcast:

- Farcaster sends your backend a webhook
- The payload includes:
  - `fid` (user ID)
  - `token`
  - `url` (Farcaster’s notification endpoint)

You cannot request this token manually.  
You cannot regenerate it later.

---

### 2. You must persist the token immediately

At minimum, store:

- `fid`
- `token`
- `notification_url`
- `enabled`
- `updated_at`

Assumptions that will break your system:

- One token per user
- Tokens are permanent
- Tokens are reusable forever

None of those are guaranteed.

---

### 3. Tokens can become invalid without warning

This is the single most painful discovery.

A token may:

- Work once
- Work intermittently
- Suddenly stop working
- Be marked invalid **without a disable webhook**

You cannot rely on lifecycle webhooks alone.  
Token validity must be checked **when sending notifications**.

---

## Sending Notifications: What Actually Matters

### Required payload fields

Your POST request to Farcaster **must** include:

- `notificationId`
- `tokens` (array, even for a single token)
- A correctly structured body

Missing fields result in hard failures.

---

### HTTP 200 does NOT mean success

This is critical.

A successful HTTP response may still mean **zero notifications delivered**.

You must inspect the response body:

```json
{
  "result": {
    "successfulTokens": [],
    "invalidTokens": ["..."],
    "rateLimitedTokens": []
  }
}
````

Interpretation rules:

* Token in `successfulTokens`
  → delivered successfully

* Token in `invalidTokens`
  → permanently dead, disable it immediately

* Token in `rateLimitedTokens`
  → still valid, temporarily blocked

Ignoring this response body guarantees silent failure.

---

## Rate Limiting Behavior (Poorly Documented)

What we observed:

* Rate limits are applied **per token**
* Rate-limited tokens are **not invalid**
* Immediate retries often fail again
* There is no built-in retry or backoff guidance

Recommended approach:

* Detect rate-limited tokens
* Surface the condition to an operator
* Retry manually or on a controlled schedule

Blind automatic retries make things worse.

---

## Webhook Events: Log Everything

You should store **raw webhook events verbatim**.

At minimum:

* Full headers
* Full body
* Decoded payloads
* Timestamp

Why this matters:

* Payload formats may evolve
* Bugs often appear client-side
* Debugging without raw events is nearly impossible
* You will need historical context

This is not optional if you want reliability.

---

## Minimal Database Design That Works

You do not need complex schemas.
You do need the right ones.

### Subscribers table

Required fields:

* `fid`
* `token`
* `enabled`
* `updated_at`

### Webhook events table

Required fields:

* `received_at`
* `headers`
* `body`
* `decoded_header`
* `decoded_payload`

With just these two tables, you can:

* Track opt-ins
* Detect token churn
* Disable dead tokens
* Audit notification behavior
* Debug delivery failures

---

## Welcome Notifications: Do This Carefully

When a user enables notifications:

* Send **exactly one** welcome notification
* Scope it to the **token**, not just the user
* Never resend for the same token

Why:

* Tokens may be reissued
* Users may re-enable notifications
* Duplicate welcomes feel broken and spammy

Token-scoped idempotency is the safest approach.

---

## About Neynar (Important Clarification)

This guide does **not** assume Neynar.

Neynar is commonly used for:

* Social graph queries
* Casts
* Reactions
* Profile data

Farcaster notifications:

* Do not require Neynar
* Do not depend on Neynar
* Can be implemented entirely vendor-free

If your app uses Neynar elsewhere, that’s fine.
Notifications themselves do not need it.

---

## Assessment of the Official Docs

Referring to:
[https://miniapps.farcaster.xyz/docs/guides/notifications](https://miniapps.farcaster.xyz/docs/guides/notifications)

### What the docs do well

* Explain that notifications exist
* Describe the basic opt-in flow
* Show example payloads

### What the docs do not cover

* Token invalidation behavior
* Response-body success semantics
* Rate limiting strategy
* Real-world failure modes
* Operational considerations
* Debugging workflows

Summary:

* Conceptual overview: acceptable
* Implementation guidance: insufficient
* Production readiness: low

Good for orientation. Not enough to ship.

---

## Recommended Engineering Posture

If you are serious about notifications:

* Assume tokens are fragile
* Log everything
* Store raw events
* Detect failures explicitly
* Build operator tooling early
* Never trust “it worked once”

Notifications are infrastructure, not UI sugar.

---

## Final Takeaway

Farcaster notifications **can work reliably**, but only if you treat them as:

* Capability-based
* Failure-prone
* Observability-dependent

If this document saves you even one day of blind debugging, it has done its job.

## Final Advice

If Farcaster ever asks for feedback:

> “The notifications guide needs a lifecycle diagram,
> explicit failure semantics,
> and a real Mini App UX example.”

Until then, this document exists.

You’re welcome.

— NFT Season


```
