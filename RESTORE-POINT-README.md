# BLACK & ALLIES JEOPARDY — RESTORE POINT

## Known-good recovery version
**Created:** October 7, 2026  
**Backup branch:** `RESTORE-POINT-2026-10-07-WAITING-ROOM-WORKING`  
**Known-good commit:** `813686363c7d6bbc450a41a97326787048fc07eb`

This branch preserves the working Black & Allies Jeopardy Preview version immediately after:
- premium Player QR controls
- direct controller answering
- waiting-room full-screen background fix
- waiting-room music lifecycle/fade integration
- existing Supabase/configuration preserved

## IMPORTANT
Do not develop directly on this branch. Treat it as a recovery snapshot.

## Easy restore
If the live/main version ever breaks, restore from this branch or from commit:

`813686363c7d6bbc450a41a97326787048fc07eb`

Git command:

```bash
git checkout main
git reset --hard 813686363c7d6bbc450a41a97326787048fc07eb
git push --force-with-lease origin main
```

Before restoring, make a backup of the then-current main branch if you may want to return to it.

## Note about waiting-room MP3
The code references:
`assets/black_allies_waiting_room_loop.mp3`

If that binary asset is not present in the repository, upload it under that exact filename after a restore.
