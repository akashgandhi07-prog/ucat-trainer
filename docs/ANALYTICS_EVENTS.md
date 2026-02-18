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
| `trainer_opened`        | User enters trainer page               | training_type, pathname (and mode for syllogism)                |
| `trainer_started`       | User starts a drill                    | training_type, difficulty, passage_id (if applicable), mode     |
| `trainer_completed`     | User finishes a drill and it is saved | training_type, difficulty (or mode for calculator/syllogism)  |
| `trainer_abandoned`     | User leaves mid-drill without saving   | training_type, phase, time_spent_seconds                        |
| `trainer_mode_selected` | Calculator: mode chosen                | training_type, mode, difficulty                                 |

### Auth

| Event      | When           |
|------------|----------------|
| `sign_in`  | User logs in   |
| `sign_out` | User logs out  |
| `sign_up`  | User registers |

### Feature Usage

| Event               | When                     | Properties        |
|--------------------|--------------------------|-------------------|
| `shortcuts_opened` | Calculator shortcuts     | —                 |
| `auth_modal_opened`| Auth modal shown         | trigger (login/register/forgot) |
| `bug_report_opened`| Feedback modal opened    | —                 |
| `dashboard_viewed` | Dashboard loaded         | —                 |

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

## Abandonment

`trainer_abandoned` is sent on `visibilitychange` (tab hidden) or `pagehide` when an active drill exists. Uses `fetch` with `keepalive: true` for reliable delivery.

## Opt-Out

Set `localStorage.setItem("ucat_analytics_opt_out", "true")` to disable event sending.
