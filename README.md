# 小 A 子 App

小 A 子是一个以宫廷角色对话为入口的 Android 应用，包含语音交互、待办奏折、文档导入、点餐演示、出行演示和角色动画。当前修复版为 **0.7.11 / versionCode 38**，基于 0.7.10 / versionCode 37 的源码发布，应用 ID 为 `com.xiaoazi.standalone`。

Web 前端和 Android 原生层的完整源码都在这里。角色视频、音频、图片及离线识别模型放在同版本 GitHub Release 中，下载脚本会按提交内的 SHA256 清单还原；仓库没有引用开发者电脑上的共享目录。

## 获取与运行

需要 Node.js 22.13 或更新版本（pnpm 11 的要求）、pnpm 11.25.0、Python 3.10 或更新版本。构建手机角色素材和运行媒体回归测试还需要命令行可用的 FFmpeg、ffprobe（含 libvpx-vp9）。

```sh
git clone https://github.com/CCCIRCCCLE715/xiaoazi-app.git
cd xiaoazi-app
python3 scripts/fetch_assets.py
cd project
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
pnpm dev
```

开发页面默认地址是 [http://127.0.0.1:5206](http://127.0.0.1:5206)。Web 页面可检查布局和本地逻辑；录音、原生文件选择、跨应用启动等能力需要 Android 宿主。

也可以在 [Release](https://github.com/CCCIRCCCLE715/xiaoazi-app/releases/tag/v0.7.10-source) 手动下载 `xiaoazi-runtime-v0.7.10.zip`，在仓库根目录执行：

```sh
python3 scripts/fetch_assets.py --archive /path/to/xiaoazi-runtime-v0.7.10.zip
```

## 构建 Android

安装 JDK 17，以及 Android SDK 的 `platforms;android-35`、`build-tools;35.0.0`。本版最低 Android 8.0 / API 26，目标 API 35，只包含 **arm64-v8a** 原生库。

在仓库根目录执行：

```sh
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=/path/to/android-sdk
python3 scripts/build_apk.py
python3 scripts/check_native.py
```

构建脚本读取 `project/dist-standalone`，输出 `android/build/xiaoazi-0.7.11-unsigned.apk`。它使用 SDK 的 aapt2、D8 和 zipalign；本仓库没有 Gradle 工程或 Gradle Wrapper。若构建工具不在默认目录，可设置 `ANDROID_BUILD_TOOLS` 为该目录的完整路径。

安装 APK 前需要签名。设置 `XIAOAZI_KEYSTORE`、`XIAOAZI_KEY_ALIAS`、`XIAOAZI_STORE_PASSWORD`、`XIAOAZI_KEY_PASSWORD` 后重新运行构建脚本，会额外输出并验证 `xiaoazi-0.7.11-signed.apk`。请使用自己的签名材料。原交付版的私钥未公开。需要覆盖更新原版时，请向项目所有者私下获取原 keystore 及签名配置；不要把它们提交到 Git 或上传到公开 Release。使用另一把新签名的 APK，需要卸载旧版后安装，不能保留原签名身份直接更新。

后续发布更新应增加 `versionCode`，例如由 37 升为 38，版本名改为 `0.7.11`。构建脚本从 `android/AndroidManifest.xml` 的 `android:versionCode`、`android:versionName` 读取打包版本，输出名和校验也使用这两个值；请同步修改 `project/package.json` 的 `version` 及 `project/capsule/manifest.json` 的 `version`、`versionCode`。版本为 0.7.11 时，签名输出为 `android/build/xiaoazi-0.7.11-signed.apk`。

构建脚本会在 Windows 使用 Java 和 Android 工具的 `.exe` 文件名。本地编译与脚本检查在 macOS 完成，尚未验证 Windows 或 Linux 上的完整打包。

## 0.7.11 时间与负载修复

晨起页面固定显示 `09:00`，不随系统时间或入口参数变化；原有进入五秒后播放、向右滑动结束的流程保留。滑动结束条较原位置上移32个CSS像素，留出更大的底部操作余量。

角色在菜单遮挡、原生宿主暂停或页面隐藏时停止绘制，并释放视频源，避免部分 Android WebView 在视频暂停后仍持续重绘。回来后恢复原位置；动作切换只在新动作首帧就绪后释放旧解码器。多个暂停原因独立管理，关闭菜单不会误恢复仍在后台的页面。

`pnpm build` 和 `pnpm dev` 会先用 `scripts/prepare_mobile_media.py` 生成 720×720 的透明角色视频，保存在 `.cache/mobile-media/`。原始 1440 像素素材与音频不修改；生成时校验帧数、时长和透明标记，回归测试还检查透明像素。画布也改为 720×720，页面尺寸和角色位置保留。需要对照原始素材时可在构建或启动前设置 `XIAOAZI_ORIGINAL_MEDIA=1`。

原版签名未就绪时，可设置 `XIAOAZI_TEST_BUILD=1` 构建独立的 `com.xiaoazi.standalone.verification`，显示为“小 A 子·验证版”，不覆盖原版数据。该包可调试，仅供验证；默认正式包仍不可调试。验证包也需使用自己的测试签名。签名私钥和密码不得提交到仓库。

实测及未完成范围见 [修复验证记录](qa/playback-fix-2026-10-29.md)。系统底层重启的根因尚未确证，性能改善不等于已经消除随机重启。

## 目录与配置

| 路径 | 内容 |
| --- | --- |
| `project/src` | React、TypeScript 前端及 Web/原生桥接 |
| `project/tests` | 路由、交互、文档解析、媒体绑定等回归测试 |
| `android/src`、`android/res` | Android Activity、WebView、离线 ASR、录音、文件与外部应用接线 |
| `android/tests` | 原生 Java 测试 |
| `sensevoice` | 模型与运行库清单、许可证；二进制由脚本还原 |
| `runtime-assets.json` | Release 资源地址、大小和逐文件 SHA256 |
| `map-source` | 离线杭州演示地图的 OpenStreetMap 原始数据 |

模型服务的地址、模型名和 API Key 在 App 设置页填写，仓库不含实际 Key。可选统计配置见 `project/.env.example`；全部留空时统计停用。不要把服务端密钥放入以 `VITE_` 开头的变量，这些变量会进入前端包。

## 本版行为与验证范围

v37 保留既有角色动作、SenseVoice 离线识别、文档导入和模型设置，点餐卡展示所选菜品价格与“准奏”入口，并显示外部应用启动失败提示。五个商家的九张券是固定演示数据。出行路线也是离线示例，不提供实时交通或真实订单能力。

本次源码发布的检查结果记录在 `SOURCE_RELEASE.json`。Web 构建、回归测试和 Java 测试通过，不代表已经完成 Android 真机录音、音画同步、DeepSeek 实际服务、美团或支付宝跳转验收。本版未完成这些实机验收；部分角色媒体仍保留候选标记，详见源码配置。

Java 检查会编译 24 个生产源文件和 15 个测试源文件，运行其中 13 组。`ModelHttpsTest` 需要实际网络服务，`DocumentAnalysisContractTest` 需要 Android JSON 运行时，因此未纳入本地 JVM 通过结论。历史 ASR 文本夹具仅用于路由回归。

## 资源与许可

第三方代码、地图和模型遵循各自许可：Leaflet 为 BSD-2-Clause，Phosphor 图标为 MIT，OpenStreetMap 数据为 ODbL-1.0，PDF.js 为 Apache-2.0。相应声明保留在源码、`project/public/licenses` 和资源包内。

离线识别使用 sherpa-onnx 2.0.0（Apache-2.0）、ONNX Runtime（MIT）、Silero VAD（MIT）和 SenseVoiceSmall INT8。SenseVoice 权重采用 **FunASR Model Open Source License Agreement v1.1**，完整文本见 `sensevoice/FUNASR-MODEL-LICENSE`。

角色素材、声音和界面素材随本版用于还原应用。音乐卡内的《特别的人》为方大同歌曲的约 30 秒官方试听片段，原有权利归相应权利人。公开源码不额外授予第三方音乐或品牌素材的商业使用权。

本次未为整个项目另行指定开源许可证。公开可见不等于授予任意再许可权；已有第三方许可继续适用。
