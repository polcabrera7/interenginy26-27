"use strict";

const $ = id => document.getElementById(id);

let teams = [];
let state = "idle";
let match = [];
let winner = null;

const held = new Set();
let publicWindow = null;
let matchTitle = "";
let rounds = [];
let history = [];
try {
  const saved = JSON.parse(localStorage.getItem("interenginy-history") || "[]");
  if (Array.isArray(saved)) history = saved.filter(item =>
    item && typeof item.id === "string" && typeof item.title === "string" &&
    Array.isArray(item.teams) && item.teams.length === 2 &&
    item.teams.every(name => typeof name === "string") &&
    Array.isArray(item.rounds) && item.rounds.every(n => n === 0 || n === 1) &&
    typeof item.finishedAt === "string"
  );
} catch {}

function saveHistory() {
  try {
    localStorage.setItem("interenginy-history", JSON.stringify(history));
    $("history-warning").textContent = "";
  } catch {
    $("history-warning").textContent =
      "No s’ha pogut desar l’historial. Es conservarà només mentre aquesta pàgina estigui oberta.";
  }
}

function renderHistory() {
  $("history-admin").replaceChildren();
  if (!history.length) {
    $("history-admin").textContent = "Encara no hi ha partides finalitzades.";
    return;
  }
  [...history].reverse().forEach(item => {
    const row = document.createElement("div");
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.id = "history-" + item.id;
    label.htmlFor = input.id;
    label.textContent = item.teams.join(" · ");
    input.value = item.title;
    input.maxLength = 80;
    input.setAttribute("aria-label", "Nom de la partida: " + item.title);
    input.onchange = () => {
      item.title = input.value.trim() || item.title;
      input.value = item.title;
      saveHistory();
      publishPublic();
    };
    const detail = document.createElement("p");
    detail.className = "subtle";
    detail.textContent = item.rounds.length
      ? item.rounds.map((winner, i) => "Ronda " + (i + 1) + ": " + item.teams[winner] + " prem primer").join(" · ")
      : "Sense pulsacions registrades.";
    const remove = document.createElement("button");
remove.type = "button";
remove.textContent = "Eliminar partida";
remove.setAttribute("aria-label", "Eliminar partida: " + item.title);

remove.onclick = () => {
  history = history.filter(entry => entry.id !== item.id);
  saveHistory();
  renderHistory();
  publishPublic();
};

row.append(label, input, detail, remove);
    $("history-admin").append(row);
  });
}

$("match-title").addEventListener("input", () => {
  if (state === "idle") return;
  matchTitle = $("match-title").value.trim() || "Partida sense nom";
  publishPublic();
});


function publishPublic() {
  if (!publicWindow || publicWindow.closed) return;
  publicWindow.postMessage({
    type: "interenginy-state",
    state,
    teams: [...match],
    title: matchTitle,
    history,
    winner
  }, location.origin);
}

$("open-public").onclick = () => {
  publicWindow = window.open("public.html", "interenginy-public", "popup,width=1200,height=800");
  $("public-help").textContent = publicWindow
    ? "Mou la finestra al projector. Després torna al panell per començar la ronda."
    : "El navegador ha bloquejat la finestra. Permet les finestres emergents i torna-ho a provar.";
};

window.addEventListener("message", event => {
  if (event.origin !== location.origin || event.source !== publicWindow) return;
  if (event.data?.type === "interenginy-request") publishPublic();
});


// Recuperar els equips desats en aquest navegador.
try {
  const saved = JSON.parse(
    localStorage.getItem("primero-teams") || "[]"
  );

  if (Array.isArray(saved)) {
    teams = [...new Set(saved.filter(
      name => typeof name === "string" &&
              name.trim() &&
              name.length <= 40
    ))];
  }
} catch {}

function validate() {
  $("create").disabled =
    teams.length < 2 ||
    !$("left").value ||
    $("left").value === $("right").value;
}

function refreshTeams() {
  const previous = [$("left").value, $("right").value];

  $("teams").replaceChildren(
    ...teams.map(name => {
      const item = document.createElement("li");

      const label = document.createElement("span");
      label.textContent = name;
      label.style.flex = "1";
      label.style.minWidth = "0";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Eliminar";
      remove.setAttribute("aria-label", "Eliminar equip " + name);
      remove.style.padding = "6px 10px";
      remove.style.fontSize = "12px";

      remove.onclick = () => {
        if (state !== "idle") {
          $("error").textContent =
            "Finalitza la partida abans d’eliminar equips.";
          return;
        }

        teams = teams.filter(team => team !== name);

        try {
          localStorage.setItem("primero-teams", JSON.stringify(teams));
        } catch {
          $("storage").textContent =
            "No s’han pogut desar els canvis en aquest navegador.";
        }

        $("error").textContent = "";
        refreshTeams();
      };

      item.append(label, remove);
      return item;
    })
  );

  ["left", "right"].forEach((id, index) => {
    $(id).replaceChildren(
      ...teams.map(name => new Option(name, name))
    );

    $(id).value = teams.includes(previous[index])
      ? previous[index]
      : teams[index] || teams[0] || "";
  });

  $("empty").hidden = teams.length >= 2;
  validate();
}

// Registrar un equip.
$("form").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("name").value.trim().replace(/\s+/g, " ");

  if (!name) {
    $("error").textContent = "Escriu un nom.";
    return;
  }

  const exists = teams.some(
    team => team.toLocaleLowerCase("ca") ===
            name.toLocaleLowerCase("ca")
  );

  if (exists) {
    $("error").textContent = "Aquest equip ja està registrat.";
    return;
  }

  teams.push(name);

  try {
    localStorage.setItem("primero-teams", JSON.stringify(teams));
  } catch {
    $("storage").textContent =
      "Els noms només es conservaran mentre aquesta pàgina continuï oberta.";
  }

  $("name").value = "";
  $("error").textContent = "";
  refreshTeams();
});

