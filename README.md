# Marketo Event Check-In

Mobile/tablet-friendly event check-in app, branded with the Knak design
system, synced to a Marketo program.

- **server/** — Node/Express API. Holds the Marketo credentials (never
  exposed to the browser) and a small local JSON store for the event's
  live check-in state.
- **client/** — React (Vite) frontend. Dark, Knak-branded, mobile-first
  with a bottom-friendly tab layout.

## How it works

1. **Choose an event** — on first load (or by tapping the event name in the
   header at any time) the app opens a folder browser starting at
   `MARKETO_ROOT_FOLDER_ID`. Click through subfolders (breadcrumbs at the
   top let you jump back up) until you reach the program you want, or
   search the current folder to filter its subfolders/programs — this uses
   the same fuzzy matching as the people search below, so a typo still
   finds the right one.
2. **Pull Registrants** — fetches everyone currently in the Marketo program
   and lists them under the **Registered** tab.
3. **Check In** — tap a registrant to move them to **Checked-In**. They're
   tagged `Registered`.
4. **Add walk-in** (the `+` button) — check in someone who never registered.
   Email is the first field: leave it and the form auto-fills their name
   and company if Marketo already knows them. See "Walk-in email lookup"
   below. They land in **Checked-In** tagged `Unregistered`.
5. **Undo** — moves a checked-in registrant back to Registered; removes a
   walk-in entirely.
6. **Sync to Marketo** (after the event) —
   - Everyone in **Checked-In** → Program Member status `Attended`
     (walk-ins are created/matched as Marketo leads and added to the
     program at this point).
   - Everyone left in **Registered** (never checked in) → `No Show`.

Tap the event name in the header at any time to reopen the event picker
and switch to a different event.

Both the event picker and the people search (across either tab) use fuzzy
matching (Fuse.js), so a typo like "Chenn" still finds "Chen", or
"Dremforce Both" still finds "Dreamforce-Booth".

State lives in `server/data/event-state.json` — safe to delete between
events to start fresh (or use `POST /api/state/reset`).

## Walk-in email lookup

Leaving the email field on the walk-in form checks this event's
already-pulled registrants first (instant, no Marketo call) and, on a
miss, falls back to a live Marketo email lookup — first/last name and
company auto-fill if a match is found, and every field stays editable.
Switching to a different email clears out whatever the previous match
filled in first, so leftover details never linger under a new address.
A field staff already typed into themselves is never overwritten,
whatever the lookup finds. A miss, or Marketo being unreachable, just
leaves the form blank exactly as if this didn't exist — it never blocks
a walk-in check-in.

## Setup

```bash
cd server && npm install
cd ../client && npm install
```

Fill in `server/.env` (copied from `server/.env.example`):

```
MARKETO_MUNCHKIN_ID=
MARKETO_CLIENT_ID=
MARKETO_CLIENT_SECRET=
MARKETO_PROGRAM_ID=
MARKETO_ATTENDED_STATUS=Attended
MARKETO_NO_SHOW_STATUS=No Show
```

- `MARKETO_MUNCHKIN_ID` / `MARKETO_CLIENT_ID` / `MARKETO_CLIENT_SECRET` —
  from a Marketo LaunchPoint custom service (Admin > LaunchPoint).
- `MARKETO_PROGRAM_ID` — the numeric Program Id (not the program name) of
  the event to check in against. Can be overridden per-request later if
  you want to support switching events without restarting the server.
- `MARKETO_ATTENDED_STATUS` / `MARKETO_NO_SHOW_STATUS` — must exactly
  match the Program Member status values configured on that program's
  channel (Admin > Tags/Channels), e.g. "Attended" / "No Show".

## Run

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client && npm run dev
```

Client runs at http://localhost:5173 and proxies `/api` to the server on
port 4000.

## VPN access when the backend isn't public

If this app is hosted somewhere only reachable over a VPN (common for an
internal deployment), every check-in device needs a VPN connection to reach
it. Some VPN providers have a solid Android client but no usable iPhone app —
if that's your situation, one lightweight workaround that's worked in the
field:

1. Set up one Android device with the VPN client installed and connected
   (it doesn't need to be used for check-in itself — just for its VPN
   connection).
2. Turn on that Android device's personal hotspot.
3. Have iPhone-based check-in staff join that hotspot instead of the venue
   Wi-Fi.

Their traffic then routes through the Android device's VPN tunnel, so the
app's URL loads normally even though iOS itself never runs a VPN client.
Test this at your venue ahead of time — hotspot range and the Android
device's battery drain are the main practical limits, so keep it charging
if you can.

## Notes / things to confirm once we have a real program to test with

- **Walk-in → program membership**: the app relies on Marketo's "Change
  Program Status" endpoint implicitly adding a lead to the program when
  you set their status — this is standard Marketo behavior, but worth
  confirming on your instance during the first real test.
- **Status values**: `Attended` / `No Show` must be real status values on
  the test program's channel or the sync call will fail — grab the exact
  strings from the program's channel setup.
- Multiple check-in stations are supported: every device talks to the
  same backend, so there's one shared source of truth and no duplicate
  check-in records. Each device also polls for updates every 4 seconds
  while an event is loaded, so a check-in made on one phone shows up on
  the others shortly after, without anyone needing to manually refresh.

## License

This project's source code is MIT licensed — see [LICENSE](LICENSE). The
Knak name, logo, and branding are trademarks of Knak and are not covered
by that license.
