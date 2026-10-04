# Black & Allies Jeopardy — GitHub Pages + Global Buzzer

This version is ready for static hosting on GitHub Pages. The old `server.py` is not required for online play.

## 1. Create a Supabase project
1. Go to https://supabase.com and create a free project.
2. Open **Project Settings → API** (or the project's API keys page).
3. Copy the **Project URL**.
4. Copy the browser-safe **publishable / anon key**. Do **not** use a service-role or secret key.

## 2. Configure the game
Open `config.js` and paste the two values:

```js
window.JEOPARDY_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  supabaseAnonKey: "YOUR-PUBLISHABLE-OR-ANON-KEY"
};
```

Supabase Realtime Broadcast is used only as the live message relay. No database table is required.

## 3. Upload to GitHub
Create a public repository, then upload these files/folders to the repository root:
- `index.html`
- `buzzer.html`
- `config.js`
- `assets/`
- `GITHUB-PAGES-SETUP.md`

The old local-launch files (`server.py`, `START-GAME.command`, `START-GAME-WINDOWS.bat`) are optional and are not needed by GitHub Pages.

## 4. Enable GitHub Pages
In the repository:
1. **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main**
4. Folder: **/(root)**
5. Save

Your game will be available at a URL similar to:
`https://YOUR-USERNAME.github.io/black-allies-jeopardy/`

## 5. Start a game
1. Open `index.html` through your GitHub Pages URL.
2. Click **Buzzer Link** (or the buzzer panel button).
3. The host automatically creates a short room code.
4. Players scan the QR code. The QR URL includes the same room code.
5. Players enter a name. New names are automatically added to the game.
6. When a question starts, phones are enabled to buzz. The first accepted buzz controls the answer input.

## Security note
Only put the browser-safe Supabase publishable/anon key in `config.js`. Never put a service-role key, database password, or other secret in a public GitHub repository.
