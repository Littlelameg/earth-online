# 地球 Online Android 安装版 0.1.0

交付：`release/earth-online-0.1.0.apk`，包名 `one.lme.earth`，Android 8.0 及以上。

公开下载：[Android 0.1.0 测试版](https://github.com/Littlelameg/earth-online/releases/tag/android-v0.1.0)（包含 APK 和 SHA-256 校验文件）。

示例网站：[地球 Online](https://earth.lme.one/)。

## 使用

把 APK 发到 Android 手机，打开文件并按系统提示允许本次使用的文件管理器安装应用。安装后点击「地球 Online」图标即可进入现有正式站。

- 首次在应用里登录原邮箱账号，云端记录可继续使用。浏览器里的游客记录、本地恢复副本、AI 密钥不会自动迁移；不要为了迁移清除浏览器数据。
- AI 服务在应用里重新配置。密钥仍只保存在应用 WebView 本地，不进入世界备份。
- 顶部「更多 → 导出我的记录」使用系统文件选择器保存 JSON；只导出当前世界，格式与网页版一致，不含最近移走副本和 API 密钥。
- 这是联网版，初次启动和页面重新加载需要网络，不承诺完整离线。网页功能随正式站更新，原生功能变动需要新版 APK。
- 卸载、清除应用数据会删除本地资料，请先确认同步成功并导出备份。后续覆盖升级应使用同一签名和更高 versionCode，无需卸载。
- 无相机、定位、通讯录或外部存储权限；只申请联网权限。

## 实现选择与核验来源（2026-10-17）

采用系统 WebView 的独立安装应用，保留 `https://earth.lme.one/` 正式来源，复用现有 CloudBase 安全域名。没有采用本地打包网页的新来源，避免再迁移鉴权与 CORS；也不引入第二套业务数据。

Android 官方 WebView 文档：<https://developer.android.com/develop/ui/views/layout/webapps/webview>。启用 DOM storage、HTTPS-only、禁用本地文件访问，外链交给浏览器，SSL 错误拒绝，不添加 JavascriptInterface。备份通过原生菜单在主页面读取既有 EarthAccount.current() 接口，用户主动选择文件保存位置。

Storage Access Framework：<https://developer.android.com/training/data-storage/shared/documents-files>，采用 ACTION_CREATE_DOCUMENT。agent-reach 的 Jina 文档读取超时；WebView 文档通过 web 工具读取，未声称 Jina 成功。

构建工具来自 Google SDK 仓库 <https://dl.google.com/android/repository/repository2-1.xml>。采用 Build Tools 35.0.0、Platform 35 r2、JDK 17；下载 ZIP SHA-1 与官方仓库清单逐一匹配。没有修改全局 Java/SDK 配置，无第三方运行时依赖。

## 已完成验证与限制

- Java 编译、DEX 转换、资源打包成功。
- APK v2/v3 签名验证成功，zipalign 验证成功。
- 清单检查：包名 one.lme.earth；版本0.1.0；minSdk26、targetSdk35；权限只有 INTERNET；可启动 Activity。
- adb 未发现连接的 Android 设备，尚未执行安装/启动、OTP 登录、跨设备同步、WebView AI 请求、键盘和系统文件保存的真机测试。此包为首版测试包，不把构建成功当成真机验收通过。
- 网页正式版代码与部署未更改。之前浏览器同步测试通过不能替代本 APK 的测试。

## 继续构建

在 PowerShell 执行 `./build.ps1`。SDK 位于 git 忽略的 tools/sdk，脚本中固定了结构。aapt2 在中文路径上失败，因此构建中间文件放在 `%LOCALAPPDATA%/EarthOnlineBuild`，最终 APK 复制回 release。

签名私钥与随机密码保存在 git 忽略的 `private/`。务必安全备份整个 private 目录，不能公开或随 APK 分发；丢失后不能用新的签名覆盖升级现有安装。构建脚本不会在现有密码但私钥缺失时自动生成新签名。
