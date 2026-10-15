"use strict";

const $ = id => document.getElementById(id);

let teams = [];
let state = "idle";
let match = [];
let winner = null;

const held = new Set();

// Recuperar los equipos guardados en este navegador.
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
      item.textContent = name;
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

// Registrar un equipo.
$("form").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("name").value.trim().replace(/\s+/g, " ");

  if (!name) {
    $("error").textContent = "Escribe un nombre.";
    return;
  }

  const exists = teams.some(
    team => team.toLocaleLowerCase("es") ===
            name.toLocaleLowerCase("es")
  );

  if (exists) {
    $("error").textContent = "Ese equipo ya está registrado.";
    return;
  }

  teams.push(name);

  try {
    localStorage.setItem("primero-teams", JSON.stringify(teams));
  } catch {
    $("storage").textContent =
      "Los nombres solo se conservarán mientras esta página siga abierta.";
  }

  $("name").value = "";
  $("error").textContent = "";
  refreshTeams();
});

$("left").onchange = validate;
$("right").onchange = validate;

// Actualizar la pantalla.
function render() {
  $("buzz1").disabled = state !== "armed";
  $("buzz2").disabled = state !== "armed";

  $("card1").classList.toggle("winner", winner === 0);
  $("card2").classList.toggle("winner", winner === 1);

  $("start").disabled =
    state === "armed" || state === "waiting";

  const buttonTexts = {
    ready: "Empezar partida",
    won: "Nueva ronda",
    paused: "Reanudar ronda",
    waiting: "Suelta A y L…",
    armed: "Ronda en juego"
  };

  $("start").textContent = buttonTexts[state] || "Empezar partida";

  const messages = {
    ready: [
      "Partida preparada",
      "Todo listo para empezar",
      "Los pulsadores están bloqueados hasta empezar."
    ],
    waiting: [
      "Preparando ronda",
      "Soltad los pulsadores",
      "Suelta las teclas A y L para habilitar la ronda."
    ],
    armed: [
      "Ronda en juego",
      "¡Ahora!",
      "Esperando la primera pulsación."
    ],
    won: [
      "Primero en pulsar",
      match[winner] || "",
      "Pulsadores bloqueados. Inicia otra ronda cuando quieras."
    ],
    paused: [
      "Ronda pausada",
      "La página perdió el foco",
      "Reanuda cuando ambos equipos estén preparados."
    ]
  };

  const message = messages[state];

  if (message) {
    $("phase").textContent = message[0];
    $("result").textContent = message[1];
    $("detail").textContent = message[2];
  }
}

// Crear una partida entre los equipos seleccionados.
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

// Esperar a que ambos jugadores suelten las teclas.
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

// Solo se acepta la primera pulsación de cada ronda.
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

// Simulación con las teclas A y L.
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

// Pausar si se cambia de ventana durante una ronda.
window.addEventListener("blur", () => {
  held.clear();

  if (["armed", "waiting"].includes(state)) {
    state = "paused";
    render();
  }
});

refreshTeams();
