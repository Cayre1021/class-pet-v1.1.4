import sys
import docx

sys.stdout.reconfigure(encoding='utf-8')

for name in ['20260918/系统界面优化需求讨论_完整校对准确版.docx', '20260918/系统界面优化需求讨论.docx']:
    doc = docx.Document(name)
    print(f'=== {name} === (total {len(doc.paragraphs)} paras)')
    for idx, p in enumerate(doc.paragraphs):
        text = p.text.strip()
        if text.startswith('一、') or text.startswith('二、') or text.startswith('三、') or text.startswith('第') or '需求' in text or '【' in text:
            print(f"  [{idx}] {text[:80]}")
    print()
