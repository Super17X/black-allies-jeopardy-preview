(() => {
  const app = window.BlackAlliesJeopardy = window.BlackAlliesJeopardy || {};

  app.state = app.state || {
    initialized: false,
    players: [],
    round: 1,
    scores: {},
    board: null,
    question: null
  };

  const safeText = (value) => (value == null ? "" : String(value));

  function setButtonTypes() {
    document.querySelectorAll("button:not([type])").forEach((button) => {
      button.setAttribute("type", "button");
    });
  }

  function syncAppState() {
    app.state.initialized = true;
    document.body.dataset.appState = "ready";
  }

  function bootstrap() {
    setButtonTypes();
    syncAppState();

    if (typeof app.onReady === "function") {
      app.onReady();
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });

  app.safeText = safeText;
  app.bootstrap = bootstrap;
})();
