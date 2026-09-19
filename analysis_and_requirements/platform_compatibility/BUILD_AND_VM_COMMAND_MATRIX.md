# 构建命令、环境矩阵与 Win7 VM 验收记录

> 配套主报告：`ELECTRON_22_IA32_FEASIBILITY_AND_BUILD_VERIFICATION.md`
> 用途：复制命令、填写结果。本文件本身不是“已通过”证明。
> 当前状态：L0 仅确认镜像存在；L1-L5 均为未执行。

约定：

- 通过：有命令输出或截图，并写下时间。
- 失败：写下错误原文，不要改写成“基本可用”。
- 跳过：必须写原因。

SHA256（官方 SHASUMS256.txt）：

```text
1119ac7112590cb9c10a8c9b0bb5be65c0e11648a4f1311e6b7a5a00e497c2ce  electron-v22.3.27-win32-ia32.zip
```

镜像示例（任选其一，下载后都必须校验）：

```text
https://npmmirror.com/mirrors/electron/22.3.27/electron-v22.3.27-win32-ia32.zip
https://github.com/electron/electron/releases/download/v22.3.27/electron-v22.3.27-win32-ia32.zip
https://cdn.npmmirror.com/binaries/electron/22.3.27/SHASUMS256.txt
```

## A. 构建机检查

在 `D:\Desk\ALL Vibe\new-class-pet` 的 PowerShell 执行。

```powershell
node -v
npm -v
py -0p
[System.Environment]::OSVersion.VersionString
$env:PROCESSOR_ARCHITECTURE
Test-Path "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC"
Test-Path "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
Get-Item "old-class-pet\class pet\node_modules\electron\dist\version" | Get-Content
```

2026-09-01 已测结果（不要覆盖，追加新记录）：

| 项 | 结果 |
| --- | --- |
| node | v24.14.0，ABI 137 |
| npm | 11.6.2 |
| Python | 无已注册解释器 |
| OS | 25H2 / build 26200，Home |
| VS 2022 x86/x64 cl | 存在 |
| VirtualBox | 不存在 |
| 当前 Electron dist | 33.2.0 |

记录栏：

| 日期 | 操作者 | 结果 | 备注 |
| --- | --- | --- | --- |
| 2026-09-01 | Codex 审计 | 如上 | 未改生产配置 |

## B. L0 下载并校验 Electron 22 ia32

在隔离目录执行，不要写进业务 `node_modules`。

```powershell
$dir = "D:\Desk\ALL Vibe\new-class-pet\analysis_and_requirements\platform_compatibility\artifacts"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Location $dir
$zip = "electron-v22.3.27-win32-ia32.zip"
$url = "https://npmmirror.com/mirrors/electron/22.3.27/$zip"
Invoke-WebRequest -Uri $url -OutFile $zip
$actual = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
$expected = "1119ac7112590cb9c10a8c9b0bb5be65c0e11648a4f1311e6b7a5a00e497c2ce"
if ($actual -ne $expected) { throw "SHA256 mismatch: $actual" }
"SHA256 OK $actual"
```

| 日期 | SHA256 匹配 | 文件大小 | 结果 |
| --- | --- | --- | --- |
|  |  |  | 未执行 |

解压空壳：

```powershell
Expand-Archive -LiteralPath .\electron-v22.3.27-win32-ia32.zip -DestinationPath .\electron-22.3.27-ia32 -Force
Get-Content .\electron-22.3.27-ia32\version
(Get-Item .\electron-22.3.27-ia32\electron.exe).VersionInfo | Select FileVersion, ProductVersion
# PE 机器类型应为 i386
$fs = [IO.File]::Open((Resolve-Path .\electron-22.3.27-ia32\electron.exe), 'Open', 'Read', 'ReadWrite')
$br = New-Object IO.BinaryReader($fs)
$fs.Seek(0x3C, 'Begin') | Out-Null
$pe = $br.ReadInt32()
$fs.Seek($pe + 4, 'Begin') | Out-Null
$machine = $br.ReadUInt16()
$fs.Close()
# 0x14C = i386
"machine=0x{0:X}" -f $machine
```

通过标准：`version` 为 `22.3.27`，machine 为 `0x14C`。

## C. L2 本机 WOW64 空壳冒烟

Win11 x64 上先确认 ia32 Electron 能在 WOW64 启动，这仍不是 Win7 兼容通过。

```powershell
Set-Location "D:\Desk\ALL Vibe\new-class-pet\analysis_and_requirements\platform_compatibility\artifacts\electron-22.3.27-ia32"
.\electron.exe
```

可选：关闭 GPU 再开。

```powershell
.\electron.exe --disable-gpu
```

| 日期 | 能打开默认窗口 | --disable-gpu | 备注 |
| --- | --- | --- | --- |
|  | 未执行 | 未执行 |  |

## D. 后续实现时的构建命令（现在不要改生产 package.json）

这些命令属于实现阶段，不是本次审计已跑过的命令。

兼容版空包（实现阶段）：

```powershell
# 建议使用独立目录，避免污染 class pet 的 Electron 33 锁文件
npx --yes electron@22.3.27 --version
npx --yes electron-builder@24.13.3 --win --ia32 --config electron-builder.compat.yml
```

检查产物：

```powershell
$exe = Get-ChildItem "release\compat" -Recurse -Filter "Class Pet.exe" | Select-Object -First 1
$exe.FullName
$exe.VersionInfo.FileVersion
# FileVersion 必须是 22.3.27，不能是 33.2.0
```

现代版（实现阶段）：

```powershell
npx --yes electron-builder@26.8.2 --win --x64 --config electron-builder.modern.yml
```

原生模块重建（仅 P1，本机目前缺 Python）：

