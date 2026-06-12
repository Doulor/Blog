---
title: "QuickAskAI终于发布成功啦！"
date: "2026-06-12"
images: ["https://img.doulor.cn/diary/QuickAskAI/tmp32B9.webp", "https://img.doulor.cn/diary/QuickAskAI/tmp2DF5.webp"]
---
嘿嘿嘿，终于啊，我做了那么久的这个Powertoys的命令面板插件终于成功在微软商店发布了！这个插件的主体可是当时一天花了29亿token才完成的，包体也是遇到很多问题，比如国际化和证书的问题，阻碍我本地测试，主要是我也不知道发布的时候要不要带证书。最后还是跟微软团队的人互发好几轮邮件才解决，像这样：
```
Hello,

 

Thank you for the patience. Upon installation, the product features and UI appear to be in different language than English even if the OS default is English. Please make sure to localize the product properly or remove the markets from the submission if the product is not intended to be distributed in those markets. Once these changes are made, please resubmit the product for certification again.

 

Additionally, the product is requesting restricted capability runFullTrust. The scenarios listed (HTTP requests to AI services, token storage, and local file access) are supported within the standard app sandbox and do not require the use of a restricted capability. At this time, it has not been clearly demonstrated why the app must rely on a full-trust execution model instead of a sandboxed implementation.

If your app depends on specific functionality that requires a full-trust process (for example, a particular communication or extension mechanism), please provide a more detailed explanation outlining:

 

What component requires full-trust execution

Why this cannot be achieved using the app container model

 

Otherwise, please remove the restricted capability when resubmitting.

 

Thank you,

Alex

Microsoft Store Certification Team
```
给我打回来几次，有因为语言和市场不匹配的，有因为插件一安装就崩溃的，巴拉巴拉，好不容易通过了，连续三封邮件发过来的时候，超级开心😋😋
也算是成为创作者了哈哈哈哈哈

项目的Github地址是：
https://github.com/Doulor/QuickAskAI
项目的微软商店地址是：
https://apps.microsoft.com/detail/9n14wrkdmm5g?cid=DevShareMCLPCS&hl=zh-CN&gl=CN