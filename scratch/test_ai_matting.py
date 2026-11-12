import sys, os
from rembg import remove
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
print("Testing AI Matting on bunny-stage3.jpeg...")
raw_bunny = Image.open('electron-app/src/assets/pets_raw/bunny/bunny-stage3.jpeg')
out_bunny = remove(raw_bunny)
out_bunny.save('scratch/bunny_rembg_test.png')
print("Successfully generated scratch/bunny_rembg_test.png")

# Composite over magenta to check for internal holes
bg_bunny = Image.new('RGBA', out_bunny.size, (255, 0, 255, 255))
comp_bunny = Image.alpha_composite(bg_bunny, out_bunny)
comp_bunny.save('scratch/bunny_rembg_magenta.png')
print("Successfully generated scratch/bunny_rembg_magenta.png")

print("Testing AI Matting on hamster-stage1.jpeg...")
raw_hamster = Image.open('electron-app/src/assets/pets_raw/hamster/hamster-stage1.jpeg')
out_hamster = remove(raw_hamster)
out_hamster.save('scratch/hamster_rembg_test.png')

bg_hamster = Image.new('RGBA', out_hamster.size, (255, 0, 255, 255))
comp_hamster = Image.alpha_composite(bg_hamster, out_hamster)
comp_hamster.save('scratch/hamster_rembg_magenta.png')
print("Successfully generated scratch/hamster_rembg_magenta.png")
