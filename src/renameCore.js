const fs = require('fs-extra');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf');

// === 内置默认规则 ===
const DEFAULT_NAMING_RULES = {
  topText: async (pdfPath) => {
    // ...（你原有的 topText 逻辑，保持不变）
    const data = new Uint8Array(await fs.readFile(pdfPath));
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const textContent = await page.getTextContent();

    const itemsWithY = textContent.items
      .map(item => ({
        text: item.str.trim(),
        y: item.transform[5],
        x: item.transform[4]
      }))
      .filter(item => item.text.length > 0);

    if (itemsWithY.length === 0) return null;

    itemsWithY.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) < 2) return a.x - b.x;
      return yDiff;
    });

    for (const item of itemsWithY) {
      const text = item.text;
      if (/^(\d+|第\d+页|Page \d+|\d{4})$/.test(text)) continue;
      if (text.length < 2 && !/[一-龥]/.test(text)) continue;
      if (text.includes('问题图斑') || text.includes('三区三线')) {
        return text;
      }
      return text;
    }
    return itemsWithY[0].text;
  },

  originalName: async (pdfPath) => {
    return path.basename(pdfPath, '.pdf');
  }
};

// === 加载用户自定义规则（如果存在）===
function loadNamingRules() {
  const userRulesPath = path.join(__dirname, '..', 'config', 'namingRules.js');
  let userRules = {};
  if (fs.existsSync(userRulesPath)) {
    try {
      userRules = require(userRulesPath);
      console.log('🔧 已加载自定义命名规则:', Object.keys(userRules));
    } catch (err) {
      console.warn('⚠️ 自定义规则加载失败，使用默认规则:', err.message);
    }
  }

  // 合并：用户规则优先
  return { ...DEFAULT_NAMING_RULES, ...userRules };
}

// === 公共工具 ===
function sanitizeFilename(str, maxLength = 80) {
  if (!str) return 'unnamed';
  return str
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLength)
    .replace(/^_+|_+$/g, '');
}

// === 主函数 ===
exports.processSinglePdf = async (inputPdfPath, outputDir, ruleName = 'topText') => {
  await fs.ensureDir(outputDir);

  const NAMING_RULES = loadNamingRules(); // 每次运行时动态加载（方便热更新）

  if (!NAMING_RULES[ruleName]) {
    throw new Error(`未知命名规则: "${ruleName}"。可用规则: ${Object.keys(NAMING_RULES).join(', ')}`);
  }

  let title = await NAMING_RULES[ruleName](inputPdfPath);

  if (!title) {
    // 回退到原文件名（安全兜底）
    title = path.basename(inputPdfPath, '.pdf');
    console.log(`    ⚠️ 规则 "${ruleName}" 未提取标题，使用原文件名: ${title}`);
  }

  let safeName = sanitizeFilename(title, 80);
  let outputPath = path.join(outputDir, `${safeName}.pdf`);
  let counter = 1;
  const baseName = safeName;

  while (await fs.pathExists(outputPath)) {
    safeName = `${baseName}_${counter}`;
    outputPath = path.join(outputDir, `${safeName}.pdf`);
    counter++;
  }

  await fs.copy(inputPdfPath, outputPath);
};