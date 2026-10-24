# Competitive play

Competitive is the default for new games. Controller-first remains available before starting.

- Regular clues: five seconds of shared reading, then everyone may buzz. Early buzzes are rejected by the host. The first accepted eligible buzz gets a fresh answer clock using the configured answer time. Correct answers select the next clue. Daily Doubles remain exclusive to the chooser: a correct answer adds the wager, an incorrect or expired answer deducts it, and no steal follows.
- Steals: one attempt per player per clue, including passes and expired answer turns. Players who already attempted cannot buzz again. There is no five-player attempt cap. After a three-second warning, eligible players can buzz during the configured steal window. An unanswered window reveals the answer.
- Untimed educational play: the host opens buzzers after reading; answer and buzz windows do not expire. The host can reveal an answer when everyone is ready to move on.
- Scoring: regular misses cost zero by default. Optional traditional scoring deducts clue value for an incorrect answer or expired buzzed answer turn. Passing costs zero. Scores may be negative and remain visible. Host scoring corrections account for the original penalty.
- Final: balanced wagers default to at most 50% of each player's positive score, rounded down to whole dollars. Traditional full-positive-score wagers are optional. Scores at or below zero allow a zero wager and participation. Phones show the cap and the gain/loss before submission. The host validates all wagers.
- Ties: tied scores have the same rank and tied winners may share the win. The optional knowledge tiebreak uses simultaneous private answers from tied leaders, with +1 for correct and 0 for incorrect. If still tied, play another unused clue. Team ties use one representative from each tied team. Tournament advancement waits for a single winner.
- Difficulty: all existing clues have editorial difficulty estimates. Clues are ordered by estimated difficulty after selection, even with randomization. These ratings need playtesting. The final report groups observed solve rates by dollar value across up to 20 completed sessions in the same browser, and shows current-session scoring opportunities, lead changes, steals, and whether Final changed the leading group. Recovery exports include current-session metrics.

## Validation

`npm run test:competitive` covers equal buzzer access, reading locks, fresh clocks, six-player steals, repeat-attempt exclusion, difficulty ordering, wager limits, zero/negative scores, shared ties, private knowledge tiebreaks, traditional deductions/corrections, and untimed play.

`npm run test:remote` retains regression coverage for controller-first play, Daily Doubles, original full-score Final rules, normalized answers, reconnects, and recovery.

Visual and network-latency fairness still need testing on event devices; first accepted buzz is determined by arrival at the host.

## Casual groups and learning

Choose **Casual · everyone answers privately** to give every registered player a response on every regular clue. Answers lock once per player, are judged together, and award identical points for correct responses without a speed bonus or deductions. Daily Doubles are disabled in this mode. The chooser rotates; the host continues after a results-and-discussion screen. There is no casual session deadline. Configured answer timers still apply unless educational mode is untimed. Competitive and controller-first presets remain available.

Conversation mode stops internal sounds/music, disables decorative motion, and resets the embedded music player. Visible game messages remain. Player phones inherit the setting and include a manual connection sync control, retry/status feedback, saved answer drafts, and recent score receipts.

Answer matching ignores compact spacing, case, accents, and punctuation before conservative typo tolerance. Different numeric content is not accepted as a typo. Meaningful alternative answers can still require the existing host review/override flow.

Hints now offer reasoning strategies rather than revealing initials. Post-answer explanations connect the answer to the clue, provide additional distinctions for selected common answers, and include discussion prompts. This is not a claim that every clue has a fully authored lesson.

Question rotation prefers unseen material in fixed and randomized layouts. Finite banks eventually repeat; the host is told when reused clues are necessary.

Clue-level observations are stored per play mode in this browser. A rating remains editorial until at least 20 nonblank answer submissions across five sessions are available for that clue. Then an audience-dependent estimate uses observed accuracy. Passes, missing answers, and Daily Doubles are excluded. These minimums are safeguards, not a statistical guarantee that higher dollar values are consistently harder. The results report displays the evidence and identifies insufficient data explicitly.

`npm run test:casual` verifies private collection, simultaneous scoring, partial-round recovery, discussion pacing, rotating control, pass/timeout, normalized formatting, numeric protection, quiet media, content rotation, and the evidence threshold.

## Clear next actions and private mobile host controls

Both the board and player phone display the next action in plain language: join/Ready, choose a clue, read, buzz, answer/pass, wait, lock a Final wager, submit a Final answer, or discuss results. The guidance distinguishes the chooser, buzzer winner, players who already attempted, private submissions, paused play, and a lost connection.

On the board, open **Host Controls → Host-only QR / mobile controls**. Scan that private QR with the host phone. Keep it off the shared projector and never send it to players. The dedicated `host.html` interface mirrors currently available host controls, organized into collapsible groups, and shows the current clue, room state, scores, diagnostics, and recovery tools. The board tab must remain open and connected. Full screen requires a direct click on the board device.

The private link contains a random 256-bit capability in its fragment. Phone and board authenticate and encrypt host messages with AES-GCM; player room codes and player QR codes contain no host capability. Host commands are limited to known current controls, checked against the current turn and availability, expire promptly, and use deduplication receipts that survive a board refresh within the same tab session. The URL fragment is removed from the host phone address bar after pairing; the capability stays in session storage. Recovery exports never include it. This is capability-link access, not account login: anyone possessing the private link has host authority.

**Revoke mobile host access** immediately stops accepting the old capability. Generate a new private QR to reconnect. **Disconnect this phone** removes its stored capability without revoking other paired host phones. HTTPS and Web Crypto are required. No database schema or Supabase configuration changes are needed.

`npm run test:host` checks encrypted pairing, the actual mobile control UI, private fragment handling, replay/stale/disabled/unknown/read-only command rejection, encrypted recovery, and revocation. Real-device camera scanning and mobile-browser behavior still need an event-device check.

## Event messages and returning from practice

The bottom event caption displays only the latest event and hides after two seconds. A later event restarts that timer. Recent messages remain in a collapsed history (Host Controls on the board; Recent game events on a player phone). The reasoning-hint and close-everyone-answer-window buttons live in Host Controls and are available through the private host phone.

Practice links on player remotes carry the room code and use the same tab. Back to my game returns to `buzzer.html` for that room, keeping the device identity, saved name, and answer draft; the board supplies the current clue and scores. Legacy practice pages can infer the room from a same-origin player referrer. A practice page without identifiable room context never falls back to a new board or home screen. Board-launched practice uses a separate tab and returns focus to its original board when available, avoiding a second authoritative board.

`npm run test:ui` checks two-second dismissal, timer restart, host-only button placement, practice-link routing, and reconnection to the exact active room/player/clue with the same score and draft.