$("left").onchange = validate;
$("right").onchange = validate;

// Actualitzar la pantalla.
function render() {
  publishPublic();
  $("buzz1").disabled = state !== "armed";
  $("buzz2").disabled = state !== "armed";

  $("card1").classList.toggle("winner", winner === 0);
  $("card2").classList.toggle("winner", winner === 1);

  $("start").disabled =
    state === "armed" || state === "waiting";

  const buttonTexts = {
    ready: "Començar partida",
    won: "Nova ronda",
    paused: "Reprendre ronda",
    waiting: "Deixeu anar els polsadors…",
    armed: "Ronda en joc"
  };

  $("start").textContent = buttonTexts[state] || "Començar partida";

  const messages = {
    ready: [
      "Partida preparada",
      "Tot a punt per començar",
      "Els polsadors estan bloquejats fins que comenci la partida."
    ],
    waiting: [
      "Preparant la ronda",
      "Deixeu anar els polsadors",
      "Deixeu anar els polsadors per començar la ronda."
    ],
    armed: [
      "Ronda en joc",
      "Ara!",
      "Esperant la primera pulsació."
    ],
    won: [
      "Primer a prémer",
      match[winner] || "",
      "Polsadors bloquejats. Inicia una altra ronda quan vulguis."
    ],
    paused: [
      "Ronda pausada",
      "La pàgina ha deixat d’estar activa",
      "Reprèn la ronda quan tots dos equips estiguin preparats."
    ]
  };

  const message = messages[state];

  if (message) {
    $("phase").textContent = message[0];
    $("result").textContent = message[1];
    $("detail").textContent = message[2];
  }
}

// Crear una partida entre els equips seleccionats.
$("create").onclick = () => {
  if ($("create").disabled) return;

  match = [$("left").value, $("right").value];
  matchTitle = $("match-title").value.trim() || "Partida " + (history.length + 1);
  $("match-title").value = matchTitle;
  rounds = [];
  winner = null;
  state = "ready";

  $("name1").textContent = match[0];
  $("name2").textContent = match[1];

  $("setup").hidden = true;
  $("placeholder").hidden = true;
  $("arena").hidden = false;

  render();
};

// Esperar que tots dos jugadors deixin anar les tecles.
function arm() {
  if (state !== "waiting") return;

  if (!held.has("KeyA") && !held.has("KeyL")) {
    state = "armed";
  }

  render();
}

$("start").onclick = () => {
  if (!["ready", "won", "paused"].includes(state)) return;

  prepararSo();

  winner = null;
  state = "waiting";
  arm();
};

// Només s’accepta la primera pulsació de cada ronda.
function buzz(team) {
  if (state !== "armed") return;

  winner = team;
  rounds.push(team);
  state = "won";

  sonarPulsacio();
  render();
}

$("buzz1").onclick = () => buzz(0);
$("buzz2").onclick = () => buzz(1);

$("end").onclick = () => {
  if (state === "idle") return;
  history.push({
    id: crypto.randomUUID(),
    title: matchTitle,
    teams: [...match],
    rounds: [...rounds],
    finishedAt: new Date().toISOString()
  });
  saveHistory();
  renderHistory();
  matchTitle = "";
  rounds = [];
  $("match-title").value = "";
  state = "idle";
  winner = null;
  match = [];

  $("arena").hidden = true;
  $("setup").hidden = false;
  $("placeholder").hidden = false;
  publishPublic();
};

// Simulació amb les tecles A i L.
document.addEventListener("keydown", event => {
  if (!["KeyA", "KeyL"].includes(event.code)) return;

  if (
    event.target.matches("input, textarea, select") ||
    event.target.isContentEditable
  ) return;

  event.preventDefault();

  if (event.repeat || held.has(event.code)) return;

  held.add(event.code);
  buzz(event.code === "KeyA" ? 0 : 1);
});

document.addEventListener("keyup", event => {
  held.delete(event.code);
  arm();
});

// Pausar si es canvia de finestra durant una ronda.
window.addEventListener("blur", () => {
  held.clear();

  if (["armed", "waiting"].includes(state)) {
    state = "paused";
    render();
  }
});

refreshTeams();

renderHistory();

let audioContext = null;

function prepararSo() {
  try {
    if (!audioContext) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audioContext = new Audio();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
  } catch {
    // La partida continua encara que l’àudio no estigui disponible.
  }
}

function sonarPulsacio() {
  if (!audioContext || audioContext.state !== "running") return;

  const ara = audioContext.currentTime;
  const nota = audioContext.createOscillator();
  const volum = audioContext.createGain();

  nota.type = "sine";
  nota.frequency.setValueAtTime(880, ara);
  nota.frequency.setValueAtTime(1175, ara + 0.12);

  volum.gain.setValueAtTime(0, ara);
  volum.gain.linearRampToValueAtTime(0.2, ara + 0.015);
  volum.gain.setValueAtTime(0.2, ara + 0.20);
  volum.gain.linearRampToValueAtTime(0, ara + 0.40);

  nota.connect(volum);
  volum.connect(audioContext.destination);

  nota.start(ara);
  nota.stop(ara + 0.42);

  nota.onended = () => {
    nota.disconnect();
    volum.disconnect();
  };
}
