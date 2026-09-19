import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read project review & development plan
with open('PROJECT_REVIEW_AND_DEVELOPMENT_PLAN.md', 'r', encoding='utf-8') as f:
    plan = f.read()

print("=== PROJECT PLAN PREVIEW (First 2000 chars) ===")
print(plan[:2000])

# Read V1_LITE_FINAL_DECISIONS_BASELINE.md
with open('V1_LITE_FINAL_DECISIONS_BASELINE.md', 'r', encoding='utf-8') as f:
    decisions = f.read()

print("\n=== V1 LITE FINAL DECISIONS PREVIEW ===")
print(decisions[:2000])
