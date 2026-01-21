// config/devRule.js
// 用于 npm run dev-rule 命令的临时规则测试
// 修改此文件后，直接在终端拖入 PDF 即可实时测试

const path = require('path');
const fs = require('fs-extra');

/**
 * 辅助函数：提取 PDF 第一页顶部文字，并支持调试预览
 * @param {string} pdfPath - PDF 文件路径
 * @returns {Promise<string|null>} 提取的文字或 null
 */
async function extractTopText(pdfPath) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf');
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const loadingTask = pdfjs.getDocument({ data });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);
  const textContent = await page.getTextContent();

  const items = textContent.items
    .map(item => ({
      text: item.str.trim(),
      y: item.transform[5], // Y 坐标（越大越靠上）
      x: item.transform[4]
    }))
    .filter(item => item.text.length > 0);

  if (items.length === 0) return null;

  // 从上到下、从左到右排序
  items.sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) < 2) return a.x - b.x; // 同一行按 X 排序
    return yDiff;
  });

  // 🔍【高级】文字预览（仅在 DEBUG_TEXT=1 时启用）
  if (process.env.DEBUG_TEXT) {
    console.log('\n📄 PDF 第一页文字预览（按从上到下排序）:');
    console.log('----------------------------------------');
    items.slice(0, 15).forEach((item, i) => {
      console.log(`  ${String(i + 1).padStart(2)}. [Y=${item.y.toFixed(1).padStart(6)}] "${item.text}"`);
    });
    if (items.length > 15) {
      console.log(`  ... 还有 ${items.length - 15} 行`);
    }
    console.log('');
  }

  // 跳过页码类文本
  for (const item of items) {
    const text = item.text;
    if (/^(\d+|第\d+页|Page \d+|\d{4})$/.test(text)) continue;
    if (text.length < 2 && !/[一-龥]/.test(text)) continue;
    return text;
  }

  return items[0].text;
}

/**
 * 主规则函数：必须命名为 extractTitle
 * @param {string} pdfPath - 当前处理的 PDF 路径
 * @returns {Promise<string|null>} 新文件名（不含 .pdf）或 null（回退到原名）
 */
async function extractTitle(pdfPath) {
  const basename = path.basename(pdfPath, '.pdf');

  // ✨ 示例 1：从文件名提取关键词
  const idMatch = basename.match(/ID[_\-](\w+)/i);
  if (idMatch) {
    return `图斑_${idMatch[1]}`;
  }

  // ✨ 示例 2：从 PDF 内容提取标题
  const topText = await extractTopText(pdfPath);
  if (topText) {
    if (topText.includes('问题图斑') || topText.includes('三区三线')) {
      return topText;
    }
    return topText;
  }

  // ✨ 示例 3：固定前缀 + 原名
  // return `重命名_${basename}`;

  return null;
}

module.exports = { extractTitle };