import re

def detailed_analyze():
    with open(r'd:/Desk/ALL Vibe/new-class-pet/electron-app/src/teacher_panel_touch_pro.html', 'r', encoding='utf-8') as f:
        text = f.read()

    # Find buttons
    buttons = re.findall(r'<button[^>]*>(.*?)</button>', text, re.DOTALL)
    cleaned_btns = [re.sub(r'<[^>]+>', ' ', b).strip() for b in buttons]
    cleaned_btns = [' '.join(b.split()) for b in cleaned_btns if b.strip()]

    # Find onclick handlers
    onclicks = re.findall(r'onclick=["\']([^"\']+)["\']', text)

    with open(r'd:/Desk/ALL Vibe/new-class-pet/scratch/teacher_panel_details.txt', 'w', encoding='utf-8') as out:
        out.write('=== ONCLICKS ===\n')
        for c in sorted(list(set(onclicks))):
            out.write(f'- {c}\n')
        out.write('\n=== BUTTONS ===\n')
        for b in cleaned_btns:
            out.write(f'- {b}\n')

    print('Wrote scratch/teacher_panel_details.txt')

if __name__ == '__main__':
    detailed_analyze()
