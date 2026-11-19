# dsh-paper-mode

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）加一个**论文写作模式**：选中后，会话获得一份常驻的学术写作方法提示词，以及读文件、检索文献、交付文档所需的工具。

面向课程论文、学位论文、期刊论文、会议论文、开题报告与基金申请。提示词为中文，正文语言跟随目标论文（中英文均可）。

## 它提供什么

| 环节 | 建议内容 |
|---|---|
| 对齐 | 先判断阶段与约束，只问影响结论的问题，给方案时说明代价 |
| 选题 | 研究问题四问、三类价值区分、可行性评估、宽题到可操作题目的三档收敛、候选题目与风险 |
| 文献 | 检索策略与数据库、引文追踪、文献矩阵、主题式综述写法、研究缺口收敛 |
| 结构 | IMRaD 与人文社科骨架、学位论文的绪论与结论要求、篇幅配比、反向大纲检查 |
| 语言 | 段落纪律、学术语体与限定词、常见病清单、中英典型问题、原句改句对照 |
| 规范 | 引用格式与转述、图表与数据溯源、学术伦理边界 |
| 投稿 | 自审清单、审稿意见逐条回应、选刊优先级、改稿顺序 |

工具方面包含：文件读写与检索、PowerShell、后台任务、Web 搜索与抓取（核对真实文献）、任务清单、向用户提问、技能加载（含 Office 文档技能）、Office 渲染与转换、交付声明，以及子代理与 workflow（并行检索、分章草稿、独立审稿）。

## 安装

这是一个自包含的 DSH bundle（无运行时依赖、无构建脚本），要求 DSH `>= 0.2.2-rc.3 < 0.4.0`。

**方式一：Plugins 页**

下载或克隆本仓库，在 DSH 的 Plugins 页选择 **Add plugin**，指向仓库目录（含 `package.json` 的那一层）。

**方式二：agent 工具**

```text
plugin_manager install_bundle target=<本仓库目录的绝对路径>
```

也可以指向 `pnpm pack` 生成的 `.tgz`。

**方式三：npm / 私有 registry**

`package.json` 目前是 `private: true`、包名 `@local/dsh-paper-preset`。要发布，先去掉 `private`，把 `@local` 换成自己有权发布的 scope，然后 `pnpm publish`；接收方按包名安装。

安装后**新建会话**，在模式选择器里选择「论文写作」。已存在的会话不会切换模式。

## 修改

提示词与工具都在 `cordis.patch.yml` 的 `preset-paper` 行内：

- `persona.prefix`：常驻方法论（约 1700 字）
- `persona.suffix`：交付前自查清单
- `plugins`：该模式挂载的插件行

改完重新安装 bundle，新会话即使用新定义。

注意：`prefix` 与 `suffix` 是模板，出现 `{{...}}` 会被当作提示变量解析，正文不要使用双层花括号。

## 打包

```bash
pnpm pack --pack-destination dist
```

`files` 字段决定了包内容：`cordis.patch.yml`、`locale/`、`docs/DETAIL.md`、`icon.svg`、`README.md`。

## 目录结构

```text
.
├── package.json          # bundle 清单：dsh.bundle.patch / engines.dsh / files
├── cordis.patch.yml      # 唯一一条 preset 声明：persona + 工具行
├── locale/
│   ├── zh.json           # Plugins 页标题与描述（中文）
│   └── en.json           # Plugins 页标题与描述（英文）
├── docs/DETAIL.md        # Plugins 详情页正文
├── icon.svg              # 插件图标
└── README.md
```

## 限制

- 提示词以中文撰写；英文写作时输出英文正文，但方法说明仍是中文。
- 检索工具可能返回不存在或有误的文献，正式引用前请以数据库原文核对。
- 模式依赖 DSH 安装自带的插件包；`engines.dsh` 不满足时安装会被拒绝，而不是装上一个无法激活的模式。
- 不代写、不伪造数据与文献、不协助规避查重。

## 许可证

[MIT](LICENSE)
