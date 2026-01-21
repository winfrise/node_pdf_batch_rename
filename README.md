# 📄 PDF 批量重命名工具（子文件夹模式）

> 每个子文件夹含一个 PDF，自动重命名并输出到其 `output/` 子目录


## 📁 项目结构要求

```
pdf-renamer/
├── README.md
├── package.json
├── config/
│ ├── config.json ← 主配置（必填）
│ └── namingRules.js ← 自定义命名规则（可选）
├── input/ ← 你的 PDF 放这里（手动创建）
│ ├── case01/
│ │ ├── report_v1.pdf
│ │ └── final_data.pdf ← ✅ 多个 PDF 完全支持！
│ └── 地块汇总/
│ └── scan_2025.pdf
└── src/ ← 工具核心代码（勿动）
├── index.js
└── renameCore.js
```


