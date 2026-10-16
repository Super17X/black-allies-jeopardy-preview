# Master recovery — October 15, 2026

Original repository: https://github.com/Super17X/black-allies-jeopardy-preview

Frozen game commit: bd0d1dea6973164eff5e84070852823f0998892e
Recovery branch: master-recovery-2026-10-15
Backup branch: backup/master-2026-10-15

This branch contains the frozen game source and tracked assets, plus this recovery guide. The recovery branch points directly to the original game commit without documentation changes.

Included features: remote phone answers, automatic judging and Final progression, optional logged host overrides, configurable 3–30-second control timer, optional Urban Slang, explicit Final answer reveal, and expanding board frame.

## Restore

1. Make a branch from master-recovery-2026-10-15 and review/test it.
2. To restore production while preserving later history, restore the tracked files from the frozen commit onto a new branch, commit, and merge into main. GitHub Pages rebuilds from main.
3. Keep the frozen branch unchanged. Do not force-push it.

## Scope

Git-tracked source, artwork, audio, tests, and commit history are included. GitHub issues, pull-request discussions, repository settings, access permissions, deployment records, secrets, external Supabase configuration/data, and in-progress browser game sessions are not captured by a Git source backup.

The separate backup repository is a point-in-time copy, not an automatic scheduled backup. Enable GitHub Pages there only if needed for a separate recovery deployment.
