# dsh-paper-mode

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.2--rc.3%20%3C0.4.0-4b32c3)](https://github.com/deepseek-ai/deepseek-harness)
[![LaTeX](https://img.shields.io/badge/LaTeX-XeLaTeX%20%7C%20pdfLaTeX%20%7C%20LuaLaTeX-008080)](skills/latex-paper/SKILL.md)
[![Platforms](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey)](#平台与-shell)

[English](README.md) | 简体中文

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）加一个**论文写作模式**：选中后，会话获得一份常驻的学术写作方法提示词，以及读文献、核引文、编译 LaTeX、交付文档所需的工具。

面向课程论文、学位论文、期刊论文、会议论文、开题报告与基金申请。方法提示词以中文撰写；论文正文跟随目标语言；LaTeX 技能以英文撰写。

## 它提供什么

| 环节 | 建议内容 |
|---|---|
| 对齐 | 先判断阶段与约束，只问影响结论的问题，给方案时说明代价 |
| 选题 | 研究问题四问、三类价值区分、可行性评估、宽题到可操作题目的三档收敛、候选题目与风险 |
| 文献 | 检索策略与数据库、引文追踪、文献矩阵、主题式综述写法、研究缺口收敛 |
| 结构 | IMRaD 与人文社科骨架、学位论文的绪论与结论要求、篇幅配比、反向大纲检查 |
| 语言 | 段落纪律、学术语体与限定词、常见病清单、中英典型问题、原句改句对照 |
| LaTeX | 引擎选择、工程布局、编译循环、日志排错、交叉引用与文献闭合、PDF 版式自检 |
| 规范 | 引用格式与转述、图表与数据溯源、学术伦理边界 |
| 投稿 | 自审清单、审稿意见逐条回应、选刊优先级、改稿顺序 |

工具方面包含：文件读写与检索、后台任务、Web 搜索与抓取（核对真实文献）、任务清单、向用户提问、Office 渲染与转换、交付声明、技能加载、子代理与 workflow（并行检索、分章草稿、独立审稿）。

## 优先支持 Linux 与 macOS

模式最初在 Windows 下开发，现在把 Linux 与 macOS 当作一等宿主：

- **Shell 随平台切换**：Linux/macOS 挂 `bash`，Windows 挂 `pwsh`，由 `process.platform` 决定，编译命令、`latexmk`、`biber`、`fc-list` 在常见的平台上直接可用。
- **LF 行尾**：`.gitattributes` 把 YAML、JSON、Markdown、Shell、SVG 统一为 LF，克隆后脚本与 patch 在任何系统上行为一致。
- **POSIX 构建脚本**：LaTeX 工具是纯 `bash`，无额外依赖，可直接在 CI 容器里运行。
- **大小写敏感路径**：技能明确禁止带空格或大小写混用的图片路径，避免在 Linux 上编译失败。

## LaTeX 支持

Bundle 自带两个技能，通过 `skill-filesystem` 自动挂载：

```text
skills/paper-decisions/
├── SKILL.md                     # 决策记录 + 理论结构：改前读、改后写
└── templates/
    ├── decisions.md             # 只追加的日志：日期/类型/触发/候选/判据/裁定/理由/影响/状态
    └── theory-map.md            # 理论 → 构念 → 操作化 → 章节 → 检验，附 mermaid 结构图
```

`paper-decisions` 解决的是论文跨会话之后必然丢失的东西：某条意见为什么被采纳或拒绝、几个方案按什么标准裁定的、文献为什么引这篇不引那篇、理论结构怎么落到章节。改动结构前先读既有裁定，改完追加一条。mermaid 块在 Typora / Obsidian / GitHub 能画，DSH 聊天界面不能——聊天里用表格或缩进大纲。

第二个技能是 `latex-paper`：

```text
skills/latex-paper/
├── SKILL.md                     # 诊断 → 构建 → 引用 → 排错 → 检查 → 交付
├── references/
│   ├── engines.md               # 引擎选择、TeX Live/biber/latexmk 安装、中文字体
│   ├── project-layout.md        # main.tex、sections/、figures/、.gitignore、命名规则
│   ├── bibliography.md          # BibTeX 与 biblatex、GB/T 7714、IEEE、APA、条目核对
│   ├── troubleshooting.md       # 读日志与「症状 → 原因 → 修法」表
│   └── submission.md            # 匿名化、PDF 检查、源码包、arXiv
├── scripts/
│   ├── latex-doctor.sh          # 只读的工具链与字体报告
│   └── latex-build.sh           # 引擎探测、latexmk 或手动多遍编译、错误汇总
└── templates/
    ├── latexmkrc                # 以 XeLaTeX 为默认的 latexmk 配置
    ├── Makefile                 # make / make watch / make clean
    ├── main.tex                 # ctex + natbib 骨架
    ├── refs.bib                 # 示例文献库
    └── gitignore                # LaTeX 中间产物
```

模式会：

- 从 `% !TEX program`、`.latexmkrc` 或导言区（`ctex`、`xeCJK`、`fontspec`、`unicode-math` → XeLaTeX/LuaLaTeX）判断引擎；
- 优先用 `latexmk`，没有时退化为 引擎 → BibTeX/Biber → 引擎 → 引擎；
- 硬错误与未定义引用视为构建失败，缺字与 overfull 单独报告；
- 交付前检查 PDF 的页数、字体嵌入与版式；
- 绝不为了凑参考文献而编造条目。

示例：

```bash
bash skills/latex-paper/scripts/latex-doctor.sh
bash skills/latex-paper/scripts/latex-build.sh main.tex
```

TeX 工具链**不随模式安装**；模式会探测本机已装内容，并告诉用户缺什么。详见 [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md#external-tools-optional-detected-at-run-time)。

## 平台与 Shell

| 宿主 | Shell 行 | 说明 |
|---|---|---|
| Linux | `tool-bash` | 在 Debian/Ubuntu + TeX Live 上验证；容器与 CI 可直接用 |
| macOS | `tool-bash` | MacTeX 或 `brew install texlive`；字体来自系统 |
| Windows | `tool-pwsh` | 用 PowerShell 替代 bash；提示词与技能会给出对应平台命令 |

两个 shell 行互斥，每个宿主恰好启用一个。LaTeX 脚本是 `bash`，面向 Linux/macOS（以及 Windows 上的 WSL2）。

## 依赖要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| DeepSeek Harness | `>=0.2.2-rc.3 <0.4.0` | 写在 `engines.dsh`；安装与启动时校验，不满足会被拒绝 |
| DSH 自带插件 | 随上述 DSH 版本 | 不需要任何外部插件 |
| TeX Live（可选） | 任意当前版本 | 中文用 `xelatex`，英文用 `pdflatex`，建议装 `latexmk` 与 `biber`/`bibtex` |
| 中文字体（可选） | Noto CJK 或 Fandol | Fandol 随 `texlive-lang-chinese` 提供 |

没有运行时 npm 依赖。逐行的依赖矩阵、安装命令与兼容策略见 [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md)。

## 安装

这是一个自包含的 DSH bundle：`package.json` 声明 `dsh.bundle.patch`，没有构建步骤。

### Plugins 页

克隆仓库，在 DSH 中打开 **Plugins → Add plugin**，选择仓库目录（含 `package.json` 的那一层）。

### agent 工具

```text
plugin_manager install_bundle target=<本仓库的绝对路径>
```

同一条命令也可以指向打包后的 tarball。

### Release tarball 或 npm

从 [Releases](https://github.com/revive/dsh-paper-mode/releases) 下载 `dsh-paper-mode-<version>.tgz`，然后：

```bash
dsh plugin --profile <name> add ./dsh-paper-mode-<version>.tgz
# 发布到 npm 之后也可以：
dsh plugin --profile <name> add dsh-paper-mode
```

加入 bundle 层后重启 GUI，再**新建会话**，在模式选择器里选择「论文写作」。已存在的会话不会切换模式。

## 修改

模式的全部内容都在 `cordis.patch.yml`：

- `persona.prefix`：常驻方法论（约 3500 字）
- `persona.suffix`：交付前自查清单
- `plugins`：该模式挂载的插件行

LaTeX 技能在 `skills/latex-paper/`。改完重新安装 bundle，新会话即使用新定义。`prefix` 与 `suffix` 是模板，正文不要使用双层花括号，否则会被当作提示变量解析。

方法提示词刻意用中文。[docs/PROMPT-LANGUAGE.md](docs/PROMPT-LANGUAGE.md) 记录了它的实测体积、中英文小规模对比，以及为什么只维护一份提示词而不做两套翻译。

## 目录结构

```text
.
├── cordis.patch.yml            # 唯一一条 preset 声明：persona + 工具行
├── package.json                # bundle 清单：dsh.bundle.patch / engines.dsh / files
├── locale/
│   ├── en.json                 # Plugins 页标题与描述（英文）
│   └── zh.json                 # Plugins 页标题与描述（中文）
├── docs/
│   ├── DETAIL.en.md            # Plugins 详情页（英文）
│   ├── DETAIL.zh.md            # Plugins 详情页（中文）
│   └── DEPENDENCIES.md         # 依赖矩阵与兼容策略
├── skills/
│   ├── latex-paper/            # LaTeX 技能（references、scripts、templates）
│   └── paper-decisions/        # 决策记录 + 理论结构技能（templates）
├── scripts/check-bundle.mjs    # CI 与本地共用的校验脚本
├── .github/                    # CI 与发布工作流、topic 清单、辅助脚本
├── CHANGELOG.md
├── README.md                   # 英文 README
├── README.zh-CN.md             # 本文件
└── LICENSE
```

## 开发

需要 Node.js 24 与 pnpm 11。

```bash
pnpm install
pnpm run check          # 校验清单、patch YAML、locale、文档、技能、打包内容
pnpm pack               # 生成 dsh-paper-mode-<version>.tgz
```

能找到已安装的 DSH 时，`pnpm run check` 会把每个插件行解析到该安装（可用 `DSH_PACKAGE_DIR` 指定具体安装目录）。加 `--strict` 可把警告视为失败。

在不影响真实 profile 的前提下测试安装：

```bash
export DSH_HOME="$(mktemp -d)"
pnpm pack --pack-destination dist
export TGZ="$(pwd)/$(ls dist/dsh-paper-mode-*.tgz)"
dsh --profile papertest --from-default-profile web --dump-config >/dev/null
dsh plugin --profile papertest add "$TGZ"
dsh --profile papertest --dump-config | grep -A3 'preset-paper'
```

## 发布流程

1. 修改 `package.json` 的 `version`，在 `CHANGELOG.md` 加 `## [<version>]` 段落。
2. 运行 `pnpm run check` 与 `pnpm pack`。
3. 提交后打 tag 并推送：

   ```bash
   git tag v<version>
   git push origin v<version>
   ```

4. `release` 工作流会校验 tag 与版本一致、运行检查、从 `CHANGELOG.md` 生成 release notes、打包 tarball、生成 SHA-256 校验和，并创建或更新 GitHub Release。
5. 需要重写 notes 时，手动运行同一工作流（`workflow_dispatch`）并填版本号。

## 仓库 Topics

推荐集合放在 [`.github/topics.txt`](.github/topics.txt)，手动设置一次即可——在仓库页的 **About → Topics**，或：

```bash
GH_TOKEN=<具备仓库管理写权限的 token> bash .github/scripts/set-topics.sh
```

topic 是元数据，不是分发渠道：这个 bundle 通过 DSH 插件市场和 npm 被发现，两者读的是 `package.json` 的 `keywords`。所以仓库里**刻意没有**对应的工作流——为了同步六个字符串而在 Secrets 里存一个仓库管理 token 不划算，而且 `latex`、`ai-agent` 这类大 topic 下面有几万个仓库，本来就露不出来。

## 限制

- 方法提示词以中文撰写；英文写作时输出英文正文，但方法说明仍是中文。
- 检索工具可能返回不存在或有误的文献，正式引用前请以数据库原文核对。
- Bundle 会校验 `engines.dsh`；版本不满足时拒绝安装，而不是装上一个无法激活的模式。
- LaTeX 技能是方法与工具，不是 TeX 发行版；本机没有 TeX 工具链时不会产出 PDF。
- 不代写、不伪造数据与文献、不协助规避查重。

## 许可证

[MIT](LICENSE)
