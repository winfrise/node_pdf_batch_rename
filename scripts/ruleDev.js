#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const DEFAULT_DEV_RULE = `// 在此编写你的命名规则函数
// 函数名必须是 async extractTitle(pdfPath)
// 返回 string（新文件名）或 null（回退到原名）

const path = require('path');

// 辅助函数：提取PDF第一页顶部文字（可直接调用）
async function extractTopText(pdfPath) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf');
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const loadingTask = pdfjs.getDocument({ data });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);
  const textContent = await page.getTextContent();
  const items = textContent.items
    .map(item => ({ text: item.str.trim(), y: item.transform[5] }))
    .filter(item => item.text.length > 0)
    .sort((a, b) => b.y - a.y);
  return items.length ? items[0].text : null;
}

// 主规则函数
async function extractTitle(pdfPath) {
  // 示例1: 从文件名提取
  const basename = path.basename(pdfPath, '.pdf');
  const match = basename.match(/地块[_-](\\\\w+)/i);
  if (match) return \`重命名_\${match[1]}\`;

  // 示例2: 从PDF内容提取
  // const text = await extractTopText(pdfPath);
  // if (text && text.includes('问题图斑')) return text;

  return null; // 回退到原文件名
}

module.exports = { extractTitle };
`;

const DEV_RULE_PATH = path.join(__dirname, '..', 'config', 'devRule.js');

if (!fs.existsSync(DEV_RULE_PATH)) {
  fs.outputFileSync(DEV_RULE_PATH, DEFAULT_DEV_RULE);
  console.log(`✅ 已创建规则开发模板: ${DEV_RULE_PATH}`);
  console.log('请编辑此文件，然后输入 PDF 路径进行测试。\n');
}

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testRule(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF 文件不存在:', pdfPath);
    return;
  }

  try {
    delete require.cache[require.resolve(DEV_RULE_PATH)];
    const { extractTitle } = require(DEV_RULE_PATH);

    if (typeof extractTitle !== 'function') {
      console.error('❌ devRule.js 必须导出名为 extractTitle 的函数');
      return;
    }

    console.log('\n🔍 正在运行你的规则...');
    const result = await extractTitle(pdfPath);
    
    const originalName = path.basename(pdfPath, '.pdf');
    if (result === null) {
      console.log('⚠️ 规则返回 null，将使用原文件名');
      console.log('   原文件名:', originalName);
    } else {
      console.log('✅ 提取成功!');
      console.log('   新文件名:', result + '.pdf');
    }
  } catch (err) {
    console.error('💥 规则执行出错:', err.message);
    console.error('   请检查 devRule.js 语法或逻辑');
  }
}

(async () => {
  console.log('🧪 PDF 命名规则开发辅助工具');
  console.log('================================');
  console.log('1. 编辑 config/devRule.js 中的 extractTitle 函数');
  console.log('2. 输入一个 PDF 文件的完整路径进行测试');
  console.log('3. 支持直接拖拽 PDF 文件到终端');
  console.log('4. 输入 "q" 退出\n');

  while (true) {
    const input = await askQuestion('📄 拖入 PDF 文件（或输入路径），输入 "q" 退出: ');
    const trimmed = input.trim();
    if (trimmed.toLowerCase() === 'q') break;

    // 处理拖拽时自动加的引号
    let pdfPath = trimmed.replace(/^['"]|['"]$/g, '');
    await testRule(pdfPath);
    console.log('\n' + '-'.repeat(40) + '\n');
  }

  rl.close();
  console.log('👋 再见！');
})();