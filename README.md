# 地球 Online 🌏

一个把生活记录、期待与真实经历连接起来的小世界。没有打卡、排名和缺席惩罚，按自己的节奏探索生活。

**早期开发版本 · 原生 HTML / CSS / JavaScript · MIT 开源**

## 在线体验与下载

**[🌏 打开示例网站](https://earth.lme.one/)** · **[📱 下载 Android APK](https://github.com/Littlelameg/earth-online/releases/download/android-v0.1.0/earth-online-0.1.0.apk)** · **[发布说明与校验值](https://github.com/Littlelameg/earth-online/releases/tag/android-v0.1.0)**

Android 测试版 **0.1.0** 支持 **Android 8.0 及以上**。下载安装包后，按系统提示允许本次安装来源。应用通过 WebView 打开示例网站，需要网络；网页内容会随网站更新，并非固定在本仓库某个提交。浏览器里的本地记录和 AI 配置不会自动迁移到应用中。

APK 已通过签名校验，尚未完成真机安装、登录同步和导出的完整验收。安装包发布在 GitHub Releases，签名私钥不公开。示例站与自行部署版本使用各自的数据环境；开源不代表公开用户记录。

## 能做什么

- 自由写下日记、备忘和愿望，搜索、编辑与回看记录。
- 在「地球协会」发现生活提案，收藏期待，尝试后留下足迹。
- 用小岛承载主动留下的经历，不自动展示全部私密日记。
- 本地保存、JSON 备份导出与合并导入、恢复相关保护。
- 可选自配 AI：兼容 Chat Completions 的 HTTPS 服务，主动请求才生成建议。
- 提供 CloudBase 同步接入代码和 Android WebView 包装应用源码。

## 本地运行

安装 Node.js 24；预览命令另需 Python 3。克隆后执行：

```sh
git clone https://github.com/Littlelameg/earth-online.git
cd earth-online
npm ci
npm test
npm run build
python -m http.server 8080 --directory dist --bind 127.0.0.1
```

浏览器打开 <http://127.0.0.1:8080>。Windows 如果没有 `python` 命令，可改用 `py -3`。也可以用任意静态 HTTP 服务器托管 `dist/`。

`dist/` 包含手写网页源码，需要纳入版本管理；`npm run build` 主要打包 CloudBase SDK 并同步共享模块，不会从 `src/` 生成整个网站。

## 可选服务与数据边界

**云同步默认关闭。** 本地使用无需云账号。自行部署时修改 `dist/cloudbase-config.js`，使用自己的环境并完成认证、数据库、云函数及安全域名配置。参见 [CloudBase 接入记录](CLOUDBASE-SETUP.md) 和 [数据库说明](database/README.md)。这些历史记录描述不同阶段，不能当作当前生产服务的可用性承诺。

**AI 默认不带平台密钥。** 在应用设置里配置自己的服务地址、模型和密钥。直连服务需要允许浏览器 CORS；仅在主动请求时发送当下意愿及授权范围内的记录。密钥保存在当前浏览器，不是加密保险箱，不应在共用设备长期保留。可选服务端适配器见 [server/README.md](server/README.md)，尚需接入真实认证和额度控制。

**本地记录需要备份。** 清除浏览器数据或卸载应用可能删除本地资料。Git 只备份项目代码，不备份个人日记、线上数据库或浏览器密钥。

## 项目结构

| 路径 | 内容 |
| --- | --- |
| `dist/` | 网页、样式、业务模块和浏览器 SDK |
| `src/`、`scripts/` | SDK 入口与构建脚本 |
| `tests/` | Node.js 自动测试 |
| `cloudfunctions/`、`database/` | 云函数与数据库迁移 |
| `server/` | 可选 AI 服务端适配器 |
| `android-app/` | Android 包装应用源码与构建说明 |

Android 源码目前默认打开原项目站点；自建时需调整 `MainActivity.java` 中的站点配置。SDK、签名私钥和密码不随源码分发；APK 通过 Releases 单独提供。构建前需按 [Android 说明](android-app/README.md) 准备工具。尚未完成真机完整验收。

## 开发与贡献

欢迎通过 Issue 描述问题、提出想法，或提交小范围 PR。请写清复现步骤和验证结果；不要上传真实日记、邮箱验证码、API Key 或签名文件。修改后运行 `npm test` 和 `npm run build`。

测试包含离线模拟，不代表真实 AI 服务、邮件登录、跨设备云同步或 Android 真机验收通过。需求与历史设计见 [REQUIREMENTS.md](REQUIREMENTS.md) 和 [DESIGN.md](DESIGN.md)。本地回退方法见 [版本存档说明](版本存档说明.md)。

## 许可证

原创项目代码按 [MIT](LICENSE) 发布。第三方依赖保留各自许可证；CloudBase SDK 使用 Apache-2.0，见 [依赖声明](dist/vendor/NOTICE.txt) 及 SDK 内嵌声明。
