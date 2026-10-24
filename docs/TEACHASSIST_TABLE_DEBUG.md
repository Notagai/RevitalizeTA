# Local TeachAssist table capture (debug branch only)

Branch: `debug/teachassist-table-capture` (based on `mainappwork`).

This is an **isolated, temporary diagnostic**. It does not modify `mainappwork`, and it does not send your school HTML to a localhost web server, GitHub, or any external app automatically.

## What it captures

When the app reads a course list or a course report, it generates a sanitized HTML file that retains the layout of tables, rows, cells, nested tables, safe static HTML attributes, link **types**, and approximate patterns such as "course title", "date", "mark", or "no grade". Every cell's actual text is replaced with a synthetic label or invented example value.

The output never copies original course titles, student IDs, grades, cookie contents, credentials, response headers, or original links. Raw HTML is not held by the recorder or written to disk.

## How to reproduce on your Android emulator

```powershell
cd C:\Dev\RevitalizeTA
git fetch origin
git switch debug/teachassist-table-capture
git pull origin debug/teachassist-table-capture
npx expo start --clear
```

1. Reload the emulator application.
2. Open **Sign in** and attempt the school login once.
3. When the red error panel appears, tap **View redacted table HTML**.
4. Tap **Open local HTML preview** to write the **sanitized** content to the emulator's app cache and open it using a local HTML viewer, if one is available. No web server is required.
5. Alternatively, tap **Share redacted HTML** to send the output via Android's share sheet or long-press the selectable HTML text to copy it.
6. Save the sanitized text as `teachassist-redacted.html` and attach it in the ChatGPT conversation. **Do not commit or post a raw school response.** Verify the HTML contains only synthetic values before sharing.

The debug output includes one of two source labels: `course-list` or `course-report`. This is important: the previous generic error may have originated from course *assessment* parsing rather than timetable parsing.

## Next step

Once the generated sanitized file is supplied, use its actual DOM/table structure to write a new fixture-based test and fix the parser **on `mainappwork`**. The debug capture code must stay in this separate branch and must not be merged into production.

## Limits

- This is a locally generated sample of structure, not the real table values.
- Very unusual layouts might need a refined sanitized capture, but never upload raw school data.
- The Android emulator needs to have an HTML preview app installed for the preview action. The Share and selectable-text methods are backups.
- The debug branch has its own draft PR for CI verification; **do not merge the draft PR**.
