---
title: "Minecraft server setup"
published: 2025-11-10
description: "如何搭建一个简单的Minecraft服务器"
tags: ["wiki"]
category: "Minecraft"
draft: false
---


# 如何搭建一个简单的Minecraft插件服务器（以Paper为例）

## 1. 前往服务端官网下载服务器核心
示例：
- Paper端：[https://papermc.io/downloads/paper](https://papermc.io/downloads/paper)
- Fabric端：[https://fabricmc.net/use/server/](https://fabricmc.net/use/server/)
![配图](/images/posts/Minecraftserversetup/1.png)


## 2. 选择并存放核心文件
选择合适的核心版本下载，下载完成后可能会出现安全提醒，保留文件即可。 
![配图](/images/posts/Minecraftserversetup/2.png) 
下载的核心文件后缀为 `.jar`，将其单独放入一个文件夹中（如图所示）。
![配图](/images/posts/Minecraftserversetup/3.png)


## 3. 显示文件拓展名
在文件资源管理器中开启“文件拓展名”显示，这样可以清晰看到文件后缀（如 `.zip`、`.mp3`、`.jpg` 等）。
![配图](/images/posts/Minecraftserversetup/4.png)


## 4. 创建启动批处理文件
右键文件夹空白处，新建文本文档，并重命名（包括后缀）：  
将默认的“新建文本文档.txt”改为“xxx.bat”（xxx可自定义，建议用英文，如 Run.bat、Start.bat，后缀必须为 `.bat`，代表Windows批处理文件）。
![配图](/images/posts/Minecraftserversetup/5.png)

## 5. 编写启动脚本
右键 `.bat` 文件选择“编辑”（可用记事本或其他编辑器），编写启动脚本。以下是最简单的示例：
![配图](/images/posts/Minecraftserversetup/6.png)

```bat
@echo off
@title mcserver
"D:\Java\jdk-21\bin\java.exe" -Xms1G -Xmx2G -jar paper-1.21.10-105.jar
pause
```

参数说明：
- `@title mcserver`：启动后命令提示符窗口的标题（可选，如图所示）。
![配图](/images/posts/Minecraftserversetup/7.png)
- `"D:\Java\jdk-21\bin\java.exe"`：本地Java路径（Minecraft依赖Java运行）。若已配置Java环境变量，可直接写 `java`；若不清楚路径，可通过PCL2启动器的“游戏Java”设置自动搜索，找到 `java.exe` 后复制路径替换。
![配图](/images/posts/Minecraftserversetup/8.png)
![配图](/images/posts/Minecraftserversetup/9.png)
![配图](/images/posts/Minecraftserversetup/10.png)


- `-Xms1G -Xmx2G`：服务器分配的最小内存（1G）和最大内存（2G），需根据电脑配置调整（5人内原版服1-2G足够，插件/模组较多时需增加）。
- `paper-1.21.10-105.jar`：服务端核心文件名（需与下载的 `.jar` 文件名一致，包含 `.jar` 后缀）。
- `pause`：服务器关闭后保留后台窗口（方便查看错误，如图所示）。
![配图](/images/posts/Minecraftserversetup/11.png)


编辑完成后按 `Ctrl+S` 保存（未保存的文件标签栏会有小点，需注意）。
![配图](/images/posts/Minecraftserversetup/12.png)
![配图](/images/posts/Minecraftserversetup/13.png)


## 6. 首次启动与协议同意
双击 `.bat` 文件启动，过程中可能弹出Java运行提示，点击“运行”“确定”即可。  
首次启动会中断，文件夹中会生成 `eula.txt` 文件（服务器协议）。双击用记事本打开，将 `eula=false` 改为 `eula=true`（注意是 `true` 不是 `ture`！），代表同意协议。
![配图](/images/posts/Minecraftserversetup/14.png)
![配图](/images/posts/Minecraftserversetup/15.png)


## 7. 启动服务器
保存 `eula.txt` 后再次双击 `.bat` 文件，服务器会开始下载文件。等待片刻后出现白色窗口（与黑色命令提示符窗口功能一致，均为服务器后台），当显示以下内容时，代表启动成功：
![配图](/images/posts/Minecraftserversetup/17.png)

```
Done (11.148s)! For help, type "help"
```


## 8. 配置服务器属性
服务器启动成功后，需先在后台（白色/黑色窗口均可）输入 `stop` 并回车（停止并保存服务器，防止回档）。若启动脚本含 `pause`，黑色窗口会显示“请按任意键继续...”，按任意键或关闭即可。

此时文件夹中会生成 `server.properties`（服务器配置文件），双击用记事本打开，以下是核心配置项：
![配图](/images/posts/Minecraftserversetup/18.png)

- `gamemode=survival`：游戏模式，可改为 `adventure`（冒险）、`creative`（创造）等。
- `online-mode=true`：在线模式（默认开启，仅正版玩家可进入）。若需离线玩家进入，改为 `false`（注意：可能导致皮肤丢失、数据问题或安全风险，皮肤问题可通过SkinsRestorer插件解决）。
- `server-port=25565`：服务器端口（默认25565，虚拟局域网/内网穿透需用到，保持默认即可）。
- `spawn-protection=16`：出生点保护范围（计算公式：数值×2+1，默认16对应半径33，普通玩家无法交互方块；若无法挖方块，改为0即可）。

修改后按 `Ctrl+S` 保存，重新启动服务器至显示 `Done!` 字样，搭建完成。本地电脑可在游戏多人列表添加服务器，IP填写 `127.0.0.1` 即可进入（延迟接近0ms）。


## 9. 添加插件或模组
若使用插件服务端核心（如Paper），需将下载的插件（通常为 `.jar` 格式）放入服务端根目录的 `plugins` 文件夹中；  
若使用模组端核心（如Fabric），则将模组文件（通常为 `.jar` 格式）放入服务端根目录的 `mods` 文件夹中。  
放入后重启服务器，插件/模组即可生效（部分可能需要额外配置，具体参考对应插件/模组的说明）。


（插个广告：我提供便宜的内网穿透服务，有需求可联系我哦~）
```