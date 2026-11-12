## ⚡ 班级电子宠物重构全案 · 第四部分：外部Codex分步投喂任务包与行动清单

这是为你整理的重构第四部分：**发给 Codex/中转站的 6 个原子任务投喂包（复制即用）与行动清单**。

---

### 一、 Codex 任务投喂包（每次只复制一个框，测试通过再发下一个）

#### 【任务 T1】：纯多学科 SQLite 数据表与 DAO（约消耗 1200 Token）
```text
【任务编号】：T1-Database-MultiSubjectPet
【角色】：资深 SQLite + TypeScript 架构师。
【目标】：请在 src/main/db/ 编写 database.ts 与 petDao.ts，仅实现纯数据层逻辑，禁止包含任何界面代码。
【数据契约】：
1. 表 classes: id, name, created_at
2. 表 subjects: id, class_id, name, icon, color
3. 表 students: id, class_id, name, student_no
4. 表 pet_instances: 
   - id, student_id, subject_id, pet_type, level(默认1), exp(默认0), max_exp(默认100), total_awakened(默认0)
   - 联合唯一索引: UNIQUE(student_id, subject_id)
【输出要求】：
1. 使用参数化预编译查询，绝对禁止拼接 SQL 字符串。
2. 包含方法：getStudentPets(studentId), getStudentSubjectPet(studentId, subjectId), addPetExp(petInstanceId, expDelta)。
3. 必须在末尾附带 runSelfTest() 函数，直接在内存数据库(:memory:)插入班级、学科、学生与宠物并断言查询结果。
```

---

#### 【任务 T2】：纯函数加分路由与满级唤醒算法（约消耗 800 Token）
```text
【任务编号】：T2-Engine-ScoringAndAwaken
【角色】：纯算法逻辑工程师。
【目标】：编写 src/common/scoringEngine.ts，纯 TypeScript 函数，无任何 UI 依赖。
【规则说明】：
1. 升级公式：max_exp = level * 100。
2. 当 expDelta 为正时：
   - 循环计算是否升级：若 current_exp >= max_exp，则 level += 1，扣除 max_exp，更新下一个 max_exp；
   - 满级判定：当 level >= 100 时，触发满级唤醒：total_awakened += 1，level 重置为 1，exp 清零，返回 isAwakened: true。
3. 当 expDelta 为负时：扣除经验，最低不可低于当前等级 0 经验。
【输出要求】：
1. 导出 calculateExpProgression(currentLevel, currentExp, deltaExp): CalcResult。
2. 附带纯 Node.js 断言测试用例，覆盖：正常加分升级、连续升多级、满级唤醒触发三种场景。
```

---

#### 【任务 T3】：学生卡片双形态组件（折叠+平铺）（约消耗 1500 Token）
```text
【任务编号】：T3-Component-StudentCardDualView
【角色】：高级前端工程师。
【目标】：实现学生详情展示组件 StudentCardModal，支持 layoutMode="accordion"（折叠）和 layoutMode="flat"（平铺）两种形态。
【展示字段】：
1. 学生基础信息：头像、姓名、学号、总觉醒神兽徽章数；
2. 当前焦点学科宠物：形象预览、当前等级、经验进度条；
3. 全科宠物矩阵：横向排布其他各科宠物的微缩状态；
4. 历史评分记录列表。
【要求】：
- 折叠模式：包含【当前学科状态】、【其他学科矩阵】、【课堂表现明细】三个可独立展开收起的面板。
- 禁止使用沉重第三方库，用清晰的语义化结构实现，样式整洁。
```

---

#### 【任务 T4】：大屏右下角多级圆圈快捷菜单（约消耗 1000 Token）
```text
【任务编号】：T4-Component-RadialShortcutMenu
【角色】：前端交互架构师。
【目标】：编写大屏快捷圆圈组件 RadialShortcutMenu。
【层级逻辑】：
- 1级圆圈（中心浮动按钮）：点击展开/收起 2 级菜单；
- 2级圆圈组（环形展开）：【快速表扬】、【快速待改进】、【切换上课学科】、【随机点名】；
- 3级圆圈组（点击【快速表扬】后，原位置平滑切换为表扬细项）：+1 积极发言、+1 坐姿端正、+2 合作探究、+3 卓越解法。
【要求】：纯受控状态机实现，输出选中的事件 (onSelectAction)。动画使用纯 CSS transform 和 transition。
```

---

#### 【任务 T5】：宠物拖拽动效交互包装器（约消耗 1000 Token）
```text
【任务编号】：T5-Component-DraggablePet
【角色】：前端动效工程师。
【目标】：编写 DraggablePetView 组件，将前面定义的物理控制器集成到宠物渲染中。
【属性输入】：
- petName: string
- imageMap: { idle: string; grabbed: string; dragging: string; bounce: string; }
- onClick?: () => void
【要求】：
1. 挂载时绑定 Pointer 事件，拖拽时有提溜拉伸、惯性摇摆、落地果冻弹跳；
2. 根据状态回调动态切换 img src 为对应的贴图（idle/grabbed/dragging/bounce）；
3. 判定轻点（位移 < 5px）触发 onClick，拖动只做物理移动。
```

---

### 二、 今日行动建议（你可以马上开始的3件事）
1. **第一件事**：打开生图工具，复制第三部分中的 Prompt 跑出一套 4 态宠物图，抠出透明 PNG；
2. **第二件事**：新建一个空白项目文件夹，做最基础的 `npm init`；
3. **第三件事**：复制上面的 **【任务 T1】** 粘贴进 Codex，用极低 Token 开启第一次无返工构建！
