"use strict";

const $ = id => document.getElementById(id);

let teams = [];
let state = "idle";
let match = [];
let winner = null;

const held = new Set();

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
            "Finalitza la partida abans dâ€™eliminar equips.";
          return;
        }

        teams = teams.filter(team => team !== name);

        try {
          localStorage.setItem("primero-teams", JSON.stringify(teams));
        } catch {
          $("storage").textContent =
            "No sâ€™han pogut desar els canvis en aquest navegador.";
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
    $("error").textContent = "Aquest equip ja estÃ  registrat.";
    return;
  }

  teams.push(name);

  try {
    localStorage.setItem("primero-teams", JSON.stringify(teams));
  } catch {
    $("storage").textContent =
      "Els noms nomÃ©s es conservaran mentre aquesta pÃ gina continuÃ¯ oberta.";
  }

  $("name").value = "";
  $("error").textContent = "";
  refreshTeams();
});

$("left").onchange = validate;
$("right").onchange = validate;

// Actualitzar la pantalla.
function render() {
  $("buzz1").disabled = state !== "armed";
  $("buzz2").disabled = state !== "armed";

  $("card1").classList.toggle("winner", winner === 0);
  $("card2").classList.toggle("winner", winner === 1);

  $("start").disabled =
    state === "armed" || state === "waiting";

  const buttonTexts = {
    ready: "ComenÃ§ar partida",
    won: "Nova ronda",
    paused: "Reprendre ronda",
    waiting: "Deixeu anar A i Lâ€¦",
    armed: "Ronda en joc"
  };

  $("start").textContent = buttonTexts[state] || "ComenÃ§ar partida";

  const messages = {
    ready: [
      "Partida preparada",
      "Tot a punt per comenÃ§ar",
      "Els polsadors estan bloquejats fins que comenci la partida."
    ],
    waiting: [
      "Preparant la ronda",
      "Deixeu anar els polsadors",
      "Deixeu anar les tecles A i L per habilitar la ronda."
    ],
    armed: [
      "Ronda en joc",
      "Ara!",
      "Esperant la primera pulsaciÃ³."
    ],
    won: [
      "Primer a prÃ©mer",
      match[winner] || "",
      "Polsadors bloquejats. Inicia una altra ronda quan vulguis."
    ],
    paused: [
      "Ronda pausada",
      "La pÃ gina ha deixat dâ€™estar activa",
      "ReprÃ¨n la ronda quan tots dos equips estiguin preparats."
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

  winner = null;
  state = "waiting";
  arm();
};

// NomÃ©s sâ€™accepta la primera pulsaciÃ³ de cada ronda.
function buzz(team) {
  if (state !== "armed") return;

  winner = team;
  state = "won";
  render();
}

$("buzz1").onclick = () => buzz(0);
$("buzz2").onclick = () => buzz(1);

$("end").onclick = () => {
  state = "idle";
  winner = null;
  match = [];

  $("arena").hidden = true;
  $("setup").hidden = false;
  $("placeholder").hidden = false;
};

// SimulaciÃ³ amb les tecles A i L.
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
