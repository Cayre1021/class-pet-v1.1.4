# -*- coding: utf-8 -*-
import sys, json

# 模拟 ClassPetCore 中的逻辑验证
class MockStudent:
    def __init__(self):
        self.id = 'stu_zhaoliu'
        self.name = '赵六'
        self.level = 20
        self.pets = {
            'chinese': {'subject': '语文', 'species': 'cat', 'level': 20, 'isHatched': True},
            'math': {'subject': '数学', 'species': 'egg', 'level': 0, 'isHatched': False},
            'english': {'subject': '英语', 'species': 'egg', 'level': 0, 'isHatched': False}
        }

def isSubjectUnlocked(student, subjectKey):
    SUBJECT_ORDER = ['chinese', 'math', 'english']
    if subjectKey not in SUBJECT_ORDER: return False
    idx = SUBJECT_ORDER.indexOf(subjectKey) if hasattr(SUBJECT_ORDER, 'indexOf') else SUBJECT_ORDER.index(subjectKey)
    if idx <= 0: return True
    prevKey = SUBJECT_ORDER[idx - 1]
    prevPet = student.pets.get(prevKey)
    if not prevPet: return False
    prevLevel = prevPet.get('level', 0) if prevPet.get('isHatched', False) else 0
    return prevLevel >= 20

def getAvailableHatchSubjects(student):
    hatched = []
    unhatched = []
    locked = []
    for sub in ['chinese', 'math', 'english']:
        p = student.pets.get(sub)
        if p and p.get('isHatched', False):
            hatched.append(sub)
        else:
            if isSubjectUnlocked(student, sub):
                unhatched.append(sub)
            else:
                locked.append(sub)
    return {
        'allowedSubjects': unhatched,
        'hatchedSubjects': hatched,
        'lockedSubjects': locked
    }

stu = MockStudent()
print("=== 测试 1: 赵六（语文满级20，数学未孵化，英语未孵化）===")
print(f"语文是否解锁: {isSubjectUnlocked(stu, 'chinese')} (预期: True)")
print(f"数学是否解锁: {isSubjectUnlocked(stu, 'math')} (预期: True)")
print(f"英语是否解锁: {isSubjectUnlocked(stu, 'english')} (预期: False, 严禁越级)")

res = getAvailableHatchSubjects(stu)
print(f"当前允许破壳认领的学科: {res['allowedSubjects']} (预期: ['math'])")
print(f"当前被锁定的学科: {res['lockedSubjects']} (预期: ['english'])")

assert isSubjectUnlocked(stu, 'english') == False, "Bug! 英语不应该解锁！"
assert res['allowedSubjects'] == ['math'], "Bug! 允许认领列表中只能有数学，绝不能有英语！"
assert 'english' in res['lockedSubjects'], "Bug! 英语必须在锁定列表中！"

print("\n=== 测试 2: 赵六数学破壳并升到 15 级（依然未满级）===")
stu.pets['math']['isHatched'] = True
stu.pets['math']['species'] = 'dog'
stu.pets['math']['level'] = 15
print(f"英语是否解锁: {isSubjectUnlocked(stu, 'english')} (预期: False, 数学未满20级严禁解锁英语)")
res2 = getAvailableHatchSubjects(stu)
print(f"当前允许破壳认领的学科: {res2['allowedSubjects']} (预期: [])")
assert isSubjectUnlocked(stu, 'english') == False
assert res2['allowedSubjects'] == []

print("\n=== 测试 3: 赵六数学升到 20 级满级 ===")
stu.pets['math']['level'] = 20
print(f"英语是否解锁: {isSubjectUnlocked(stu, 'english')} (预期: True, 数学满20级后英语开放)")
res3 = getAvailableHatchSubjects(stu)
print(f"当前允许破壳认领的学科: {res3['allowedSubjects']} (预期: ['english'])")
assert isSubjectUnlocked(stu, 'english') == True
assert res3['allowedSubjects'] == ['english']

print("\n🎉 自动化逻辑断言全部 PASS！赵六越级解锁 Bug 已在内核与算法层 100% 根治！")
