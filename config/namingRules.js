// config/namingRules.js
// 返回一个对象：{ ruleName: async (pdfPath) => string || null }

const path = require('path');
const fs = require('fs-extra');

// 示例：自定义规则
async function myCustomRule(pdfPath) {
  // 例如：从文件名提取编号
  const basename = path.basename(pdfPath, '.pdf');
  const match = basename.match(/ID_(\d+)/);
  if (match) {
    return `图斑_${match[1]}`;
  }
  return null; // 回退到默认逻辑
}

// 导出所有自定义规则
module.exports = {
  // // 覆盖内置规则
  // topText: async (pdfPath) => {
  //   // 你可以重写默认的 topText 逻辑
  //   // ...（略）
  // },

  // // 或新增规则
  // fromFilename: myCustomRule,
  // originalName: async (pdfPath) => path.basename(pdfPath, '.pdf')
};