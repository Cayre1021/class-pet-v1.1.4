import json
import os
import time

DX = 140
DY = 30
COL_WIDTH = 260

tree_data = {
    "title": "班级电子宠物平台 v2.0",
    "subtitle": "全新 UX/UI 架构与功能全景",
    "color": "cyan",
    "shape": "circle",
    "width": 240,
    "height": 180,
    "content": "班级激励 · 拟真养成 · 本地容器化",
    "tag": "PROJECT ROOT",
    "children": [
        {
            "title": "1. 教师工作台 (Console)",
            "subtitle": "极速赋分与班级管理",
            "color": "purple",
            "shape": "card",
            "width": 280,
            "height": 140,
            "content": "• 小组矩阵一键批量勾选\n• 学科宠物分类积分流\n• 5秒即时撤销安全网",
            "tag": "TEACHER UX",
            "wire_label": "教学管理",
            "children": [
                {
                    "title": "小组矩阵极速赋分",
                    "color": "purple",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "支持按小组/值日排班一键全选，2次点击完成全班赋分",
                    "wire_label": "批量赋分",
                    "children": [
                        {"title": "1秒选中整组 (≤2次点击)", "color": "purple", "shape": "pill", "width": 220, "height": 50, "wire_label": "效率指标"},
                        {"title": "全选 / 反选 / 连续多选", "color": "purple", "shape": "pill", "width": 220, "height": 50, "wire_label": "交互规范"}
                    ]
                },
                {
                    "title": "学科宠物与积分分类",
                    "color": "purple",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "常驻【综合/语文/数学/英语】分类，积分直通对应学科宠",
                    "wire_label": "学科分配",
                    "children": [
                        {"title": "学科胶囊快速切换", "color": "purple", "shape": "pill", "width": 220, "height": 50, "wire_label": "UI组件"},
                        {"title": "积分定向流入出战宠", "color": "purple", "shape": "pill", "width": 220, "height": 50, "wire_label": "业务规则"}
                    ]
                },
                {
                    "title": "即时撤销安全网 (Undo)",
                    "color": "purple",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "赋分后底部常驻 5 秒倒计时浮条，杜绝手抖误扣分",
                    "wire_label": "容错机制",
                    "children": [
                        {"title": "底部 5s 悬浮倒计时", "color": "purple", "shape": "pill", "width": 220, "height": 50, "wire_label": "UI组件"},
                        {"title": "一键物理回滚积分与日志", "color": "purple", "shape": "pill", "width": 220, "height": 50, "wire_label": "后端事务"}
                    ]
                },
                {
                    "title": "名单导入与排班管理",
                    "color": "purple",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "支持从 Excel/文本按行复制粘贴批量导入，自动划分小组",
                    "wire_label": "学籍管理",
                    "children": [
                        {"title": "Excel 文本多行批量解析", "color": "purple", "shape": "pill", "width": 220, "height": 50, "wire_label": "数据解析"},
                        {"title": "默认分组与值日生标签", "color": "purple", "shape": "pill", "width": 220, "height": 50, "wire_label": "分组设定"}
                    ]
                }
            ]
        },
        {
            "title": "2. 班级大屏生态 (Habitat)",
            "subtitle": "拟真生态圈与高光时刻",
            "color": "rose",
            "shape": "card",
            "width": 280,
            "height": 140,
            "content": "• 闲置拟真生理状态机\n• C位聚光灯高光庆祝系统\n• 左右分栏无遮挡弹窗",
            "tag": "SCREEN UX",
            "wire_label": "大屏互动",
            "children": [
                {
                    "title": "拟真生理状态机 (Idle)",
                    "color": "rose",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "常态挂机时自动触发困倦、渴饿、开心等自发动作与微气泡",
                    "wire_label": "生命力",
                    "children": [
                        {"title": "困倦趴下呼吸 / 揉眼", "color": "rose", "shape": "pill", "width": 220, "height": 50, "wire_label": "动作帧"},
                        {"title": "口渴冒水滴 / 饿了要吃", "color": "rose", "shape": "pill", "width": 220, "height": 50, "wire_label": "微气泡"}
                    ]
                },
                {
                    "title": "C位聚光灯高光系统",
                    "color": "rose",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "升级/加分时背景压暗 70%，主角居中放大，定向烟花迸发",
                    "wire_label": "高光聚焦",
                    "children": [
                        {"title": "全屏暗化 70% 视线聚焦", "color": "rose", "shape": "pill", "width": 220, "height": 50, "wire_label": "动效"},
                        {"title": "主角平滑弹射至屏幕中央", "color": "rose", "shape": "pill", "width": 220, "height": 50, "wire_label": "C位聚光"},
                        {"title": "主角为中心定向烟花迸发", "color": "rose", "shape": "pill", "width": 220, "height": 50, "wire_label": "粒子特效"}
                    ]
                },
                {
                    "title": "左右分栏无遮挡弹窗",
                    "color": "rose",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "重构弹窗结构：左侧动态大图，右侧互动按键与对话，杜绝重叠",
                    "wire_label": "弹窗重构",
                    "children": [
                        {"title": "左侧大幅动态宠物骨骼", "color": "rose", "shape": "pill", "width": 220, "height": 50, "wire_label": "UI布局"},
                        {"title": "右侧喂食抚摸与对话流", "color": "rose", "shape": "pill", "width": 220, "height": 50, "wire_label": "文字排版"}
                    ]
                }
            ]
        },
        {
            "title": "3. 学生端与多宠博物馆",
            "subtitle": "一人多宠与持续激励",
            "color": "emerald",
            "shape": "card",
            "width": 280,
            "height": 140,
            "content": "• 当前出战学科主宠\n• 满级荣誉博物馆与勋章\n• 个人成长积分日历账单",
            "tag": "STUDENT UX",
            "wire_label": "个人成长",
            "children": [
                {
                    "title": "出战主修宠物 (Active)",
                    "color": "emerald",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "展示当前培养的学科宠物，微等级数值 + 阶段变身 + 配饰解锁",
                    "wire_label": "主修宠物",
                    "children": [
                        {"title": "多学科宠物随时切换", "color": "emerald", "shape": "pill", "width": 220, "height": 50, "wire_label": "学科切换"},
                        {"title": "多阶段形态与配饰解锁", "color": "emerald", "shape": "pill", "width": 220, "height": 50, "wire_label": "成长外观"}
                    ]
                },
                {
                    "title": "满级荣誉博物馆",
                    "color": "emerald",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "满级宠物荣耀退役并陈列于展厅，颁发金色勋章，随时开新蛋",
                    "wire_label": "破局机制",
                    "children": [
                        {"title": "满级宠物永久展厅陈列", "color": "emerald", "shape": "pill", "width": 220, "height": 50, "wire_label": "荣誉殿堂"},
                        {"title": "金色毕业证书与荣誉勋章", "color": "emerald", "shape": "pill", "width": 220, "height": 50, "wire_label": "成就体系"},
                        {"title": "随时开辟新学科宠物蛋", "color": "emerald", "shape": "pill", "width": 220, "height": 50, "wire_label": "永续激励"}
                    ]
                },
                {
                    "title": "个人成长日历账单",
                    "color": "emerald",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "行为记录透明可追溯，图表化呈现本周、本月积分成长曲线",
                    "wire_label": "积分账单",
                    "children": [
                        {"title": "正负向行为清晰流水", "color": "emerald", "shape": "pill", "width": 220, "height": 50, "wire_label": "明细记录"},
                        {"title": "成长趋势折线图表", "color": "emerald", "shape": "pill", "width": 220, "height": 50, "wire_label": "数据可视化"}
                    ]
                }
            ]
        },
        {
            "title": "4. 班级数据大盘 (Dashboard)",
            "subtitle": "班级学风与数据可视化",
            "color": "amber",
            "shape": "card",
            "width": 280,
            "height": 140,
            "content": "• 班级学风与学科积分雷达\n• 满级宠物收集荣誉榜\n• 小组平均星级比拼",
            "tag": "DASHBOARD",
            "wire_label": "班级大盘",
            "children": [
                {
                    "title": "班级学风综合全景",
                    "color": "amber",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "班级总学分、活跃度与五育/学科积分雷达分布图",
                    "wire_label": "学风总览",
                    "children": [
                        {"title": "班级总学分与出勤比", "color": "amber", "shape": "pill", "width": 220, "height": 50, "wire_label": "核心KPI"},
                        {"title": "学科积分五维雷达图", "color": "amber", "shape": "pill", "width": 220, "height": 50, "wire_label": "雷达分布"}
                    ]
                },
                {
                    "title": "荣誉收集榜单 (Top)",
                    "color": "amber",
                    "shape": "card",
                    "width": 260,
                    "height": 120,
                    "content": "打破单一等级内卷，转向比拼“满级宠物收集数”与“小组星级”",
                    "wire_label": "多元排行",
                    "children": [
                        {"title": "满级宠物博物馆收集榜", "color": "amber", "shape": "pill", "width": 220, "height": 50, "wire_label": "收集榜"},
                        {"title": "小组平均荣誉星级榜", "color": "amber", "shape": "pill", "width": 220, "height": 50, "wire_label": "团队激励"}
                    ]
                }
            ]
        },
        {
            "title": "5. 本地容器与安全架构",
            "subtitle": "Docker 容器化与云端就绪",
            "color": "slate",
            "shape": "card",
            "width": 280,
            "height": 140,
            "content": "• 本地 Docker Compose 运行\n• 局域网极速通信 (WebSocket)\n• 0 行改动平滑上云同构契约",
            "tag": "ARCHITECTURE",
            "wire_label": "底层基建",
            "children": [
                {
                    "title": "本地 Docker 运行拓扑",
                    "color": "slate",
                    "shape": "rect",
                    "width": 260,
                    "height": 120,
                    "content": "Web前端 + API后端 + 本地SQLite卷，docker compose up 一键启动",
                    "wire_label": "本地容器",
                    "children": [
                        {"title": "前端 React 18 独立容器", "color": "slate", "shape": "pill", "width": 220, "height": 50, "wire_label": "Web服务"},
                        {"title": "后端轻量 API 容器", "color": "slate", "shape": "pill", "width": 220, "height": 50, "wire_label": "API服务"},
                        {"title": "挂载本地 SQLite 数据卷", "color": "slate", "shape": "pill", "width": 220, "height": 50, "wire_label": "持久化"}
                    ]
                },
                {
                    "title": "局域网通信与实时广播",
                    "color": "slate",
                    "shape": "rect",
                    "width": 260,
                    "height": 120,
                    "content": "同一 Wi-Fi 下教师笔记本与黑板大屏毫秒级通信，即时推送 C 位事件",
                    "wire_label": "实时同步",
                    "children": [
                        {"title": "SSE / WS 实时事件广播", "color": "slate", "shape": "pill", "width": 220, "height": 50, "wire_label": "广播机制"},
                        {"title": "局域网响应延迟 <100ms", "color": "slate", "shape": "pill", "width": 220, "height": 50, "wire_label": "性能指标"}
                    ]
                },
                {
                    "title": "平滑上云同构规范",
                    "color": "slate",
                    "shape": "rect",
                    "width": 260,
                    "height": 120,
                    "content": "预留家庭端/邮箱登录鉴权契约，未来上云代码 0 行修改一键迁移",
                    "wire_label": "云端同构",
                    "children": [
                        {"title": "云原生同构 0 改动迁移", "color": "slate", "shape": "pill", "width": 220, "height": 50, "wire_label": "部署标准"},
                        {"title": "预留邮箱家庭端漫游契约", "color": "slate", "shape": "pill", "width": 220, "height": 50, "wire_label": "鉴权标准"}
                    ]
                }
            ]
        }
    ]
}

