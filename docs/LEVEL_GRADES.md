# Level grades and personal estimates

This feature supports Ontario achievement **Levels 1–4** throughout the school report, including course averages, category summaries and explicitly level-graded assignments. Where school HTML provides plus/minus, its raw label (`4+`, `4-`) is retained.

## Grade-source rules

- A published **percentage** remains a published percentage. For example, `current mark = 4%` is **4%** and must never become Level 4.
- A school **Level 4** is displayed as **Level 4**, never 4% or an official 90%.
- Level 4 covers **80–100%**, Level 3 **70–79%**, Level 2 **60–69%**, and Level 1 **50–59%** under Ontario's *Growing Success* achievement standards.
- A province-wide **exact** conversion of Level 4 into one percentage does not exist. The app therefore uses **90% as the midpoint estimate** for Level 4, **74.5% for Level 3**, **64.5% for Level 2**, and **54.5% for Level 1**, only when a better calculation cannot be constructed from graded assessments.
- `+` and `-` suffixes retain the official full level band. They do **not** automatically imply any more specific percentage.
- Dashboard course and combined percentages derived from levels are explicitly **estimated**, not represented as official marks.

Official references:
- https://www.edu.gov.on.ca/eng/policyfunding/growSuccess.pdf
- https://www.ontario.ca/page/growing-success-assessment-evaluation-and-reporting-ontario-schools-kindergarten-grade-12

## How course estimates are calculated

1. Prefer graded assessment percentages and level-based assignments with available weights, using the school's category weightings when published.
2. If a category has a school-reported percentage or level but no usable assessment entries, use that published category data as a fallback.
3. If no usable assessment or category grade exists, use the official *reported course percentage*, if available, otherwise the level band's midpoint as an **estimate**.
4. Missing, exempt, pending, and explicitly **no weight** assessments are excluded. No level is ever silently interpreted as `4%`.
5. The course's school-reported grade field is never changed by student estimates.

## Editable level-graded assignments

- Each explicitly level-graded assignment part exposes a student-only percentage editor with an **Apply** and **Reset** action.
- Only values inside the matching official percentage range are accepted. For instance, Level 4 permits 80–100.
- Edits affect calculated assignment, category, course and dashboard **estimates** only. They never change the course's school-reported grade or the level label.
- Percentage-scored assignments do not have a manual percentage editor.
- Override values remain **in memory for the signed-in session**. Refreshing normally retains applicable overrides, while signing out, changing accounts, or ending the session clears them. No private overrides are written to the synthetic fixture cache.
- If the school changes an assessment's level band, a now-invalid old override is ignored.

## Limitations

- The Android client still depends on the school's actual private HTML; synthetic tests cannot prove that every live score pattern is understood.
- No grade range can determine one exact percentage without an actual percentage reported by a teacher or a student's chosen estimate.
- Assessments without a usable weighting cannot contribute a mathematically reliable weighted average.
- This feature does not imply any ability to edit or submit data to TeachAssist.
