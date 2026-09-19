# 数据平滑迁移兼容方案与第四阶段设计验收标准 (Phase 4 DoD)

## 一、 老版本数据无损平滑迁移方案 (Data Migration Adapter)

为了确保用户从老版本（v0.2.0）升级至全新架构后，原本保存在浏览器的学生、班级、积分数据**零丢失、无感升级**，必须建立数据适配层（Data Adapter）：

```typescript
/**
 * 新老数据模型转换适配器 (Data Migration Adapter)
 */
export function migrateOldStudentToNewProfile(oldStudent: any): StudentProfile {
  // 1. 提取老版本单宠为第一只主修宠物 (Active Pet)
  const legacyPetInstance: PetInstance = {
    petId: `pet_${oldStudent.id}_initial`,
    petType: oldStudent.petType || 'dog',
    subjectType: '综合素质', // 默认分配为第一只综合宠物
    level: oldStudent.level || 1,
    exp: oldStudent.exp || 0,
    stage: oldStudent.level >= 8 ? 4 : oldStudent.level >= 6 ? 3 : oldStudent.level >= 3 ? 2 : 1,
    unlockedAccessories: oldStudent.effects || [],
    isMaxLevel: oldStudent.level >= 10,
    graduatedAt: oldStudent.level >= 10 ? Date.now() : undefined,
    moodState: oldStudent.mood > 50 ? 'happy' : 'sleepy',
  };

  // 2. 构造支持多宠物博物馆的全新学生实体
  return {
    id: oldStudent.id,
    accountKey: oldStudent.accountKey || 'default',
    studentName: oldStudent.name,
    studentNumber: oldStudent.studentNumber || '',
    boundEmail: '', // 留空，待后续家庭端绑定
    activePetId: legacyPetInstance.petId,
    petMuseum: [legacyPetInstance], // 将老宠物无缝存入个人博物馆
    totalPoints: oldStudent.exp || 0,
  };
}
```

---

## 二、 第四阶段（Phase 4）UX 重构方案验收标准 (Definition of Done - DoD)

在第四阶段输出全新的 UX 交互设计稿与原型时，必须逐条对照以下 **6 大硬性验收标准（DoD）** 进行严格验收：

| 验收维度 | 对应甲方痛点 | 必须达到的设计交付标准 (DoD) |
| :---: | :--- | :--- |
| **DoD 01** | **批量操作** | 教师端必须提供【按小组一键勾选】、【全选/反选】、【自定义多选】；从选人到完成赋分点击次数 $\le 2$ 次。 |
| **DoD 02** | **成长感知** | 必须打破“几十级一个样”；制定“微等级 (数值增量)”+“大阶梯 (形态变身)”+“配件解锁 (翅膀/光环/冠饰)”的三重成长反馈。 |
| **DoD 03** | **拟真生命力** | 大屏必须具备【闲置生理状态机 (Idle States)】；在无人点击时，宠物每隔 30~60 秒自动触发随机打瞌睡、伸懒腰、冒出鼓励气泡等动作。 |
| **DoD 04** | **C位聚焦** | 触发升级或重大正向加分时，必须具备【全屏暗化 + 目标卡片居中放大 (Spotlight) + 精准向外散射烟花】的高光动效。 |
| **DoD 05** | **一人多宠** | 必须支持单学生挂载多个【学科宠物】（如语文宠、数学宠）；满级宠物可荣耀退役并陈列在【个人宠物博物馆】中。 |
| **DoD 06** | **云端就绪** | 所有页面交互必须显式定义出【数据加载中 Skeleton 骨架屏】、【网络请求防重复提交】与【断网重试提示】。 |