nodes = []
wires = []
node_counter = 0
wire_counter = 0

def layout_tree(node_dict, level, current_y, origin_x=80):
    global node_counter, wire_counter
    node_counter += 1
    node_id = f"node-v2-{node_counter:03d}"
    
    # Process children first to calculate bounding box and center
    kids = node_dict.get("children", [])
    child_ids = []
    
    if not kids:
        h = node_dict.get("height", 120)
        w = node_dict.get("width", 260)
        x = origin_x + level * (COL_WIDTH + DX)
        y = current_y
        
        node_obj = {
            "id": node_id,
            "type": node_dict.get("shape", "card"),
            "shape": node_dict.get("shape", "card"),
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "title": node_dict["title"],
            "content": node_dict.get("content", ""),
            "color": node_dict.get("color", "cyan"),
            "zIndex": 10
        }
        if "tag" in node_dict:
            node_obj["tag"] = node_dict["tag"]
        nodes.append(node_obj)
        return {"id": node_id, "height": h + DY, "center": y + h / 2}
    
    y = current_y
    first_center = 0
    last_center = 0
    
    for i, kid in enumerate(kids):
        r = layout_tree(kid, level + 1, y, origin_x)
        child_ids.append((r["id"], kid.get("wire_label", ""), kid.get("color", node_dict.get("color", "cyan"))))
        if i == 0:
            first_center = r["center"]
        last_center = r["center"]
        y += r["height"]
        
    h = node_dict.get("height", 120)
    w = node_dict.get("width", 260)
    x = origin_x + level * (COL_WIDTH + DX)
    y_node = (first_center + last_center) / 2 - h / 2
    
    node_obj = {
        "id": node_id,
        "type": node_dict.get("shape", "card"),
        "shape": node_dict.get("shape", "card"),
        "x": x,
        "y": y_node,
        "width": w,
        "height": h,
        "title": node_dict["title"],
        "content": node_dict.get("content", ""),
        "color": node_dict.get("color", "cyan"),
        "zIndex": 10
    }
    if "tag" in node_dict:
        node_obj["tag"] = node_dict["tag"]
    nodes.append(node_obj)
    
    # Create wires
    for cid, wlabel, wcolor in child_ids:
        wire_counter += 1
        wire_obj = {
            "id": f"wire-v2-{wire_counter:03d}",
            "fromNode": node_id,
            "fromPort": "right",
            "toNode": cid,
            "toPort": "left",
            "style": "bezier",
            "color": wcolor,
            "animated": True
        }
        if wlabel:
            wire_obj["label"] = wlabel
        wires.append(wire_obj)
        
    return {"id": node_id, "height": y - current_y, "center": y_node + h / 2}

# Compute layout
layout_tree(tree_data, 0, 100, origin_x=80)

# Build project payload
project_id = "proj-class-pet-v2-prd"
payload = {
    "id": project_id,
    "projectTitle": "班级电子宠物平台 v2.0 · 全景架构与 UX/UI 导图",
    "description": "基于 PRD v2.0 构思的全新交互与架构全景：教师工作台、大屏拟真生态、多宠博物馆、数据大盘与本地 Docker 基建",
    "updatedAt": "2026-08-28T18:00:00.000Z",
    "viewport": {
        "panX": 150,
        "panY": 100,
        "zoom": 0.65
    },
    "nodes": nodes,
    "wires": wires
}

# Save into saves/
save_path = r"D:\Desk\ALL Vibe\new-class-pet\mindmap_web_project\mindflow_canvas_suite_gpt5\saves\class_pet_v2_prd_architecture.json"
with open(save_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

print(f"Successfully generated mindmap with {len(nodes)} nodes and {len(wires)} wires!")
print(f"Saved to: {save_path}")
