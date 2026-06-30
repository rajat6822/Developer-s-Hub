# Software Requirements Specification (SRS)
## Project: CodeRoom — Collaborative Code Editor

**Event:** Kodex Mini Hack-Sprint
**Duration:** Monday 9:00 PM → Tuesday 9:00 PM (24 hours)
**Team Size:** 3 members
**Stack:** MERN + Socket.io (No Docker)

---

## 0. Out of Scope

Defining what you will **not** build is itself an engineering decision. Read this before anything else — it tells you where to stop spending time so you can spend it on what actually matters.

The following are explicitly **out of scope** for this sprint:

- **No CRDT/OT libraries.** Do not install Yjs, ShareDB, Automerge, or any pre-built conflict-resolution library. The entire point of this project is for your team to design and defend your own sync strategy. Using a library that solves this for you defeats the assignment and will be treated as a rules violation in the defense round.
- **No syntax highlighting or language intelligence.** No autocomplete, no linting, no language-aware indentation. Monospace font is enough to make it "feel" like code.
- **No OAuth / third-party login.** Identity is room-based only (see Section 3).
- **No mobile responsiveness requirement.** Build for desktop browser. If it happens to work on mobile, fine — it is not graded.
- **No code execution.** This is an editor, not a sandbox. Nobody runs the code that's typed into it.
- **Multi-file/multi-tab support is NOT required.** It exists only as a stretch goal (Section 7). A single shared file per room fully satisfies the core requirement.

If your team finds yourselves building any of the above, stop and re-read this section.

---

## 1. Project Overview

**CodeRoom** is a real-time collaborative code editor. A user creates a "room," shares a room code with teammates, and everyone who joins that room sees the **same code file**, edited live, by everyone, at the same time — similar in spirit to a stripped-down CodeShare or a single-file version of CodeSandbox's live-share mode.

The interesting engineering problem is not "build a text box." It's: **what happens when two people type in the same place at the same time?** Your team must design, implement, and be ready to defend an answer to that question.

---

## 2. Goals

By the end of this sprint, the working application must allow:

1. A user to create a room and receive a shareable room code.
2. Other users to join that room using the code and see the **same live document**.
3. All participants to edit the document simultaneously, with changes appearing on everyone's screen in near real-time — **without** wiping out other people's concurrent edits via full-document overwrites.
4. The room and its document content to **persist in MongoDB**, so that a server restart does not erase ongoing work.
5. Each team member to have ownership of a clear, demonstrable piece of this system (see Section 3 — Roles & Domains) and to be able to explain and defend their part live.
6. The application to be **deployed and reachable via a live link** — not just running on localhost.

---

## 3. Roles & Domains

Team size is 3. Roles are **self-assigned within the team** — you decide who owns what, but every domain below must have a clear, identifiable owner, and that ownership must be visible in your commit history. A domain with no clear owner, or where commits suggest one person did everything, will be flagged in the defense round.

### Domain A — Auth & Room Management
- Room creation (generates a unique, shareable room code)
- Join-by-code flow
- Participant identity within a room (name/handle — no full account system needed)
- Host privileges — at minimum, the room creator should have **some** privilege a regular participant doesn't (e.g., rename room, remove a participant, close the room). You decide what "host privilege" means, but it must exist and be demonstrable.
- Session/reconnect handling: if a participant refreshes the page or briefly disconnects, can they rejoin the same room cleanly, or are they treated as a brand-new participant? Decide deliberately — either answer is acceptable if you can explain it.

