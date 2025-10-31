---
title: "ElytraFlip wiki"
published: 2025-09-29
description: "a minecraft plugin named ElytraFlip"
tags: ["wiki"]
category: "wiki"
draft: false
---

# 汉语wiki

**ElytraFlip**

**核心用途**
解决手动通过背包穿戴/取下鞘翅的繁琐问题。玩家只需一条指令，即可凭空生成/移除鞘翅（无需背包中预先存放鞘翅），大幅提升游戏操作效率（尤其适合飞行场景中快速切换装备）。

**核心特点**
- 凭空操作：穿戴时直接在胸甲栏生成并装备鞘翅；取下时直接移除鞘翅（不存入背包，避免占用背包空间）。
- 指令简洁：基础指令 /elytra，无需额外参数，所有玩家都能轻松使用。
- 权限可控：通过权限节点限制使用范围，可按需配置为仅普通玩家使用或仅管理员使用。
- 多语言支持：内置12种主流语言（中文、英文、西班牙语等），可自动适配玩家客户端的语言设置。
- 轻量无负担：代码简洁，无多余功能，不会占用服务器额外性能。

**适用环境**
服务器类型：Minecraft Spigot（Paper）服务器（支持1.13-1.21.*版本）

**指令说明**

```
/elytra
```
切换鞘翅状态：
- 未穿戴时：生成鞘翅并装备
- 已穿戴时：移除鞘翅（直接消失）


```
/elytraflip reload
```
重载插件配置文件与消息文件，使修改生效


**权限说明**

```
elytra.flip
```
允许使用 /elytra 指令切换鞘翅

```
elytra.reload
```
允许使用 /elytraflip reload 指令重载配置

**注意事项**

穿戴鞘翅会覆盖当前装备的胸甲，取下鞘翅后需手动重新装备胸甲。
消息文本可通过服务器 plugins/ElytraFlip/messages.yml 文件完全自定义。
  




# English Wiki

**ElytraFlip**

**Core Purpose**
Eliminates the hassle of manually equipping/removing elytra via inventory. With a single command, it allows players to spawn/remove elytra out of thin air (no need to have elytra in inventory), significantly improving gameplay efficiency (especially for quick gear switching during flight).

**Key Features**
- Airborne Operation：Spawns elytra directly into the chestplate slot when equipping; removes elytra entirely (no inventory storage) when unequipping.
- Simple Command: /elytra One basic command with no extra parameters—easy to use for all players.
- Permission Control：Restrict usage via permission nodes, configurable for regular players or admins only.
- Multi-language Support：Built-in 12 major languages (Chinese, English, Spanish, etc.), automatically adapts to player client language settings.
- Lightweight：Clean code with no redundant features, ensuring no extra server performance load.

**Compatible Environment**
Server Type：Minecraft spigot(paper) Server (1.13-1.21.*)

**Command Usage**

```
/elytra
```
Toggles elytra status:
- Equips a spawned elytra if not wearing one
- Removes elytra (disappears) if already wearing


```
/elytraflip reload
```
Reloads plugin config and message files to apply changes


**Permission**

```
elytra.flip
```
Allows using the /elytra command to toggle elytra

```
elytra.reload
```
Allows using the /elytraflip reload command to reload configs

**Notes**

Equipping elytra will overwrite the current chestplate; re-equip your chestplate manually after removing elytra.
Message texts are fully customizable via the plugins/ElytraFlip/messages.yml file on the server.
