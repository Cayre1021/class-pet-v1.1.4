const fs = require('fs');
const { execSync } = require('child_process');

try {
    // Unzip word/document.xml using tar (built-in in Windows 10/11)
    execSync('tar -xf "甲方意见/宠物系统优化需求汇总.docx" word/document.xml -O > scratch/doc_text.xml');
    const xml = fs.readFileSync('scratch/doc_text.xml', 'utf8');
    const text = xml.replace(/<[^>]+>/g, '');
    fs.writeFileSync('scratch/docx_extracted.txt', text, 'utf8');
    console.log('Successfully extracted docx text. Length:', text.length);
    console.log('Sample text:\n', text.slice(0, 1000));
} catch (e) {
    console.error('Error:', e);
}
