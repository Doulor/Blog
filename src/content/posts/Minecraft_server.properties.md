---
title: "Minecraft_server.properties"
published: 2025-11-04
description: "我的世界java版服务器配置文件详细介绍"
tags: ["wiki"]
category: "Minecraft"
draft: false
---

# Minecraft服务器server.properties配置项说明（按首字母排序）

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| allow-cheats | 布尔 | false | 允许服务器内使用作弊命令（版本差异配置）。 |
| allow-flight | 布尔 | false | 允许生存模式玩家飞行；设为`false`时，生存模式飞行的玩家会被踢出。 |
| allow-nether | 布尔 | true | 允许玩家进入下界；设为`false`则无法进入下界。 |
| announce-player-achievements | 布尔 | true | 广播玩家获得成就的信息到聊天栏（版本差异配置）。 |
| broadcast-console-to-ops | 布尔 | true | 将控制台输入的信息广播给在线OP（管理员）。 |
| broadcast-rcon-to-ops | 布尔 | true | 将RCON远程控制台的输入信息广播给在线OP。 |
| difficulty | 字符串 | easy | 服务器难度，可选值：<br>- peaceful（和平）<br>- easy（简单）<br>- normal（普通）<br>- hard（困难） |
| enable-command-block | 布尔 | false | 启用命令方块。 |
| enable-jmx-monitoring | 布尔 | false | 启用JMX监控（需配合`rmi.port`等参数）。 |
| enable-query | 布尔 | false | 启用GameSpy4查询协议（用于服务器列表显示）。 |
| enable-rcon | 布尔 | false | 启用RCON远程控制台（需配合`rcon.password`/`rcon.port`）。 |
| enable-status | 布尔 | true | 启用服务器状态查询（如服务器列表的状态显示）。 |
| enforce-secure-profile | 布尔 | true | 强制玩家使用安全档案（降低非正版账户风险）。 |
| enforce-whitelist | 布尔 | false | 强制启用白名单，仅白名单玩家可加入。 |
| entity-broadcast-range-percentage | 整数（0-100） | 100 | 实体广播范围的百分比，调整玩家可见实体的距离（100为默认范围）。 |
| force-gamemode | 布尔 | false | 强制玩家使用服务器默认游戏模式，覆盖玩家自身模式。 |
| function-permission-level | 整数（1-4） | 2 | 函数的权限等级，决定不同权限玩家能否执行函数。 |
| gamemode | 字符串 | survival | 服务器默认游戏模式，可选值：<br>- survival（生存）<br>- creative（创造）<br>- adventure（冒险）<br>- spectator（旁观） |
| generate-structures | 布尔 | true | 生成游戏内结构（如村庄、地牢）。 |
| generator-settings | 字符串 | 空 | 自定义世界生成的设置（如超平坦预设）。 |
| hardcore | 布尔 | false | 启用硬核模式（难度锁为困难，玩家死亡后被封禁）。 |
| hide-online-players | 布尔 | false | 隐藏在线玩家列表，其他玩家无法查看在线情况。 |
| initial-disabled-packs | 字符串 | 空 | 初始禁用的资源包。 |
| initial-enabled-packs | 字符串 | vanilla | 初始启用的资源包（默认是原版`vanilla`）。 |
| level-name | 字符串 | world | 世界文件夹名称（服务器加载对应目录的世界）。 |
| level-seed | 字符串 | 空 | 世界种子，留空则随机生成。 |
| level-type | 字符串 | minecraft:normal | 世界类型，可选值：<br>- minecraft:normal（默认）<br>- minecraft:flat（超平坦）<br>- minecraft:large_biomes（大型生物群系）<br>- minecraft:amplified（放大化） |
| log-ips | 布尔 | true | 将玩家连接的IP地址记录到日志。 |
| max-build-height | 整数 | 256 | 玩家可建造的最高高度（对应原版世界高度）。 |
| max-chained-neighbor-updates | 整数 | 1000000 | 最大连锁方块更新次数，防止过多更新导致卡顿。 |
| max-players | 整数（0-2147483647） | 20 | 服务器允许的最大在线玩家数。 |
| max-tick-time | 整数 | 60000 | 单个tick的最长处理时间（毫秒），超时则服务器崩溃（0为无限制）。 |
| motd | 字符串 | A Minecraft Server | 服务器列表中显示的描述信息（MOTD）。 |
| network-compression-threshold | 整数 | 256 | 网络数据包压缩阈值（小于该值的包不压缩）。 |
| online-mode | 布尔 | true | 启用在线模式（验证玩家是否为正版账户）。 |
| op-permission-level | 整数（1-4） | 4 | OP权限等级：<br>- 1：绕过出生点保护<br>- 2：使用大部分命令（如/gamemode）<br>- 3：使用管理命令（如/ban）<br>- 4：使用所有命令（如/op） |
| prevent-proxy-connections | 布尔 | false | 阻止代理连接，防止玩家隐藏真实IP。 |
| pvp | 布尔 | true | 启用玩家对战（PVP）。 |
| query-port | 整数（1-65535） | 25565 | GameSpy4查询协议使用的端口（通常与`server-port`一致）。 |
| rate-limit | 整数 | 0 | 速率限制（0为无限制），防止恶意请求。 |
| rcon.password | 字符串 | 空 | RCON远程控制台的密码（启用RCON时必须设置）。 |
| rcon.port | 整数（1-65535） | 25575 | RCON远程控制台使用的端口。 |
| require-resource-pack | 布尔 | false | 强制玩家加载服务器指定的资源包。 |
| resource-pack | 字符串 | 空 | 服务器资源包的URL（需为可直接访问的链接）。 |
| resource-pack-prompt | 字符串 | 空 | 玩家加入时显示的资源包提示信息。 |
| resource-pack-sha1 | 字符串 | 空 | 资源包的SHA1哈希值（用于验证完整性）。 |
| server-ip | 字符串 | 空 | 服务器绑定的IP地址（留空则绑定所有可用IP）。 |
| server-port | 整数（1-65535） | 25565 | 玩家连接服务器使用的游戏端口。 |
| simulation-distance | 整数（3-32） | 10 | 模拟距离（加载/模拟实体、区块的范围）。 |
| spawn-animals | 布尔 | true | 允许动物生成。 |
| spawn-protection | 整数 | 16 | 出生点保护范围（仅OP可在此区域建造）。 |
| sync-chunk-writes | 布尔 | true | 同步区块写入（防止数据丢失，可能影响性能）。 |
| text-filtering-config | 字符串 | 空 | 文本过滤配置文件的路径（用于过滤聊天内容）。 |
| use-native-transport | 布尔 | true | 使用原生传输（提升网络性能，依赖系统环境）。 |
| view-distance | 整数（3-32） | 10 | 视距（玩家可见的区块范围）。 |
| white-list | 布尔 | false | 启用白名单，仅白名单玩家可加入。 |