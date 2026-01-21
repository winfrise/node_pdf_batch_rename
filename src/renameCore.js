const fs = require('fs-extra');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf');

const DEFAULT_NAMING_RULES = {
  topText: async (pdfPath) => {
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

function loadNamingRules() {
  const userRulesPath = path.join(__dirname, '..', 'config', 'namingRules.js');
  let userRules = {};
  if (fs.existsSync(userRulesPath)) {
    try {
      delete require.cache[require.resolve(userRulesPath)];
      userRules = require(userRulesPath);
      console.log(`🔧 已加载自定义命名规则: ${Object.keys(userRules).join(', ')}`);
    } catch (err) {
      console.warn(`⚠️ 自定义规则加载失败，使用默认规则: ${err.message}`);
    }
  }
  return { ...DEFAULT_NAMING_RULES, ...userRules };
}

function sanitizeFilename(str, maxLength = 80) {
  if (!str) return 'unnamed';
  return str
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLength)
    .replace(/^_+|_+$/g, '');
}

exports.processSinglePdf = async (inputPdfPath, outputDir, ruleName = 'topText') => {
  await fs.ensureDir(outputDir);

  const NAMING_RULES = loadNamingRules();

  if (!NAMING_RULES[ruleName]) {
    const available = Object.keys(NAMING_RULES).join(', ');
    throw new Error(`未知命名规则: "${ruleName}"。可用规则: ${available}`);
  }

  let title;
  try {
    title = await NAMING_RULES[ruleName](inputPdfPath);
  } catch (err) {
    console.warn(`    ⚠️ 规则 "${ruleName}" 执行出错: ${err.message}`);
    title = null;
  }

  if (!title) {
    title = path.basename(inputPdfPath, '.pdf');
    console.log(`    ⚠️ 使用原文件名: ${title}`);
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