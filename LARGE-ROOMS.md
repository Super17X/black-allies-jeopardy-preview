# Large rooms (30–50 players)

The roster has no fixed player cap. This update reduces room-wide traffic for larger events:

- Healthy phones use the authoritative host snapshots instead of requesting four additional room broadcasts every 1.5 seconds.
- Join and resync requests received within 100 ms share one latest-state broadcast batch.
- Latest review decision IDs travel together in gameplay snapshots instead of a separate message per player per snapshot.
- Host relay errors clear the connected flag so reconnecting traffic queues until subscription resumes.

Run `npm run test:capacity` after installing dependencies. The deterministic mocked-relay test registers 50 device identities, checks batched reconnect requests, readiness, equal scoring for 50 answers, saved-session restoration, decision recovery payloads, and a healthy phone's sync traffic. Existing answer, recovery, and host tests remain separate. This is a functional simulation, not a live-network load benchmark.

Before a 30+ person event, run the host pre-event and buzzer checks on the actual venue Wi-Fi. Confirm the Supabase project has enough concurrent connections for every player plus the board and mobile hosts, and enough Realtime message throughput for broadcast fan-out. The repository does not expose the project's current plan or quotas. Keep the host board awake and connected. A live 30–50 device rehearsal is still needed to validate latency, simultaneous buzzes and relay throttling; this change does not certify unlimited capacity.

Baseline recovery commit: f8c7ae4396af4fe3fda1cfb4dd9de66c665aeccf.
