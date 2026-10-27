"use strict";
const element = id => document.getElementById(id);
let lastUpdate = 0;
let historySignature = "";

function renderHistory(items) {
  if (!Array.isArray(items)) return;
  const signature = JSON.stringify(items);
  if (signature === historySignature) return;
  historySignature = signature;
  const container = element("history-list");
  container.replaceChildren();
  if (!items.length) {
    container.textContent = "Encara no hi ha partides finalitzades.";
    return;
  }
  [...items].reverse().forEach(item => {
    if (!item || typeof item.title !== "string" ||
        !Array.isArray(item.teams) || item.teams.length !== 2 ||
        !item.teams.every(name => typeof name === "string") ||
        !Array.isArray(item.rounds) || !item.rounds.every(n => n === 0 || n === 1)) return;
    const card = document.createElement("div");
    card.className = "history-item";
    const heading = document.createElement("h3");
    heading.textContent = item.title;
    const teams = document.createElement("p");
    teams.textContent = item.teams.join(" · ");
    const list = document.createElement("ul");
    if (!item.rounds.length) {
      const empty = document.createElement("li");
      empty.textContent = "Sense pulsacions registrades.";
      list.append(empty);
    }
    item.rounds.forEach((winner, index) => {
      const row = document.createElement("li");
      row.textContent = "Ronda " + (index + 1) + ": " + item.teams[winner] + " ha premut primer";
      list.append(row);
    });
    card.append(heading, teams, list);
    container.append(card);
  });
}

const messages = {
  idle: ["Esperant partida", "TOT A PUNT", "L’organitzador està preparant la pròxima partida."],
  ready: ["Partida preparada", "Prepareu-vos!", "La ronda encara no ha començat."],
  waiting: ["Preparant la ronda", "Deixeu anar els polsadors", "Esperant per començar."],
  armed: ["Ronda en joc", "Ara!", "Qui serà el primer a prémer?"],
  won: ["Primer a prémer", "", "Pulsació registrada. Esperant la pròxima ronda."],
  paused: ["Ronda pausada", "Un moment…", "L’organitzador reprendrà la ronda."]
};

window.addEventListener("message", event => {
  if (event.origin !== location.origin || event.source !== window.opener) return;
  const data = event.data;
  if (!data || data.type !== "interenginy-state" ||
      !Object.hasOwn(messages, data.state) ||
      !Array.isArray(data.teams) ||
      data.teams.some(name => typeof name !== "string" || name.length > 40) ||
      (data.state !== "idle" && data.teams.length !== 2) ||
      (data.state === "won" && ![0, 1].includes(data.winner))) return;

  lastUpdate = Date.now();
  element("match-title").textContent = data.state === "idle" ? "" : (data.title || "");
  renderHistory(data.history);
  const message = messages[data.state];
  element("phase").textContent = message[0];
  element("result").textContent = data.state === "won" ? data.teams[data.winner] : message[1];
  element("detail").textContent = message[2];
  element("teams").hidden = data.state === "idle";
  [0, 1].forEach(index => {
    const won = data.state === "won" && data.winner === index;
    element("name" + (index + 1)).textContent = data.teams[index] || "";
    element("team" + (index + 1)).classList.toggle("winner", won);
    element("mark" + (index + 1)).textContent =   won ? "HA PREMUT PRIMER!" : "";
  });
  element("connection").textContent = "En directe";
});

function requestState() {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({type: "interenginy-request"}, location.origin);
  }
  if (lastUpdate && Date.now() - lastUpdate > 7000) {
    element("phase").textContent = "Connexió interrompuda";
    element("result").textContent = "Esperant l’organitzador";
    element("detail").textContent = "La informació de la partida no s’està actualitzant.";
    element("teams").hidden = true;
    element("connection").textContent = "Torna al panell de l’organitzador.";
  }
}
requestState();
setInterval(requestState, 2000);

element("fullscreen").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    element("connection").textContent = "Pots prémer F11 per ampliar la finestra.";
  }
};
document.addEventListener("fullscreenchange", () => {
  element("fullscreen").textContent = document.fullscreenElement
    ? "Sortir de pantalla completa" : "Pantalla completa";
});
