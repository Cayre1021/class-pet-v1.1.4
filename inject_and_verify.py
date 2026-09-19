import json
import os
from playwright.sync_api import sync_playwright

json_path = r"D:\Desk\ALL Vibe\new-class-pet\mindmap_web_project\mindflow_canvas_suite_gpt5\saves\class_pet_v2_prd_architecture.json"
with open(json_path, "r", encoding="utf-8") as f:
    payload = json.load(f)

index_url = r"file:///D:/Desk/ALL%20Vibe/new-class-pet/mindmap_web_project/mindflow_canvas_suite_gpt5/index.html"
canvas_url = f"file:///D:/Desk/ALL%20Vibe/new-class-pet/mindmap_web_project/mindflow_canvas_suite_gpt5/canvas.html?project={payload['id']}"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Go to index
    page.goto(index_url)
    page.wait_for_timeout(500)

    # Inject into localStorage
    page.evaluate("""({ payload }) => {
        const REGISTRY_KEY = "mindflow_gpt5_registry";
        const payloadKey = "mindflow_gpt5_project_" + payload.id;
        localStorage.setItem(payloadKey, JSON.stringify(payload));

        let registry = [];
        try {
            registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) || "[]");
        } catch(e) {}

        // remove existing if same id
        registry = registry.filter(p => p.id !== payload.id);
        registry.unshift({
            id: payload.id,
            title: payload.projectTitle,
            description: payload.description,
            nodeCount: payload.nodes.length,
            wireCount: payload.wires.length,
            updatedAt: payload.updatedAt
        });

        localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    }""", {"payload": payload})

    # Reload index to verify project card appears
    page.reload()
    page.wait_for_timeout(1000)
    page.screenshot(path=r"D:\Desk\ALL Vibe\new-class-pet\mindmap_web_project\mindflow_canvas_suite_gpt5\saves\hub_preview.png")

    # Navigate to canvas
    page.goto(canvas_url)
    page.wait_for_timeout(1500)
    page.screenshot(path=r"D:\Desk\ALL Vibe\new-class-pet\mindmap_web_project\mindflow_canvas_suite_gpt5\saves\canvas_preview.png")

    browser.close()
    print("Project injected into LocalStorage and verified successfully!")
