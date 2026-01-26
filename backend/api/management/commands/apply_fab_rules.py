"""
Django management command to apply Fab_Info rules

Usage:
    python manage.py apply_fab_rules
"""
from django.core.management.base import BaseCommand
from api.fab_info_utils import apply_rules


class Command(BaseCommand):
    help = 'Fab_Info 규칙을 적용하여 Fab_Info_Filtered 테이블을 업데이트합니다.'

    def handle(self, *args, **options):
        """
        Management command 실행 함수
        """
        self.stdout.write(self.style.NOTICE('Fab_Info 규칙 적용을 시작합니다...'))

        # 규칙 적용 실행
        result = apply_rules()

        # 결과 출력
        if result['success']:
            self.stdout.write(self.style.SUCCESS(f"✓ {result['message']}"))
            self.stdout.write(f"  - 원본 데이터: {result['original_count']}건")
            self.stdout.write(f"  - 가공 데이터: {result['filtered_count']}건")
            self.stdout.write(f"  - 삭제된 행: {result['deleted_count']}건")
            self.stdout.write(f"  - 변경된 값: {result['replaced_count']}건")
        else:
            self.stdout.write(self.style.ERROR(f"✗ {result['message']}"))
            raise SystemExit(1)
