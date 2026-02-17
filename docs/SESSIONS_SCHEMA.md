# Sessions table schema

The app expects a Supabase table `sessions` with the following shape. RLS must restrict access by `auth.uid()` (see [SUPABASE_RLS.md](./SUPABASE_RLS.md)).

## Columns

| Column          | Type         | Nullable | Description                                      |
|-----------------|--------------|----------|--------------------------------------------------|
| id              | uuid         | no       | Primary key (default: `gen_random_uuid()`)      |
| user_id         | uuid         | no       | References `auth.users(id)`; set to `auth.uid()` |
| training_type   | text         | no       | One of: `speed_reading`, `rapid_recall`, `keyword_scanning` |
| wpm             | integer      | yes      | Words per minute (speed_reading only)            |
| correct         | integer      | no       | Number of correct answers                        |
| total           | integer      | no       | Total questions or targets                       |
| created_at      | timestamptz  | no       | Default: `now()`                                |
| passage_id      | text         | yes      | Optional; used for speed_reading                |
| wpm_rating      | text         | yes      | Optional; one of: `too_slow`, `slightly_slow`, `just_right`, `slightly_fast`, `too_fast` (speed_reading) |

## RLS

- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id` (and app always sends `user_id = auth.uid()`)
