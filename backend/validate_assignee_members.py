#!/usr/bin/env python
"""
AssigneeMember 데이터 검증 스크립트
수동으로 추가된 데이터가 Employee 테이블과 일치하는지 확인
"""
import os
import sys
import django

# Django 설정
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'business_system.settings')
django.setup()

from api.models import AssigneeMember, Employee


def validate_assignee_members():
    """AssigneeMember 데이터 검증"""
    print("=" * 80)
    print("AssigneeMember 데이터 검증 시작")
    print("=" * 80)

    assignee_members = AssigneeMember.objects.all()
    employees = Employee.objects.all()

    # Employee 데이터를 knox_id로 매핑 (mail_knox에서 @ 제거)
    employee_map = {}
    for emp in employees:
        if emp.mail_knox:
            knox_id = emp.mail_knox.split('@')[0]
            employee_map[knox_id] = emp

    print(f"\n총 AssigneeMember: {assignee_members.count()}개")
    print(f"총 Employee: {employees.count()}개")
    print(f"Employee knox_id 매핑: {len(employee_map)}개\n")

    issues = []

    for idx, member in enumerate(assignee_members, 1):
        print(f"\n[{idx}] AssigneeMember 검증:")
        print(f"  - knox_id: {member.knox_id}")
        print(f"  - name: {member.name}")
        print(f"  - employee_number: {member.employee_number}")

        # knox_id로 Employee 찾기
        if member.knox_id not in employee_map:
            issue = f"❌ ISSUE: knox_id '{member.knox_id}'에 해당하는 Employee가 없습니다."
            print(f"  {issue}")
            issues.append(issue)

            # 유사한 knox_id 찾기
            similar = [k for k in employee_map.keys() if member.knox_id.lower() in k.lower() or k.lower() in member.knox_id.lower()]
            if similar:
                print(f"  💡 유사한 knox_id: {similar[:3]}")
            continue

        employee = employee_map[member.knox_id]
        print(f"  ✓ Employee 매칭 성공")
        print(f"    Employee.username: {employee.username}")
        print(f"    Employee.employee_number: {employee.employee_number}")
        print(f"    Employee.mail_knox: {employee.mail_knox}")

        # name 필드 검증
        if member.name != employee.username:
            issue = f"❌ NAME MISMATCH: AssigneeMember.name='{member.name}' != Employee.username='{employee.username}'"
            print(f"  {issue}")
            issues.append(issue)
        else:
            print(f"  ✓ name 일치")

        # employee_number 검증
        if member.employee_number != employee.employee_number:
            issue = f"❌ EMPLOYEE_NUMBER MISMATCH: AssigneeMember='{member.employee_number}' != Employee='{employee.employee_number}'"
            print(f"  {issue}")
            issues.append(issue)
        else:
            print(f"  ✓ employee_number 일치")

    print("\n" + "=" * 80)
    print("검증 결과 요약")
    print("=" * 80)

    if issues:
        print(f"\n⚠️  발견된 문제: {len(issues)}개\n")
        for issue in issues:
            print(f"  • {issue}")

        print("\n수정 방법:")
        print("  1. DB에서 직접 수정")
        print("  2. ApprovalPaths UI에서 해당 인원 삭제 후 다시 추가")
        print("  3. 아래 SQL로 수정:")
        print("\n  -- 예시:")
        print("  UPDATE assignee_member SET")
        print("    name = (SELECT username FROM employee WHERE mail_knox LIKE assignee_member.knox_id || '@%'),")
        print("    employee_number = (SELECT employee_number FROM employee WHERE mail_knox LIKE assignee_member.knox_id || '@%')")
        print("  WHERE id = <ID>;")
    else:
        print("\n✅ 모든 데이터가 정상입니다!")

    print("\n" + "=" * 80)


if __name__ == '__main__':
    try:
        validate_assignee_members()
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
