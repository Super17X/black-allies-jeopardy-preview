TRIVIA BUZZER — RELIABILITY UPDATE

INSTALL BOTH FILES TOGETHER
Extract this ZIP. Replace index.html and buzzer.html in the root of the branch selected in GitHub Settings > Pages for black-allies-jeopardy-preview. Copy the included assets/metal_gear_solid.mp3 into the existing assets folder and retain every other asset. Keep config.js, settings JavaScript, and Supabase configuration unchanged. Wait for Pages deployment; reload host and phones; start a new test room. Older host/buzzer files are not compatible with this protocol version.

SOURCE
Phone based on your uploaded buzzer (6).html. Host based on the most recent matched host created in this conversation, retaining the classic boxes, centered countdown, local SVG QR, larger landing mascot, and buzz time display.

IMPROVEMENTS
Persistent per-device IDs and duplicate name rejection; explicit ready values; per-game command IDs and expiry; duplicate command result cache; separate host acceptance/rejection feedback; no offline replay of gameplay; repeated tap/Enter protection; ordered host events; malformed-payload checks and input limits; disconnect disables controls; reconnect and visibility recovery; pending action/leave cleanup; one Final-state handler; Final answer countdown on phones; existing mute/volume behavior retained.

SECURITY LIMIT
Device IDs, host IDs, event ordering, and browser rate limits reduce accidental cross-talk and stale actions. They are not cryptographic authentication or a trusted server boundary. A participant who can publish to the public room can imitate these fields. Strong anti-spoofing needs authenticated private Realtime channels and backend authorization. No Supabase policies, keys, or settings were changed.

TESTS
Simulated multi-window DOM and transport tests pass. See TEST-RESULTS.txt. Tests are included under tests/ and can be run with npm install followed by npm test. They do not contact Supabase or change its settings.

LIVE ACCEPTANCE
Verify actual Android QR scan, simultaneous phones, network interruption, background/resume, audio output, Daily Double, ties, and the rendered host layout after deployment. Those live/device checks were not performed with this package.

</ gibbs/>
