/** Standalone visual prototype. No NINA imports, I/O, identity or browser media APIs. */
type View = "conversa" | "memorias" | "avisos";
type Scenario = "ready" | "empty" | "loading" | "error" | "expired";
type Voice = "idle" | "recording" | "processing" | "playing";
const examples = [
  { kind: "user", text: "Vamos inventar um passeio num jardim lunar?" },
  { kind: "assistant", text: "Resposta fictícia: podemos imaginar flores azuis e um caminho de estrelas. Este texto está escrito no protótipo; não foi gerado por IA." },
];
const memories = [
  { id: "lunar", claim: "Uma personagem imaginária prefere jardins lunares.", detail: "Proposta fictícia · inferência de exemplo · confiança 0,6" },
  { id: "stars", claim: "Uma personagem inventada desenhou três estrelas verdes.", detail: "Exemplo de afirmação · conteúdo totalmente inventado" },
];

export function mountDemo(doc: Document): () => void {
  const win = doc.defaultView!;
  const find = <T extends HTMLElement>(id: string) => {
    const element = doc.getElementById(id);
    if (!element) throw new Error("Incomplete demo document");
    return element as T;
  };
  const draft = find<HTMLTextAreaElement>("draft"), scenarioSelect = find<HTMLSelectElement>("scenario");
  const messages = find("messages"), voiceStatus = find("voice-status");
  const cleanups: (() => void)[] = [];
  let scenario: Scenario = "ready", voice: Voice = "idle";
  let pendingReview: { id: string; choice: string; origin: HTMLButtonElement } | null = null;
  const decisions = new Map<string, string>();
  function on<K extends keyof HTMLElementEventMap>(element: HTMLElement, name: K, listener: (event: HTMLElementEventMap[K]) => void) {
    element.addEventListener(name, listener); cleanups.push(() => element.removeEventListener(name, listener));
  }
  function text(id: string, value: string) { find(id).textContent = value; }
  function visible(id: string, value: boolean) { find(id).hidden = !value; }
  function addMessage(kind: string, value: string) {
    const article = doc.createElement("article"), byline = doc.createElement("p"), body = doc.createElement("p");
    article.className = `message ${kind}`; byline.className = "byline";
    byline.textContent = kind === "user" ? "Visitante · texto de exemplo" : "NINA · resposta pré-escrita";
    body.textContent = value; article.append(byline, body); messages.append(article);
    // Keep an explicitly bounded, transient DOM. Never store or serialize visitor drafts.
    while (messages.childElementCount > 40) messages.firstElementChild!.remove();
  }
  function resetMessages(empty = false) { messages.replaceChildren(); if (!empty) examples.forEach(example => addMessage(example.kind, example.text)); }
  function updateControls() {
    const blocked = scenario === "loading" || scenario === "expired" || voice !== "idle";
    find<HTMLButtonElement>("send").disabled = blocked;
    find<HTMLButtonElement>("voice-start").disabled = blocked;
    find<HTMLButtonElement>("voice-play").disabled = (blocked && voice !== "playing");
    draft.disabled = scenario === "expired";
    visible("voice-start", voice === "idle"); visible("voice-stop", voice === "recording");
    visible("voice-result", voice === "processing"); visible("voice-cancel", voice !== "idle");
    visible("voice-play", voice === "idle" || voice === "playing");
    text("voice-play", voice === "playing" ? "Parar reprodução simulada" : "Simular reprodução");
  }
  function stopVoice(message = "Simulação de voz parada.") { voice = "idle"; voiceStatus.textContent = message; updateControls(); }
  function setScenario(next: Scenario) {
    scenario = next; scenarioSelect.value = next; stopVoice();
    const labels: Record<Scenario, string> = {
      ready: "Pronta para experimentar. As respostas são sempre exemplos pré-escritos.",
      empty: "Conversa vazia de exemplo. Adiciona uma mensagem fictícia.",
      loading: "A preparar resposta — estado visual simulado, sem pedido a IA. Escolhe Pronta para continuar.",
      error: "Erro visual de exemplo. O rascunho é mantido apenas neste ecrã.",
      expired: "Sessão expirada — exemplo visual. Não existe uma sessão ou autenticação real.",
    };
    text("scenario-status", labels[next]); visible("scenario-error", next === "error");
    text("scenario-error", next === "error" ? "Exemplo: não foi possível obter uma resposta. Nenhum serviço foi contactado." : "");
    visible("resume", next === "expired");
    if (next === "empty" || next === "expired") resetMessages(true);
    updateControls();
  }
  function send() {
    if (scenario === "loading" || scenario === "expired" || voice !== "idle") return;
    const value = draft.value.trim().slice(0, 500);
    if (!value) { text("scenario-status", "Escreve apenas texto inventado ou usa o botão de texto fictício."); draft.focus(); return; }
    addMessage("user", value);
    addMessage("assistant", "Resposta fictícia pré-escrita: este cartão mostra como uma resposta aparece no ecrã. Não interpretei a mensagem nem guardei uma memória.");
    draft.value = ""; setScenario("ready"); draft.focus();
  }
  function closeReview(focus = false) {
    const origin = pendingReview?.origin; pendingReview = null; visible("review-preview", false);
    if (focus && origin?.isConnected) origin.focus();
  }
  function navigate(focus: boolean) {
    const hash = win.location.hash.slice(1);
    const view: View = hash === "memorias" || hash === "avisos" ? hash : "conversa";
    doc.querySelectorAll<HTMLElement>("[data-panel]").forEach(panel => { panel.hidden = panel.dataset.panel !== view; });
    doc.querySelectorAll<HTMLAnchorElement>("nav [data-view]").forEach(link => {
      if (link.dataset.view === view) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    closeReview(); stopVoice();
    if (focus) doc.querySelector<HTMLElement>(`[data-panel="${view}"] h2`)?.focus();
  }
  function showMemories() {
    const list = find("memory-list"); list.replaceChildren();
    for (const memory of memories) {
      const article = doc.createElement("article"), title = doc.createElement("h3"), detail = doc.createElement("p"), status = doc.createElement("p"), actions = doc.createElement("div");
      article.className = "card"; title.textContent = memory.claim; detail.textContent = memory.detail;
      status.textContent = decisions.get(memory.id) ?? "Pendente · exemplo"; status.dataset.memoryStatus = memory.id; actions.className = "actions";
      for (const choice of ["Confirmar", "Rejeitar"]) {
        const button = doc.createElement("button"); button.type = "button"; button.textContent = `${choice} exemplo`;
        button.addEventListener("click", () => {
          pendingReview = { id: memory.id, choice, origin: button };
          text("review-claim", memory.claim); text("review-choice", `${choice}: esta escolha só altera a demonstração, sem guardar dados ou confirmar factos.`);
          visible("review-preview", true); find("review-title").focus();
        }); actions.append(button);
      }
      article.append(title, detail, status, actions); list.append(article);
    }
  }
  on(find("send"), "click", send);
  on(draft, "keydown", event => { if (event.key === "Enter" && !event.shiftKey && !event.isComposing) { event.preventDefault(); send(); } });
  on(find("preset"), "click", () => { if (scenario === "expired") return; draft.value = "Vamos imaginar um jardim na lua?"; draft.focus(); });
  on(scenarioSelect, "change", () => { const value = scenarioSelect.value; if (["ready", "empty", "loading", "error", "expired"].includes(value)) setScenario(value as Scenario); });
  on(find("resume"), "click", () => { setScenario("ready"); draft.focus(); });
  on(find("voice-start"), "click", () => { if (scenario === "loading" || scenario === "expired" || voice !== "idle") return; voice = "recording"; voiceStatus.textContent = "Gravação simulada. Não há captura de áudio nem acesso ao microfone."; updateControls(); find("voice-stop").focus(); });
  on(find("voice-stop"), "click", () => { if (voice !== "recording") return; voice = "processing"; voiceStatus.textContent = "Processamento simulado. Não há reconhecimento de voz nem pedido a IA."; updateControls(); find("voice-result").focus(); });
  on(find("voice-result"), "click", () => { if (voice !== "processing") return; addMessage("user", "Transcrição fictícia: vamos imaginar três estrelas verdes."); addMessage("assistant", "Resposta fictícia de voz: estes cartões são exemplos estáticos. Nenhum áudio foi captado ou reproduzido."); stopVoice("Resultado fictício apresentado, sem transcrição ou áudio real."); find("voice-start").focus(); });
  on(find("voice-play"), "click", () => {
    if (voice === "playing") { stopVoice(); return; }
    if (voice !== "idle" || scenario === "loading" || scenario === "expired") return;
    voice = "playing"; voiceStatus.textContent = "Reprodução simulada. Não existe som nem síntese de fala."; updateControls();
  });
  function cancelVoice() { stopVoice("Simulação cancelada. Não houve gravação ou envio de áudio."); find("voice-start").focus(); }
  on(find("voice-cancel"), "click", cancelVoice);
  on(find("conversa"), "keydown", event => { if (event.key === "Escape" && voice !== "idle") { event.preventDefault(); cancelVoice(); } });
  on(find("review-cancel"), "click", () => closeReview(true));
  on(find("memorias"), "keydown", event => { if (event.key === "Escape" && pendingReview) { event.preventDefault(); closeReview(true); } });
  on(find("review-confirm"), "click", () => {
    if (!pendingReview) return;
    const { id, choice } = pendingReview; decisions.set(id, `${choice} · apenas no exemplo`);
    doc.querySelector<HTMLElement>(`[data-memory-status="${id}"]`)!.textContent = decisions.get(id)!;
    text("review-status", "Escolha fictícia aplicada apenas ao ecrã. Nenhuma memória, consentimento ou autorização do Guardian foi alterada."); closeReview(true);
  });
  on(find("notice-expired"), "click", () => { setScenario("expired"); win.location.hash = "conversa"; });
  on(find("notice-read"), "click", () => { doc.querySelectorAll("#avisos .tag").forEach(tag => { tag.textContent = "Exemplo · lido"; }); text("notice-status", "Exemplos marcados como lidos apenas nesta página."); doc.querySelector("nav .count")!.textContent = "0"; doc.querySelector("nav .count")!.setAttribute("aria-label", "0 exemplos por ler"); });
  on(find("reset"), "click", () => {
    draft.value = ""; decisions.clear(); closeReview(); showMemories(); resetMessages(); setScenario("ready"); text("review-status", ""); text("notice-status", "");
    doc.querySelectorAll("#avisos .tag").forEach(tag => { tag.textContent = "Exemplo · por ler"; }); doc.querySelector("nav .count")!.textContent = "2"; doc.querySelector("nav .count")!.setAttribute("aria-label", "2 exemplos por ler");
    text("scenario-status", "Exemplos repostos. As alterações locais foram eliminadas."); win.location.hash = "conversa"; navigate(true);
  });
  const hashChanged = () => navigate(true); win.addEventListener("hashchange", hashChanged); cleanups.push(() => win.removeEventListener("hashchange", hashChanged));
  // Clicking the current hash still closes previews and returns focus to the destination.
  doc.querySelectorAll<HTMLAnchorElement>("[data-view]").forEach(link => on(link, "click", () => { if (win.location.hash === link.hash) navigate(true); }));
  showMemories(); resetMessages(); setScenario("ready"); navigate(false);
  return () => { cleanups.forEach(cleanup => cleanup()); messages.replaceChildren(); find("memory-list").replaceChildren(); draft.value = ""; };
}
