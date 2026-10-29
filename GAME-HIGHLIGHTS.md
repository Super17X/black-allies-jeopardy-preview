# End-of-game highlights

The summary shows individual-player awards for points earned on correct answers (MVP), correct answers, nonblank submissions, largest locked wager, successful steals, personal answer streak, Daily Double wins, correct Final gains and accepted buzzes. MVP is gross earned points before deductions; game winners still use final standings. Awards apply to individuals in team games. Ties share awards; zero-result awards say Not earned this game. Tiebreaks are excluded.

Full-session award events persist in the existing browser recovery snapshot separately from the capped host review list. Corrections recompute awards, including after restoration. Answer undo removes the associated award events; resets clear all tracking. Pre-update saves display a partial-history notice rather than inferred full-game totals. Final outcomes and wagers appear only in the completed summary.

Run npm run test:highlights for full-history, tie, correction, restore, undo and reset coverage. Existing multiplayer suites remain separate.

Recovery branch created before implementation: recovery/before-game-highlights-2026-10-28 at f53e05400ddb4a2ef7a13f4ff9e8da9b6b7603eb. Restore code by creating a branch from this recovery point and merging a reviewed restore diff; the branch does not back up browser-local game data.
