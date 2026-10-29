# Large rooms (30–50 players)

The roster has no fixed player cap. This update reduces room-wide traffic for larger events:

- Healthy phones use the authoritative host snapshots instead of requesting four additional room broadcasts every 1.5 seconds.
- Join and resync requests received within 100 ms share one latest-state broadcast batch.
- Latest review decision IDs travel together in gameplay snapshots instead of a separate message per player per snapshot.
- Host relay errors clear the connected flag so reconnecting traffic queues until subscription resumes.

Run `npm run test:capacity` after installing dependencies. The deterministic mocked-relay test registers 50 device identities, checks batched reconnect requests, readiness, equal scoring for 50 answers, saved-session restoration, decision recovery payloads, and a healthy phone's sync traffic. Existing answer, recovery, and host tests remain separate. This is a functional simulation, not a live-network load benchmark.

Before a 30+ person event, run the host pre-event and buzzer checks on the actual venue Wi-Fi. Confirm the Supabase project has enough concurrent connections for every player plus the board and mobile hosts, and enough Realtime message throughput for broadcast fan-out. The repository does not expose the project's current plan or quotas. Keep the host board awake and connected. A live 30–50 device rehearsal is still needed to validate latency, simultaneous buzzes and relay throttling; this change does not certify unlimited capacity.

Baseline recovery commit: f8c7ae4396af4fe3fda1cfb4dd9de66c665aeccf.

## Roster and score display

Player labels now show the registered count without an artificial eight-player denominator. The waiting-room roster has a bounded, keyboard-focusable scroll region and compact cards; readiness changes retain scroll position and keyboard focus. Start controls remain below the bounded roster. The board has an All scores button with a searchable live standings dialog that uses the existing ranked markup and closes on board exit. The game clock continues while standings are open.

Recovery branches created before UI edits:
- `recovery/before-35-player-ui-2026-10-28`: live main at `f8c7ae4396af4fe3fda1cfb4dd9de66c665aeccf`.
- `recovery/before-roster-ui-capacity-work`: prior capacity work at `25f32bce538829cfedd7a50a0aabf8659acb5cd6`.

To restore code, create a restore branch from the appropriate recovery branch and review its diff against main before merging. Branches restore code/assets, not browser-local game state; export the game recovery file before an event.
