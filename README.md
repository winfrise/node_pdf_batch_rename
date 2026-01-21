# 📄 PDF 批量重命名工具（子文件夹模式）

> 每个子文件夹含一个 PDF，自动重命名并输出到其 `output/` 子目录


## 📁 项目结构要求

```
pdf-renamer/
├── README.md
├── package.json
├── config/
│   ├── config.json          ← 主配置
│   ├── namingRules.js       ← 正式自定义规则（可选）
│   └── devRule.js           ← 临时测试规则（由辅助工具生成）
├── scripts/
│   └── ruleDev.js           ← 规则开发辅助脚本
├── input/                   ← 你放 PDF 的地方（手动创建）
└── src/
    ├── index.js             ← 主程序入口
    └── renameCore.js        ← 核心处理逻辑
```


# PDF批量重命名工作流说明

## 🎯 场景 1：常规使用（已有规则）

按以下步骤完成PDF批量重命名：

1. **准备数据**

    - 创建目录 `input/case01/`，将多个目标PDF放入该目录。

2. **配置范围**

    - 编辑 `config/config.json` 文件，在配置中填入：

        ```JSON
        
        ["case01"]
        ```

3. **运行**

执行以下命令：

```Bash

# 安装依赖
npm install
# 启动批量处理
npm start
```

1. **查看结果**

处理完成后，在 `input/case01/output/` 目录中获取重命名后的PDF文件。

## 🔧 场景 2：开发新命名规则

如需自定义PDF命名规则，按以下流程开发：

1. **启动开发模式**

执行命令启动规则开发环境：

```Bash

npm run dev-rule
```

1. **编辑规则**

    - 打开 `config/devRule.js` 文件。

    - 修改 `extractTitle` 函数，编写自定义的PDF标题提取逻辑（示例框架）：

        ```JavaScript
        
        // config/devRule.js
        function extractTitle(pdfPath) {
          // 在这里编写你的标题提取逻辑
          // 示例：从PDF中提取第一页标题文本
          const title = "自定义标题_" + Date.now();
          return title;
        }
        module.exports = { extractTitle };
        ```

2. **测试规则**

    - 在终端的提示下，将单个PDF文件拖入终端。

    - 查看终端输出的提取结果，验证规则是否符合预期。

3. **迭代优化**

    - 根据测试结果修改 `devRule.js` 并保存。

    - 再次拖入PDF文件测试，重复此步骤直到逻辑满足需求。

4. **部署正式规则**

    - 将 `devRule.js` 中调试完成的逻辑，复制到 `config/namingRules.js`。

    - 编辑 `config/config.json`，添加配置项：

        ```JSON
        
        {
          "caseList": ["case01"],
          "namingRule": "你的规则名"
        }
        ```

5. **批量运行**

执行命令启动批量处理：

```Bash

npm start
```