// rename-pdfs.js
// 适用于 macOS 的 PDF 批量重命名脚本（基于顶部文字）
// 依赖: pdfjs-dist@2.12.313, fs-extra, chalk

const fs = require('fs-extra');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf');
const chalk = require('chalk');

// ======================
// 🔧 配置区 —— 请修改为你自己的路径！
// ======================
const INPUT_DIR = path.resolve(__dirname, './doc1');        // ←←← 改这里！PDF 原文件夹
const OUTPUT_DIR = path.relative(__dirname, './output1'); // ←←← 改这里！输出文件夹
const TOP_MARGIN_PX = 120; // 提取页面顶部多少像素内的文字（可调）

// ======================
// 🛠️ 工具函数
// ======================

/**
 * 从 PDF 第一页提取顶部区域的文字
 */
async function extractTopText(pdfPath) {
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    const textContent = await page.getTextContent();

    // 获取所有文本项，并计算其中心 y 坐标（更可靠）
    const itemsWithY = textContent.items.map(item => {
      // item.transform = [a, b, c, d, e, f]
      // 对于水平文本，y 坐标 ≈ item.transform[5]
      // 但为了鲁棒性，我们直接用 transform[5]
      return {
        text: item.str.trim(),
        y: item.transform[5],
        x: item.transform[4]
      };
    }).filter(item => item.text.length > 0); // 过滤空字符串

    if (itemsWithY.length === 0) return null;

    // 按 y 降序（从上到下），同 y 按 x 升序（从左到右）
    itemsWithY.sort((a, b) => {
      const yDiff = b.y - a.y; // y 越大越靠上（PDF 坐标系 y=0 在底部）
      if (Math.abs(yDiff) < 2) {
        return a.x - b.x; // 同一行从左到右
      }
      return yDiff;
    });

    // 调试：打印前 5 行
    // console.log('前5行:', itemsWithY.slice(0, 5).map(i => `"${i.text}" (y=${i.y})`));

    // 寻找第一个看起来像标题的行（非页码、非日期、长度合理）
    for (const item of itemsWithY) {
      const text = item.text;
      // 跳过常见页脚/页码（如 "1", "第1页", "2024" 等）
      if (/^(\d+|第\d+页|Page \d+|\d{4})$/.test(text)) continue;
      // 跳过太短的（<3字符，除非包含中文）
      if (text.length < 2 && !/[\u4e00-\u9fa5]/.test(text)) continue;
      // 优先匹配你提到的关键词
      if (text.includes('问题图斑') || text.includes('三区三线')) {
        return text;
      }
      // 否则返回第一个合理文本
      return text;
    }

    // 如果没找到，返回第一个非空文本
    return itemsWithY[0].text;
  } catch (err) {
    console.error(chalk.red(`❌ 提取失败 [${path.basename(pdfPath)}]: ${err.message}`));
    return null;
  }
}

/**
 * 清理文件名（移除非法字符）
 */
function sanitizeFilename(str) {
  if (!str) return 'unnamed';
  return str
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // 移除非法字符
    .replace(/\s+/g, ' ')                   // 合并多个空格
    .trim()
    .substring(0, 80)                       // 限制长度（避免过长）
    .replace(/^_+|_+$/g, '');               // 去掉首尾下划线
}

// ======================
// 🚀 主流程
// ======================

(async () => {
  // 创建输出目录
  await fs.ensureDir(OUTPUT_DIR);

  // 读取所有 PDF 文件
  let files;
  try {
    files = await fs.readdir(INPUT_DIR);
    files = files.filter(f => f.toLowerCase().endsWith('.pdf'));
  } catch (err) {
    console.error(chalk.red(`❌ 无法读取输入目录: ${INPUT_DIR}`));
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(chalk.yellow('⚠️  输入目录中没有找到 PDF 文件。'));
    process.exit(0);
  }

  console.log(chalk.blueBright(`📁 发现 ${files.length} 个 PDF 文件，开始处理...\n`));

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const originalName = path.basename(file, '.pdf');

    // 提取标题
    let title = await extractTopText(inputPath);
    if (!title) {
      console.warn(chalk.yellow(`⚠️  未提取到标题，使用原文件名: ${originalName}`));
      title = originalName;
    }

    // 清理并生成安全文件名
    let safeName = sanitizeFilename(title);
    let outputPath = path.join(OUTPUT_DIR, `${safeName}.pdf`);

    // 防止重名
    let counter = 1;
    const baseName = safeName;
    while (await fs.pathExists(outputPath)) {
      safeName = `${baseName}_${counter}`;
      outputPath = path.join(OUTPUT_DIR, `${safeName}.pdf`);
      counter++;
    }

    // 复制文件（保留原文件）
    await fs.copy(inputPath, outputPath);
    console.log(chalk.green(`✅ ${file} → ${safeName}.pdf`));
  }

  console.log(chalk.blueBright(`\n🎉 全部完成！结果已保存至:\n   ${OUTPUT_DIR}`));
})();