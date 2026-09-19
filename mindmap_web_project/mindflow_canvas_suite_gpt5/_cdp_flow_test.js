const fs = require("fs");
const path = require("path");
const port = process.env.CDP_PORT || "62114";
const outDir = path.join(__dirname, "saves");

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
  const res = await cdp(ws, id, "Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise
  });
  if (res.exceptionDetails) {
    throw new Error((res.exceptionDetails.exception && res.exceptionDetails.exception.description) || JSON.stringify(res.exceptionDetails));
  }
  return res.result.value;
}

async function main() {
  const targets = await fetch("http://127.0.0.1:" + port + "/json").then(r => r.json());
  const page = targets.find(t => t.type === "page" && /canvas\.html/.test(t.url)) || targets.find(t => t.type === "page");
  if (!page) throw new Error("no page: " + JSON.stringify(targets));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });

  let id = 1;
  await cdp(ws, id++, "Runtime.enable", {});
  await cdp(ws, id++, "Page.enable", {});
  await cdp(ws, id++, "Page.navigate", { url: "http://127.0.0.1:8765/canvas.html?template=blank&t=" + Date.now() });
  await new Promise(r => setTimeout(r, 1800));

  const boot = await evalExpr(ws, id++, `({
    title: document.title,
    mindflow: typeof MindFlow,
    titleCount: document.querySelectorAll("input.node-title").length,
    bodyCount: document.querySelectorAll("textarea.node-body").length,
    nodeCount: document.querySelectorAll(".canvas-node").length,
    firstTitle: (document.querySelector("input.node-title")||{}).value,
    firstPh: (document.querySelector("input.node-title")||{}).placeholder
  })`);
  console.log("BOOT", JSON.stringify(boot, null, 2));

  const box = await evalExpr(ws, id++, `(() => {
    const el = document.querySelector("input.node-title");
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    return {
      x: r.x, y: r.y, w: r.width, h: r.height,
      hit: hit ? (hit.tagName + "." + hit.className) : null,
      hitIsTitle: !!(hit && hit.classList && hit.classList.contains("node-title"))
    };
  })()`);
  console.log("BOX", JSON.stringify(box, null, 2));

  const cx = Math.round(box.x + box.w / 2);
  const cy = Math.round(box.y + box.h / 2);
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mousePressed", x: cx, y: cy, button: "left", clickCount: 1 });
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseReleased", x: cx, y: cy, button: "left", clickCount: 1 });
  await new Promise(r => setTimeout(r, 120));

  const afterClick = await evalExpr(ws, id++, `({
    active: document.activeElement && (document.activeElement.tagName + "." + document.activeElement.className),
    isTitle: document.activeElement && document.activeElement.classList.contains("node-title")
  })`);
  console.log("AFTER_CLICK", JSON.stringify(afterClick, null, 2));

  await cdp(ws, id++, "Input.dispatchKeyEvent", { type: "keyDown", key: "a", text: "a", unmodifiedText: "a" });
  await cdp(ws, id++, "Input.dispatchKeyEvent", { type: "keyUp", key: "a" });
  await cdp(ws, id++, "Input.insertText", { text: "标题写入OK" });
  await new Promise(r => setTimeout(r, 150));

  const typed = await evalExpr(ws, id++, `({
    inputValue: (document.querySelector("input.node-title")||{}).value,
    stateTitle: (window.MindFlow && MindFlow.getState().nodes[0].title) || null,
    active: document.activeElement && document.activeElement.className
  })`);
  console.log("TYPED", JSON.stringify(typed, null, 2));

  const bodies = await evalExpr(ws, id++, `(() => {
    const el = document.querySelector("textarea.node-body");
    if (!el) return { missing: true };
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  })()`);
  console.log("BODY_BOX", JSON.stringify(bodies, null, 2));
  if (!bodies.missing && bodies.w > 4) {
    const bx = Math.round(bodies.x + Math.min(40, bodies.w / 2));
    const by = Math.round(bodies.y + Math.min(16, bodies.h / 2));
    await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mousePressed", x: bx, y: by, button: "left", clickCount: 1 });
    await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseReleased", x: bx, y: by, button: "left", clickCount: 1 });
    await cdp(ws, id++, "Input.insertText", { text: "内容写入OK" });
    await new Promise(r => setTimeout(r, 120));
  }
  const contentTyped = await evalExpr(ws, id++, `({
    inputValue: (document.querySelector("textarea.node-body")||{}).value,
    stateContent: (window.MindFlow && MindFlow.getState().nodes[0].content) || null
  })`);
  console.log("CONTENT", JSON.stringify(contentTyped, null, 2));

  const drag = await evalExpr(ws, id++, `(() => {
    const node = MindFlow.getState().nodes[0];
    const el = document.getElementById("node-" + node.id);
    const r = el.getBoundingClientRect();
    return { id: node.id, x: node.x, y: node.y, sx: r.left + 18, sy: r.bottom - 18 };
  })()`);
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(drag.sx), y: Math.round(drag.sy), button: "left", clickCount: 1 });
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(drag.sx + 90), y: Math.round(drag.sy + 50) });
  await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(drag.sx + 90), y: Math.round(drag.sy + 50), button: "left", clickCount: 1 });
  await new Promise(r => setTimeout(r, 120));
  const dragged = await evalExpr(ws, id++, `({
    x: MindFlow.getState().nodes[0].x,
    y: MindFlow.getState().nodes[0].y,
    title: MindFlow.getState().nodes[0].title
  })`);
  console.log("DRAG", JSON.stringify({ from: drag, to: dragged }, null, 2));

  const shapes = ["card","diamond","sticky","pill","rect","ai_prompt","frame"];
  const shapeResults = [];
  for (const shape of shapes) {
    await evalExpr(ws, id++, `document.querySelector('[data-create="${shape}"]') && document.querySelector('[data-create="${shape}"]').click()`);
    await new Promise(r => setTimeout(r, 250));
    const info = await evalExpr(ws, id++, `(() => {
      const nodes = MindFlow.getState().nodes.filter(n => n.shape === "${shape}");
      const node = nodes[nodes.length - 1];
      if (!node) return { shape: "${shape}", missing: true };
      const el = document.getElementById("node-" + node.id);
      const title = el.querySelector("input.node-title");
      if (!title) return { shape: "${shape}", noTitle: true, id: node.id };
      const r = title.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + Math.max(8, r.width/2), r.top + r.height/2);
      return {
        shape: "${shape}",
        id: node.id,
        box: { x: r.x, y: r.y, w: r.width, h: r.height },
        hitIsTitle: !!(hit && hit.classList && hit.classList.contains("node-title")),
        visible: r.width > 4 && r.height > 4
      };
    })()`);
    if (!info.missing && !info.noTitle && info.visible) {
      const x = Math.round(info.box.x + Math.max(10, info.box.w / 2));
      const y = Math.round(info.box.y + info.box.h / 2);
      await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await cdp(ws, id++, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
      await cdp(ws, id++, "Input.insertText", { text: shape + "-ok" });
      await new Promise(r => setTimeout(r, 80));
      const after = await evalExpr(ws, id++, `(() => {
        const node = MindFlow.getState().nodes.find(n => n.id === "${info.id}");
        const el = document.getElementById("node-${info.id}");
        const title = el && el.querySelector("input.node-title");
        return { value: title && title.value, state: node && node.title, focused: document.activeElement === title };
      })()`);
      info.typedValue = after.value;
      info.typedState = after.state;
      info.typedOk = !!(after.value && after.value.includes(shape + "-ok"));
    }
    shapeResults.push(info);
  }
  console.log("SHAPES", JSON.stringify(shapeResults, null, 2));

  await evalExpr(ws, id++, `document.getElementById("btn-manual-save") && document.getElementById("btn-manual-save").click()`);
  await new Promise(r => setTimeout(r, 200));
  const saved = await evalExpr(ws, id++, `(() => {
    const st = MindFlow.getState();
    const raw = localStorage.getItem("mindflow_gpt5_project_" + st.projectId);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      projectId: st.projectId,
      savedTitle: parsed && parsed.nodes && parsed.nodes[0] && parsed.nodes[0].title,
      nodeCount: parsed && parsed.nodes && parsed.nodes.length
    };
  })()`);
  console.log("SAVE", JSON.stringify(saved, null, 2));

  const shot = await cdp(ws, id++, "Page.captureScreenshot", { format: "png" });
  const shotPath = path.join(outDir, "canvas_title_edit_verified.png");
  fs.writeFileSync(shotPath, Buffer.from(shot.data, "base64"));
  console.log("SHOT", shotPath);

  const summary = {
    titleClickFocus: afterClick.isTitle,
    titleTyped: !!(typed.inputValue && (typed.inputValue.includes("标题写入OK") || typed.inputValue.includes("a标题写入OK") || typed.stateTitle)),
    contentTyped: !!(contentTyped.inputValue && contentTyped.inputValue.includes("内容写入OK")),
    dragMoved: dragged.x !== drag.x || dragged.y !== drag.y,
    shapeFails: shapeResults.filter(s => s.missing || s.noTitle || s.typedOk === false),
    savedTitle: saved.savedTitle
  };
  console.log("SUMMARY", JSON.stringify(summary, null, 2));
  ws.close();
}

main().catch(err => {
  console.error("TEST_FAIL", err);
  process.exit(1);
});