```powershell
$env:npm_config_runtime = "electron"
$env:npm_config_target = "22.3.27"
$env:npm_config_arch = "ia32"
$env:npm_config_target_arch = "ia32"
$env:npm_config_disturl = "https://npmmirror.com/mirrors/electron"
npx --yes @electron/rebuild --version 22.3.27 --arch ia32 -w better-sqlite3 -f
```

禁止用下面这条当作 Electron 22 验证：

```powershell
node -e "require('better-sqlite3')"
```

那只会测宿主 Node 24 ABI 137。

## E. Win7 SP1 32 位 VM 准备

本机是 Windows 11 Home，默认没有完整 Hyper-V。优先安装 VirtualBox。

最低虚拟机规格：

| 项 | 值 |
| --- | --- |
| OS | Windows 7 Professional/Ultimate/Home **SP1** 32-bit，合法 ISO |
| 架构 | 必须 32 位，不要装成 64 位再假装验收 |
| 内存 | 先 2 GB；若无法安装系统可临时 4 GB，但业务验收仍要回到 2 GB 再测一次 |
| 磁盘 | 40 GB |
| CPU | 2 核，关闭 AVX 直通要求 |
| 网络 | 先允许打补丁；业务验收时断网 |

VM 内必装：

1. Windows 7 SP1
2. KB2533623 或后续包含该修复的便利滚动包
3. 可选：VC++ 2015-2022 x86 运行库（原生 sqlite 才必须）
4. 确认 `winver` 显示 Service Pack 1

进入 VM 后记录：

```text
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type" /C:"Total Physical Memory"
```

`System Type` 必须含 `X86-based PC`。

| 日期 | hypervisor | OS 精确版本 | SP1 | KB2533623 | 内存 | 系统类型 | 结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  | 未安装 |  |  |  |  |  | 未执行 |

## F. L3 Win7 空壳

把官方 `electron.exe` 22.3.27 ia32 拷进 VM，不要先上业务安装包。

```text
electron.exe
electron.exe --disable-gpu
```

通过标准：60 秒内出现默认 Electron 窗口，无立即退出。

| 日期 | 默认启动 | --disable-gpu | 事件查看器错误 | 结论 |
| --- | --- | --- | --- | --- |
|  | 未执行 | 未执行 |  | 未验证 |

若空壳失败：先补 SP1/KB2533623，再软件渲染。空壳仍失败才能考虑 Electron 21.4.4。不要用非官方 fork。

## G. L4 业务包 9 项（兼容版）

必须断网、当前用户、无管理员。

| # | 项 | 操作 | 通过标准 | 结果 | 证据 |
| --- | --- | --- | --- | --- | --- |
| 1 | 离线安装 | 断网双击 win7-ia32 NSIS | 当前用户安装成功，不要求管理员 | 未执行 |  |
| 2 | 启动 | 打开快捷方式 | 60 秒内主窗口出现 | 未执行 |  |
| 3 | 建库 | 看 userData | 出现 sqlite/db 文件；日志含 driver= | 未执行 |  |
| 4 | 账号 | 创建并切换本地教师账号 | 能进入对应班级 | 未执行 |  |
| 5 | 学生 | 添加 + 导入 | 名单可见，学号规则正确 | 未执行 |  |
| 6 | 赋分 | 单个 + 批量 | 重启后积分仍在 | 未执行 |  |
| 7 | 大屏 | 打开学生大屏 | 至少 20 人卡片可见 | 未执行 |  |
| 8 | 备份恢复 | 导出、恢复、确认快照 | 当前班级覆盖，其他账号不受影响 | 未执行 |  |
| 9 | 持久化 | 退出再打开 | 数据仍在 | 未执行 |  |

userData 常见位置：

```text
%APPDATA%\Class Pet Compat\
```

若 appId 不同，按实际目录记录，不要猜。

附加观察（失败也要记，不算 9 项本身）：

| 观察 | 结果 |
| --- | --- |
| 主程序 PE 是否 i386 | 未执行 |
| FileVersion 是否 22.3.27 | 未执行 |
| 是否出现 Tailwind/oklch 导致的无颜色/白屏 | 未执行 |
| 2 GB 内存是否开始交换/卡死 | 未执行 |
| 1024x768 窗口是否可用 | 未执行 |

## H. 现代版本机验收

在 Win11 x64 重复 G 的 9 项。

| 项 | 通过标准 | 结果 |
| --- | --- | --- |
| 安装包名 | 含 win-x64 | 未执行 |
| 主程序版本 | 43.x 或 44.x，不能是 33.2.0 | 未执行 |
| 架构 | x64 | 未执行 |
| 原生 .node | 若启用，必须在 app.asar.unpacked | 未执行 |
| 9 项业务 | 全部通过 | 未执行 |

## I. 结论栏（发布前必填）

复制这一段到发行说明，未填完禁止写“支持 Windows 7”。

```text
L0 ia32 zip SHA256: [ ] 匹配  [ ] 未做
L1 本机构建 ia32 NSIS: [ ] 成功  [ ] 未做
L2 Win11 上 ia32 空壳/安装包启动: [ ] 成功  [ ] 未做
L3 Win7 SP1 32 位 VM 官方 Electron 22 空壳: [ ] 成功  [ ] 失败  [ ] 未做
L4 Win7 SP1 32 位 VM 业务 9 项: [ ] 全过  [ ] 部分失败  [ ] 未做
L5 真机: [ ] 未承诺本窗口

当前允许对外说的话：
[ ] 仅“已规划 Electron 22 ia32 双构建”
[ ] 仅“本机构建成功”
[ ] “Win7 32 位虚拟机兼容通过”
[ ] 禁止：“已支持所有最差 Win7 设备”
```
