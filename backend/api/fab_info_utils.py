"""
Fab_Info 규칙 적용 유틸리티

bdq_handler.py에서 import하여 사용:
    from .fab_info_utils import apply_rules
    apply_rules()
"""

import re
import logging
from django.db import transaction

logger = logging.getLogger(__name__)


# SQL 인젝션 방어를 위한 위험 패턴 (E1)
DANGEROUS_PATTERNS = [
    r"('|\")",                          # 따옴표
    r"(--|#|/\*)",                       # SQL 주석
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|EXECUTE)\b)",  # SQL 키워드
    r"(;)",                             # 명령어 구분자
    r"(\bOR\b\s*\d+\s*=\s*\d+)",        # OR 1=1 패턴
    r"(\bAND\b\s*\d+\s*=\s*\d+)",       # AND 1=1 패턴
]


def validate_input(value: str) -> str:
    """
    SQL 인젝션 패턴 검사 (E1)

    Args:
        value: 검사할 문자열

    Returns:
        검증된 문자열

    Raises:
        ValueError: 위험한 패턴이 감지된 경우
    """
    if not value:
        return value

    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, value, re.IGNORECASE):
            raise ValueError(f"허용되지 않는 문자가 포함되어 있습니다: {value}")

    return value.strip()


def apply_rules() -> dict:
    """
    Fab_Info 원본 테이블을 복사하고, Fab_Info_Rule에 저장된 모든 규칙을 적용하여
    Fab_Info_Filtered 테이블에 저장합니다. (기존 데이터는 덮어쓰기 - B3)

    이 함수는 다음 상황에서 호출됩니다:
    1. bdq_handler.py에서 Fab_Info 업데이트 후 (C1)
    2. 규칙 추가/수정/삭제 API 호출 후 (C2)

    Returns:
        dict: {
            'success': bool,
            'original_count': int,      # 원본 데이터 수
            'filtered_count': int,      # 가공 후 데이터 수
            'deleted_count': int,       # 삭제된 행 수
            'replaced_count': int,      # 변경된 값 수
            'message': str
        }
    """
    from .models import Fab_Info, Fab_Info_Rule, Fab_Info_Filtered

    try:
        with transaction.atomic():
            # 1. 기존 가공 테이블 전체 삭제 (덮어쓰기 - B3)
            Fab_Info_Filtered.objects.all().delete()

            # 2. 모든 규칙 조회
            rules = Fab_Info_Rule.objects.all()
            delete_values = set(r.target_value for r in rules if r.action == 'delete')
            replace_rules = {r.target_value: r.new_value for r in rules if r.action == 'replace'}

            # 3. 원본 데이터 순회하며 규칙 적용
            original_count = Fab_Info.objects.count()
            deleted_count = 0
            replaced_count = 0
            filtered_records = []

            for row in Fab_Info.objects.all().iterator():
                ees_line_id = row.ees_line_id or ''

                # 삭제 규칙: 해당 값이면 skip
                if ees_line_id in delete_values:
                    deleted_count += 1
                    continue

                # 변경 규칙: 값 치환
                new_ees_line_id = ees_line_id
                if ees_line_id in replace_rules:
                    new_ees_line_id = replace_rules[ees_line_id]
                    replaced_count += 1

                # 가공 테이블에 삽입할 레코드 추가
                filtered_records.append(Fab_Info_Filtered(
                    ppid_8=row.ppid_8,
                    ees_line_id=new_ees_line_id,
                    mes_line_id=row.mes_line_id,
                    eqp_id=row.eqp_id,
                    proc_model_name=row.proc_model_name
                ))

            # 4. 벌크 삽입으로 성능 최적화
            if filtered_records:
                Fab_Info_Filtered.objects.bulk_create(filtered_records, batch_size=1000)

            filtered_count = len(filtered_records)

            logger.info(
                f"apply_rules 완료: 원본 {original_count}건, "
                f"가공 {filtered_count}건, 삭제 {deleted_count}건, 변경 {replaced_count}건"
            )

            return {
                'success': True,
                'original_count': original_count,
                'filtered_count': filtered_count,
                'deleted_count': deleted_count,
                'replaced_count': replaced_count,
                'message': f'규칙 적용 완료: {filtered_count}건의 데이터가 생성되었습니다.'
            }

    except Exception as e:
        logger.error(f"apply_rules 실패: {str(e)}")
        return {
            'success': False,
            'original_count': 0,
            'filtered_count': 0,
            'deleted_count': 0,
            'replaced_count': 0,
            'message': f'규칙 적용 실패: {str(e)}'
        }


def get_unique_ees_line_ids() -> list:
    """
    Fab_Info 테이블에서 중복 제거된 ees_line_id 목록을 반환합니다.

    Returns:
        list: 중복 제거된 ees_line_id 목록
    """
    from .models import Fab_Info

    return list(
        Fab_Info.objects
        .exclude(ees_line_id__isnull=True)
        .exclude(ees_line_id='')
        .values_list('ees_line_id', flat=True)
        .distinct()
        .order_by('ees_line_id')
    )


if __name__ == "__main__":
    """
    fab_info_utils.py를 직접 실행하여 규칙을 적용합니다.

    사용법:
        # 컨테이너 내부에서
        cd /app/backend
        python -m api.fab_info_utils

        # 또는
        cd /app
        python -m backend.api.fab_info_utils
    """
    import os
    import sys
    import django

    # 현재 파일의 위치를 기준으로 backend 디렉토리 찾기
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)

    # backend 디렉토리를 sys.path에 추가
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    print(f"DEBUG: backend_dir = {backend_dir}")
    print(f"DEBUG: sys.path = {sys.path[:3]}")

    # Django 설정 초기화
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'business_system.settings')

    try:
        django.setup()
    except Exception as e:
        print(f"✗ Django 설정 초기화 실패: {e}")
        print(f"  현재 디렉토리: {os.getcwd()}")
        print(f"  파일 위치: {__file__}")
        print(f"  backend_dir: {backend_dir}")
        exit(1)

    # 규칙 적용 실행
    print("Fab_Info 규칙 적용을 시작합니다...")
    result = apply_rules()

    # 결과 출력
    if result['success']:
        print(f"✓ {result['message']}")
        print(f"  - 원본 데이터: {result['original_count']}건")
        print(f"  - 가공 데이터: {result['filtered_count']}건")
        print(f"  - 삭제된 행: {result['deleted_count']}건")
        print(f"  - 변경된 값: {result['replaced_count']}건")
    else:
        print(f"✗ {result['message']}")
        exit(1)