### Domain B — Document & Sync Engine (the hard part)
- The shared document's state and how it's stored/updated on the server
- **Delta-based editing.** Every keystroke (or batch of keystrokes) must NOT resend the entire document to the server or to other clients. You must send and apply position-based patches/deltas.
- **A deliberate, defensible conflict strategy.** When two participants edit overlapping or nearby regions in a short time window, your system must do *something* sensible and *explainable*. Acceptable strategies include (but aren't limited to):
  - Timestamp-based last-write-wins on a per-character or per-line basis, with a clear explanation of what data is lost and why that tradeoff is acceptable for this use case
  - Position-shifting logic so a remote insertion doesn't corrupt a local cursor's understanding of the document
  - A simple locking mechanism (e.g., per-line soft locks) with visible feedback to users
  - You may invent your own strategy. What matters is that you made an intentional choice and can defend it — "it mostly works and we didn't think about it" is not an acceptable defense answer.

### Domain C — Realtime & Presence
- Socket.io room-based broadcasting (joining a Socket.io room keyed to the room code, not a global broadcast)
- Live participant list — updates immediately when someone joins or leaves
- Some form of live presence indicator beyond the participant list — e.g., showing who is currently typing, or where (even an approximate "Alice is editing" indicator is enough for the core bar; live cursor positions are a stretch goal, see Section 7)

### Cross-Cutting Responsibility — MongoDB Persistence
Persistence (saving room + document state to MongoDB so it survives a server restart) does not belong to a 4th person — your team only has 3 members. **You decide which of the three domain owners also takes responsibility for persistence.** This decision itself is fair game in the defense round: be ready to explain *why* your team assigned it where you did, and what changed in that person's workload as a result.

---

## 4. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | A user can create a new room and receive a unique room code |
| FR-2 | A user can join an existing room by entering a valid room code |
| FR-3 | Joining an invalid/expired room code shows a clear error, not a crash |
| FR-4 | All participants in a room see the same document content on join (not a blank editor) |
| FR-5 | Edits made by any participant propagate to all other participants in the same room in near real-time |
| FR-6 | Edits are transmitted as deltas/patches, not full-document payloads |
| FR-7 | The system has a defined, explainable behavior when two participants edit overlapping content closely in time |
| FR-8 | The participant list updates live as users join or leave the room |
| FR-9 | Some live presence signal exists beyond the static participant list (typing indicator, active-editor indicator, or cursor — at least one) |
| FR-10 | Room and document data persist in MongoDB; restarting the server does not erase an in-progress room's content |
| FR-11 | The room host has at least one privilege a regular participant does not have |
| FR-12 | The application is deployed to a live, publicly reachable URL (frontend + backend, on any free-tier hosting) — not demoed only on localhost |

---

## 5. Non-Functional Requirements

- **NFR-1 — Responsiveness:** Edits from one participant should visibly appear for other participants within roughly 1–2 seconds under normal conditions. This is a sprint, not a production SLA — "near real-time," not millisecond-perfect.
- **NFR-2 — Resilience:** A page refresh should not require rebuilding the room from scratch (covered by FR-10 persistence + Domain A reconnect handling).
- **NFR-3 — Explainability:** Every architectural decision in Domain B must be explainable in plain language by the person who owns it, without needing to read their own code first.

---

## 6. Performance Bar (Tiered Scoring Model)

This sprint is scored on a **performance bar**, not winner-takes-all. Every team that clears the Bar passes. Stretch tiers separate strong teams from exceptional ones — they do not determine pass/fail.

### 🟩 BAR (must-have — required to pass)
- [ ] Room creation produces a usable, shareable code
- [ ] Join-by-code works and puts the user into the correct shared document
- [ ] Document edits sync live across all connected clients
- [ ] Sync is delta-based (verified live in defense — see Section 9)
- [ ] At least one deliberate, explainable conflict-handling behavior exists
- [ ] Participant list updates live on join/leave
- [ ] At least one live presence signal beyond the participant list
- [ ] Room/document state persists in MongoDB across a server restart
- [ ] Host has at least one demonstrable privilege
- [ ] Application is deployed to a live, working public link (frontend + backend) — sockets and persistence must work on the deployed version, not just locally
- [ ] All three domains show clear, attributable commit history per owner

### 🟦 STRETCH TIER 1
- [ ] Live cursor position indicators (not just "is typing," but *where*)
- [ ] Additional host controls (kick participant, rename room, lock room from new joins)
- [ ] An edit/activity history or log ("Ankur edited line 12 at 9:42 PM")
- [ ] Graceful handling of a participant's abrupt disconnect (not just refresh)

### 🟪 STRETCH TIER 2
- [ ] A genuinely thoughtful conflict-resolution approach beyond basic last-write-wins — e.g., position-transform logic so concurrent edits don't corrupt each other's intended positions
- [ ] Multiple files/tabs within a single room (each file syncs independently)
- [ ] Per-line or per-region soft-locking with visible UI feedback when a region is "busy"
- [ ] Version history / rollback to a previous document state

Stretch tiers are cumulative — attempt Tier 1 before Tier 2. Partial, well-explained stretch work counts for more in defense than fully working but unexplained stretch work.

---

## 7. Deliverables

Each team must submit:

1. **GitHub repository link** with full commit history from all three members
2. **Live deployed link** — frontend and backend both deployed (any free-tier host: Render, Railway, Vercel, Netlify, Cyclic, etc.), with real-time sync and MongoDB persistence working on the deployed version, not just on localhost
3. **Recorded video walkthrough** (see Section 8 for exact requirements) — the walkthrough must be demonstrated on the live deployed link, not localhost
4. A short **README** in the repo stating:
   - Which member owned which domain
   - Who owned MongoDB persistence and why
   - Your team's chosen conflict-resolution strategy in 3-5 sentences
   - The live deployed link

---

## 8. Video Recording Requirements

Every team submits one recorded video. The video must include:

1. **A live walkthrough of the running project, on the deployed link** — open the deployed app (not localhost), create a room, have multiple participants (can be multiple browser tabs/windows or multiple team members) join and demonstrate live sync actually working over the internet.
2. **Every feature explained on camera** — each team member must speak on camera (or voiceover, but identifiable per speaker) and explain the feature(s) belonging to their domain. A feature shown but never explained by its owner does not count as demonstrated.
3. Recommended structure and rough time budget (not strictly mandated minute-by-minute, but useful for staying under the cap):
   - Quick intro: team name, members, and who owns what domain (~30-45 sec)
   - Domain A walkthrough (room creation/join/host controls) — explained by its owner (~2 min)
   - Domain B walkthrough (live editing + a deliberate demonstration of the conflict scenario — e.g., two people typing in the same spot on purpose) — explained by its owner (~2.5 min)
   - Domain C walkthrough (presence indicators, participant list) — explained by its owner (~2 min)
   - Any stretch goals attempted (~1 min)

**Video duration: strictly under 8 minutes. This is enforced, not a suggestion.** Videos at or over 8:00 will be cut off at the 8-minute mark for evaluation purposes — anything explained after that point will not be considered, regardless of how important it is. This forces your team to prioritize: decide in advance what's worth showing and explaining, rather than narrating every detail. A tight, well-rehearsed 6-minute video that hits every domain clearly will score better than an 8-minute video that rushes the ending.

Plan your time allocation deliberately across the three domains and stretch goals — don't let one person's explanation eat the time budget for the others.

---

## 9. Rules

1. **Every member must have a clearly defined role and domain.** This must be visible in the README and confirmed in the video intro.
2. **Every member must have relevant, attributable commits.** A member with near-zero commits, or only trivial commits (README edits, whitespace), will be flagged individually in the defense round — see Section 10 on proportional accountability.
3. **Every member must explain their feature(s) in the recorded video.** Silence from one team member while another explains their work is not acceptable.
4. **Commit messages must be clear.** Messages like `fix`, `update`, `asdf`, or `final final v2` are not acceptable. Use a format that states what changed and, briefly, why (e.g., `Add delta-based patch broadcasting for concurrent edits`).
5. **Commits must maintain hygiene.** This means committing at logical, incremental steps — not one giant commit at hour 23 that dumps the entire project at once. Commit history should tell the story of how the project was built, not just prove it exists.
6. **No banned libraries.** See Section 0 — Out of Scope. Using Yjs/ShareDB/Automerge or equivalent is a rules violation, not a stretch achievement.
7. **Deployment is mandatory, not optional.** The project must be reachable at a live public URL by the deadline. Any free-tier host is acceptable (Render, Railway, Vercel, Netlify, Cyclic, MongoDB Atlas free tier for the DB, etc.) — host choice doesn't matter, but "it works on my machine" does not satisfy this requirement. A team that misses the deployment requirement does not clear the Bar, regardless of how well the app works locally.
8. **Video duration is capped at 8 minutes, strictly enforced.** Anything beyond the 8-minute mark will not be watched or considered during evaluation. Plan and rehearse your walkthrough in advance — do not treat this as a soft guideline.
9. **Live adversarial defense is mandatory for every team.** Be ready for unscripted "why" questions, live code modifications, and tradeoff justifications targeting any domain — including domains you didn't personally own. (Section 10.)

---

## 10. Defense & Accountability

After submission, each team will face a short live defense session. Expect:

- Unscripted "why did you do X this way" questions aimed at each domain owner specifically
- A live demonstration request — e.g., "open two tabs right now and type in the same line at the same time, walk me through exactly what happens and why"
- Possible small live code modifications requested on the spot, to test whether the explanation matches the actual implementation
- Cross-domain questions — e.g., asking the Realtime owner why a username sometimes shows incorrectly in a presence indicator (which may expose whether they integrated properly with the Auth/Room domain)

**Accountability is individual, not collective.** If the defense and commit history both indicate one or two members carried a disproportionate share of the work while another contributed minimally, scoring reflects that individually — it does not penalize the contributing members for a teammate's shortfall, and it does not let a non-contributing member coast on the team's overall result.

---

## 11. Timeline Reference

| Time | Milestone |
|------|-----------|
| Mon 9:00 PM | Sprint opens — problem statement released, teams finalize role split |
| Tue ~9:00 AM (approx. halfway) | Recommended internal checkpoint — Bar-tier features should be substantially underway |
| Tue 9:00 PM | Hard submission deadline — GitHub repo + video link |
| Post-deadline | Live defense sessions scheduled |

*(Exact checkpoint/defense scheduling to be communicated separately by mentors.)*

**A note on deployment timing:** deploy early and re-deploy incrementally — don't wait until the last hour to deploy for the first time. Free-tier hosts can have cold starts, environment variable issues, and CORS/socket-connection quirks between frontend and backend that take real time to debug. A team with a fully working localhost app and a broken or last-minute deployment will not clear the Bar — treat deployment as a Day-1 task, not a final step.

---

## 12. Final Note

The goal of this sprint is not a working demo alone — plenty of teams will get *something* syncing in 24 hours. The goal is a team that can stand in front of you, point at any line of their code, and explain exactly why it exists, what tradeoff it represents, and what would break if it were removed. Build for that conversation, not just for the video.
