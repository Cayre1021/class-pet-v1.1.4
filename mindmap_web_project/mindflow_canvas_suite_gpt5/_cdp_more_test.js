const fs = require("fs");
const path = require("path");
const port = process.env.CDP_PORT || "62114";

function wait(ws, id) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("cdp timeout id=" + id)), 20000);
    const onMsg = (raw) => {
      const msg = JSON.parse(typeof raw.data === "string" ? raw.data : raw.data.toString());
      if (msg.id === id) {
        clearTimeout(timer);
        ws.removeEventListener("message", onMsg);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", onMsg);
  });
}
async function cdp(ws, id, method, params) {
  ws.send(JSON.stringify({ id, method, params }));
  return wait(ws, id);
}
async function evalExpr(ws, id, expression, awaitPromise = false) {
  const res = await cdp(ws, id, "Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
  if (res.exceptionDetails) throw new Error((res.exceptionDetails.exception && res.exceptionDetails.exception.description) || JSON.stringify(res.exceptionDetails));
  return res.result.value;
}

async function main() {
  const targets = await fetch("http://127.0.0.1:" + port + "/json").then(r => r.json());
  const page = targets.find(t => t.type === "page") || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve); ws.addEventListener("error", reject); });
  let id = 1;
  await cdp(ws, id++, "Runtime.enable", {});
  await cdp(ws, id++, "Page.enable", {});

  // 1) Hub -> new blank -> canvas
  await cdp(ws, id++, "Page.navigate", { url: "http://127.0.0.1:8765/index.html?t=" + Date.now() });
  await new Promise(r => setTimeout(r, 1500));
  const hub = await evalExpr(ws, id++, `({
    title: document.title,
    create: !!document.getElementById("btn-create-blank"),
    cards: document.querySelectorAll("[data-open]").length
  })`);
  console.log("HUB", JSON.stringify(hub, null, 2));
  await evalExpr(ws, id++, `document.getElementById("btn-create-blank") && document.getElementById("btn-create-blank").click()`);
  await new Promise(r => setTimeout(r, 1800));
  const afterCreate = await evalExpr(ws, id++, `({
    url: location.href,
    titleCount: document.querySelectorAll("input.node-title").length,
    nodeCount: document.querySelectorAll(".canvas-node").length,
    firstPh: (document.querySelector("input.node-title")||{}).placeholder,
    projectId: window.MindFlow && MindFlow.getState().projectId
  })`);
  console.log("AFTER_CREATE", JSON.stringify(afterCreate, null, 2));

  // 2) type-to-edit: click node body (not title), then type
  const bodyClick = await evalExpr(ws, id++, `(() => {
    const title = document.querySelector("input.node-title");
    const node = title.closest(".canvas-node");
    const r = node.getBoundingClientRect();
    const tr = title.getBoundingClientRect();
    return { x: r.left + 24, y: Math.min(r.bottom - 18, tr.bottom + 18), titleY: tr.bottom, bottom: r.bottom };
  })()`);
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(bodyClick.x), y: Math.round(bodyClick.y), button: "left", clickCount: 1 });
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(bodyClick.x), y: Math.round(bodyClick.y), button: "left", clickCount: 1 });
  await new Promise(r => setTimeout(r, 80));
  await cdp(ws, id++, "Input.dispatchKeyEvent", { type: "keyDown", key: "Z", text: "Z", unmodifiedText: "Z" });
  await cdp(ws, id++, "Input.dispatchKeyEvent", { type: "keyUp", key: "Z" });
  await cdp(ws, id++, "Input.insertText", { text: "键盘改标题" });
  await new Promise(r => setTimeout(r, 120));
  const typedSel = await evalExpr(ws, id++, `({
    active: document.activeElement && document.activeElement.className,
    value: (document.querySelector("input.node-title")||{}).value,
    state: window.MindFlow && MindFlow.getState().nodes[0].title
  })`);
  console.log("TYPE_TO_EDIT", JSON.stringify(typedSel, null, 2));

  // 3) Tab creates child
  await cdp(ws, id++, "Input.dispatchKeyEvent", { type: "keyDown", key: "Escape" });
  await evalExpr(ws, id++, `document.activeElement && document.activeElement.blur()`);
  await new Promise(r => setTimeout(r, 50));
  const beforeTab = await evalExpr(ws, id++, `MindFlow.getState().nodes.length`);
  await cdp(ws, id++, "Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await cdp(ws, id++, "Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await new Promise(r => setTimeout(r, 250));
  const afterTab = await evalExpr(ws, id++, `({
    nodes: MindFlow.getState().nodes.length,
    wires: MindFlow.getState().wires.length,
    focused: document.activeElement && document.activeElement.getAttribute("data-field")
  })`);
  console.log("TAB_CHILD", JSON.stringify({ beforeTab, afterTab }, null, 2));

  // 4) connecting preview uses source node (no throw)
  const connect = await evalExpr(ws, id++, `(() => {
    const node = MindFlow.getState().nodes[0];
    const el = document.querySelector("#node-" + node.id + " .port-handle[data-port='right']");
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, from: node.id };
  })()`);
  await evalExpr(ws, id++, `document.querySelectorAll(".canvas-node").forEach(n => n.dispatchEvent(new Event("mouseenter")))`);
  await evalExpr(ws, id++, `document.getElementById("canvas-container").classList.add("connecting")`);
  // hover node so ports are live, then drag from right port
  const hover = await evalExpr(ws, id++, `(() => {
    const node = MindFlow.getState().nodes[0];
    const el = document.getElementById("node-" + node.id);
    el.classList.add("is-selected");
    const r = el.getBoundingClientRect();
    return { x: r.right, y: r.top + r.height/2 };
  })()`);
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(hover.x - 4), y: Math.round(hover.y) });
  await new Promise(r => setTimeout(r, 80));
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(connect.x), y: Math.round(connect.y), button: "left", clickCount: 1 });
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(connect.x + 160), y: Math.round(connect.y + 20) });
  const connecting = await evalExpr(ws, id++, `({
    isConnecting: MindFlow.getState().isConnecting,
    temp: document.getElementById("temp-drag-wire").getAttribute("d"),
    opacity: document.getElementById("temp-drag-wire").style.opacity
  })`);
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(connect.x + 160), y: Math.round(connect.y + 20), button: "left", clickCount: 1 });
  await new Promise(r => setTimeout(r, 250));
  const afterConnect = await evalExpr(ws, id++, `({
    isConnecting: MindFlow.getState().isConnecting,
    nodes: MindFlow.getState().nodes.length,
    wires: MindFlow.getState().wires.length
  })`);
  console.log("CONNECT", JSON.stringify({ connecting, afterConnect }, null, 2));

  // 5) seed map tiny zoom title click
  await cdp(ws, id++, "Page.navigate", { url: "http://127.0.0.1:8765/canvas.html?t=" + Date.now() });
  await new Promise(r => setTimeout(r, 1800));
  const seed = await evalExpr(ws, id++, `({
    nodes: MindFlow.getState().nodes.length,
    zoom: MindFlow.getState().zoom,
    titles: document.querySelectorAll("input.node-title").length
  })`);
  console.log("SEED", JSON.stringify(seed, null, 2));
  const seedBox = await evalExpr(ws, id++, `(() => {
    const titles = [...document.querySelectorAll("input.node-title")];
    const usable = titles.map(el => ({ el, r: el.getBoundingClientRect() })).filter(t => t.r.width > 20 && t.r.height > 8 && t.r.y > 60 && t.r.y < innerHeight-80);
    if (!usable.length) return { none: true, sample: titles.slice(0,3).map(el => { const r=el.getBoundingClientRect(); return {w:r.width,h:r.height,y:r.y,val:el.value}; }) };
    const t = usable[Math.floor(usable.length/2)];
    const r = t.r;
    const hit = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    return { val: t.el.value, x: r.x, y: r.y, w: r.width, h: r.height, hitIsTitle: !!(hit && hit.classList && hit.classList.contains("node-title")) };
  })()`);
  console.log("SEED_BOX", JSON.stringify(seedBox, null, 2));
  if (!seedBox.none) {
    await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(seedBox.x + seedBox.w/2), y: Math.round(seedBox.y + seedBox.h/2), button: "left", clickCount: 1 });
    await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(seedBox.x + seedBox.w/2), y: Math.round(seedBox.y + seedBox.h/2), button: "left", clickCount: 1 });
    await cdp(ws, id++, "Input.insertText", { text: "-SEED" });
    await new Promise(r => setTimeout(r, 120));
    const seedTyped = await evalExpr(ws, id++, `({
      active: document.activeElement && document.activeElement.className,
      value: document.activeElement && document.activeElement.value
    })`);
    console.log("SEED_TYPED", JSON.stringify(seedTyped, null, 2));
  }

  const shot = await cdp(ws, id++, "Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(__dirname, "saves", "canvas_seed_title_test.png"), Buffer.from(shot.data, "base64"));
  ws.close();
}
main().catch(err => { console.error("TEST_FAIL", err); process.exit(1); });
