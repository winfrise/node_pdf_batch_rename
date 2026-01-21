const fs = require('fs-extra');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'config.json');
const INPUT_BASE_DIR = path.join(__dirname, '..', 'input');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error('❌ config/config.json 不存在！');
  console.log('\n请创建 config/config.json，格式如下：');
  console.log(JSON.stringify({ subFolders: ["子文件夹1"], namingRule: "topText" }, null, 2));
  process.exit(1);
}

let config;
try {
  config = fs.readJsonSync(CONFIG_PATH);
} catch (err) {
  console.error('❌ config/config.json 格式错误:', err.message);
  process.exit(1);
}

const { subFolders, namingRule = 'topText' } = config;

if (!Array.isArray(subFolders) || subFolders.length === 0) {
  console.error('❌ config/config.json 中必须包含非空的 subFolders 数组');
  process.exit(1);
}

if (!fs.existsSync(INPUT_BASE_DIR)) {
  console.error(`❌ 主输入目录不存在: ${INPUT_BASE_DIR}`);
  console.log('请在项目根目录创建 "input" 文件夹，并放入子文件夹。');
  process.exit(1);
}

(async () => {
  console.log('📄 PDF 批量重命名工具（多PDF + 可扩展规则）');
  console.log('===========================================');

  for (const folderName of subFolders) {
    const folderPath = path.join(INPUT_BASE_DIR, folderName);

    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠️ 跳过（子文件夹不存在）: ${folderName}`);
      continue;
    }

    if (!fs.statSync(folderPath).isDirectory()) {
      console.warn(`⚠️ 跳过（不是文件夹）: ${folderName}`);
      continue;
    }

    const pdfFiles = (await fs.readdir(folderPath))
      .filter(f => f.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      console.warn(`⚠️ 跳过（无 PDF 文件）: ${folderName}`);
      continue;
    }

    const outputDir = path.join(folderPath, 'output');
    console.log(`\n📁 处理: ${folderName} (${pdfFiles.length} 个 PDF)`);

    for (const pdfFile of pdfFiles) {
      const inputPdfPath = path.join(folderPath, pdfFile);
      try {
        const { processSinglePdf } = require('./renameCore');
        await processSinglePdf(inputPdfPath, outputDir, namingRule);
        console.log(`  ✅ ${pdfFile}`);
      } catch (err) {
        console.error(`  ❌ ${pdfFile} → ${err.message}`);
      }
    }
  }

  console.log('\n🎉 所有任务完成！');
})();