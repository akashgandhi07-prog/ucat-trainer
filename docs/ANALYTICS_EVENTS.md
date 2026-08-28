# Analytics Events Reference

Events are stored in Supabase `analytics_events` table. Admin-only read; anon and authenticated can insert.

## Event Taxonomy

### Page / Navigation

| Event       | When                 | Properties                          |
|------------|----------------------|-------------------------------------|
| `page_view`| Route change, load   | pathname, referrer, title           |

### Per-Trainer

| Event                   | When                                   | Properties                                                      |
|-------------------------|----------------------------------------|-----------------------------------------------------------------|
| `trainer_opened`        | User enters trainer page (mount)       | training_type, pathname (and mode for syllogism)                |
| `trainer_started`       | User starts a drill                    | training_type, difficulty, passage_id (if applicable), mode     |

`trainer_opened` and `trainer_started` are NOT duplicates: `opened` fires once on page mount, `started` fires each time a drill begins (0..n per visit). The admin funnel's "Start rate" is `started / opened`, i.e. how many page visits turn into a drill.
| `trainer_completed`     | User finishes a drill and it is saved | training_type, difficulty (or mode for calculator/syllogism)  |
| `trainer_abandoned`     | User leaves mid-drill without saving   | training_type, phase, time_spent_seconds                        |
| `trainer_mode_selected` | Calculator: mode chosen                | training_type, mode, difficulty                                 |

### Auth

| Event      | When           |
|------------|----------------|
| `sign_in`  | User logs in (genuine logged-out -> logged-in transition only; see note) |
| `sign_out` | User logs out  |
| `sign_up`  | User registers |

`sign_in` is gated in `AuthContext`: supabase-js re-emits `SIGNED_IN` from `_recoverAndRefresh` on every tab hidden -> visible transition and on some token-refresh paths. The event is only written when the `SIGNED_IN` session's user id differs from the user the tab already knew (`INITIAL_SESSION` / previous `SIGNED_IN`), so tab refocus and token refresh do not count. Events are written as one direct `insert` into `analytics_events` per call (no RPC, no batching).

### Feature Usage

| Event               | When                     | Properties        |
|--------------------|--------------------------|-------------------|
| `shortcuts_opened` | Calculator shortcuts     | -                 |
| `auth_modal_opened`| Auth modal shown         | trigger (login/register/forgot) |
| `bug_report_opened`| Feedback modal opened    | -                 |
| `dashboard_viewed` | Dashboard loaded         | -                 |

### Upsells (paid offers)

| Event               | When                         | Properties                                      |
|--------------------|------------------------------|-------------------------------------------------|
| `upsell_impression`| Upsell block enters viewport | offer, placement, course_id (nullable)          |
| `upsell_click`     | User clicks upsell CTA link  | offer, placement, stream, course_id (nullable)  |

**`upsell_impression` is a session-level counter, not a render counter.** It fires at most ONCE per tab session per `(placement, offer, course_id)`, guarded in `sessionStorage` (`ucat_upsell_impressions_seen`) with an in-memory fallback. Read it as "sessions that saw this upsell at least once". `upsell_click` is still written on every click, so any click-through rate computed as `upsell_click / upsell_impression` is **clicks per session that saw the upsell** (can exceed 100% in theory), NOT clicks per render. Historical rows written before 2026-08-22 were one-per-render and are not comparable.

`offer` is one of: `course`, `tutoring`, `package`.  
`course_id` is `june-2026` or `july-2026` when `offer=course`, else omitted/null.  
`placement` examples: `dashboard_hero`, `sidebar`, `post_drill`, `hub_strip`, `planner_banner`, `landing_hero`, `footer`.

## Integration Points

| Location           | Events                                                    |
|--------------------|-----------------------------------------------------------|
| App (router)       | page_view                                                 |
| VerbalReasoningPage| trainer_opened, trainer_started                           |
| ReaderPage         | trainer_started, trainer_completed, clear on results      |
| RapidRecallPage    | trainer_started, trainer_completed                        |
| KeywordScanningPage| trainer_started, trainer_completed                       |
| InferenceTrainerPage| trainer_started, trainer_completed                       |
| CalculatorPage     | trainer_opened, trainer_started, trainer_mode_selected    |
| analyticsStorage   | trainer_completed (when calculator session saved)         |
| Syllogism pages    | trainer_opened, trainer_started (in useSyllogismLogic)     |
| syllogismStorage   | trainer_completed (when syllogism session saved)           |
| AuthContext        | sign_in, sign_out                                         |
| AuthModal          | sign_up, auth_modal_opened                                |
| ShortcutsModal     | shortcuts_opened                                          |
| BugReportModal     | bug_report_opened                                         |
| Dashboard          | dashboard_viewed                                          |
| ProductUpsell      | upsell_impression, upsell_click                           |

## Retention

Raw rows in `analytics_events` are kept for 7 days; the nightly pg_cron job `analytics-events-rollup` runs `rollup_analytics_events(7)`, which aggregates older days into `analytics_events_daily` (grain: day, event_name, is_guest, training_type) and deletes them. Per-user event counts (e.g. `get_admin_new_users.event_counts`) can therefore only cover the last 7 days; the rollup has no `user_id`.

## Abandonment

`trainer_abandoned` is sent on `visibilitychange` (tab hidden) or `pagehide` when an active drill exists. Uses `fetch` with `keepalive: true` for reliable delivery.

## Opt-Out

Set `localStorage.setItem("ucat_analytics_opt_out", "true")` to disable event sending.
