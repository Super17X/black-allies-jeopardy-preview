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
