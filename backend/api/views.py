import csv
from datetime import datetime, timedelta
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

# KST (GMT+9) 변환을 위한 시간차
KST_OFFSET = timedelta(hours=9)


def format_datetime_kst(dt):
    """GMT datetime을 KST로 변환하여 문자열로 반환"""
    if not dt:
        return ''
    kst_dt = dt + KST_OFFSET
    return kst_dt.strftime('%Y-%m-%d %H:%M:%S')

from .models import RequestSubmission
from .serializers import RequestSubmissionSerializer


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def request_submission_view(request):
    """
    의뢰 상신 목록 조회 및 생성
    GET: 목록 조회, POST: 신규 생성
    """
    if request.method == 'GET':
        try:
            # 페이지네이션 파라미터
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 10))

            # 최신순으로 정렬하여 페이지네이션
            submissions = RequestSubmission.objects.all().order_by('-submitted_at')

            # 페이지네이션 계산
            total_count = submissions.count()
            start_index = (page - 1) * page_size
            end_index = start_index + page_size

            page_submissions = submissions[start_index:end_index]

            serializer = RequestSubmissionSerializer(page_submissions, many=True)

            return Response({
                'results': serializer.data,
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def export_request_submissions_csv(request):
    """
    RequestSubmission 전체 데이터를 CSV로 내보내기
    GET /api/request-submissions/export-csv

    content, excel_1, excel_2 필드는 제외
    """
    try:
        # 전체 데이터 조회 (최신순 정렬)
        submissions = RequestSubmission.objects.all().order_by('-submitted_at')

        # 파일명 생성 (request_submissions_YYYY-MM-DD.csv)
        today = datetime.now().strftime('%Y-%m-%d')
        filename = f'request_submissions_{today}.csv'

        # CSV Response 생성 (UTF-8 BOM 포함)
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)

        # CSV 헤더 (content, excel_1, excel_2 제외한 27개 필드)
        headers = [
            'ID',
            '부서',
            '의뢰 제목',
            '상신자',
            '상신자 메일',
            '상신 시간',
            'Line ID',
            'PPID',
            'EQPID',
            '변경의뢰 항목',
            'Max TAT',
            '상태',
            '내부결재담당자',
            '담당자',
            '결재고유번호',
            '결재상태',
            '코멘트(담당자배정)',
            '코멘트(반려)',
            '코멘트(승인)',
            '배정 시간',
            '실제 배정자',
            '반려 시간',
            '실제 반려자',
            '작성완료 시간',
            '실제 승인자',
            '내부 완결 시간',
            '생성 시간',
            '수정 시간',
        ]
        writer.writerow(headers)

        # 데이터 행 작성
        for submission in submissions:
            row = [
                submission.id,
                submission.part or '',
                submission.title or '',
                submission.submitted_by or '',
                submission.mail_knox or '',
                format_datetime_kst(submission.submitted_at),
                submission.line_id or '',
                submission.ppid or '',
                submission.eqpid or '',
                submission.change_request_items or '',
                submission.Max_TAT if submission.Max_TAT is not None else '',
                submission.status or '',
                submission.assignee_internal or '',
                submission.assignee or '',
                submission.appr_id or '',
                submission.status_knox or '',
                submission.comment_assign or '',
                submission.comment_reject or '',
                submission.comment_approve or '',
                format_datetime_kst(submission.assigned_at),
                submission.assigned_by or '',
                format_datetime_kst(submission.rejected_at),
                submission.rejected_by or '',
                format_datetime_kst(submission.approved_at),
                submission.approved_by or '',
                format_datetime_kst(submission.internal_approved_at),
                format_datetime_kst(submission.created_at),
                format_datetime_kst(submission.updated_at),
            ]
            writer.writerow(row)

        return response

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
