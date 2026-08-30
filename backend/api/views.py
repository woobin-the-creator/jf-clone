import csv
import logging
from datetime import datetime, timedelta
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .permissions import IsManager, IsManagerOrReadOnly

logger = logging.getLogger(__name__)

# KST (GMT+9) 변환을 위한 시간차
KST_OFFSET = timedelta(hours=9)


def format_datetime_kst(dt):
    """GMT datetime을 KST로 변환하여 문자열로 반환"""
    if not dt:
        return ''
    kst_dt = dt + KST_OFFSET
    return kst_dt.strftime('%Y-%m-%d %H:%M:%S')

from django.utils import timezone
from .models import RequestSubmission, Calendar, AssigneeMember, Employee, Fab_Info, Fab_Info_Rule, Fab_Info_Filtered, ActiveUser
from .serializers import (
    RequestSubmissionSerializer,
    RequestSubmissionLightSerializer,
    CalendarSerializer,
    EmployeeSerializer,
    AssigneeMemberSerializer,
    AssigneeMemberBulkSerializer,
    Fab_Info_Serializer,
    Fab_Info_Filtered_Serializer,
    Fab_Info_Rule_Serializer
)
from .fab_info_utils import apply_rules, get_unique_ees_line_ids


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

            # Binary 필드(excel_1, excel_2) 제외하여 성능 최적화
            serializer = RequestSubmissionLightSerializer(page_submissions, many=True)

            return Response({
                'results': serializer.data,
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'DELETE', 'PUT', 'PATCH'])
@permission_classes([AllowAny])
def request_submission_detail_view(request, submission_id):
    """
    의뢰 상신 상세 조회 및 업데이트
    GET: 특정 ID의 의뢰 상세 정보 조회 (전체 필드 포함)
    PATCH: 담당자 변경, Max_TAT 업데이트
    DELETE: 의뢰 삭제
    PUT: 의뢰 상태 업데이트 (결재/반려/취소)
    """
    # GET: 상세 조회
    if request.method == 'GET':
        try:
            submission = RequestSubmission.objects.get(id=submission_id)
            # 상세 조회는 전체 필드 포함 (content, comment 등 포함)
            serializer = RequestSubmissionSerializer(submission)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except RequestSubmission.DoesNotExist:
            return Response({'error': '의뢰를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 나머지 메서드들은 인증 필요
    try:
        submission = RequestSubmission.objects.get(id=submission_id)
    except RequestSubmission.DoesNotExist:
        return Response({'error': '해당 의뢰를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

    # 세션 체크 (실제 프로젝트에서는 Employee 모델 사용)
    # employee_id = request.session.get('employee_id')
    # if not employee_id:
    #     return Response({'401_UNAUTHORIZED': '세션이 만료되었습니다.'}, status=status.HTTP_401_UNAUTHORIZED)
    # current_employee = Employee.objects.get(id=employee_id)

    # PATCH: 담당자/Max_TAT 업데이트
    if request.method == 'PATCH':
        try:
            assignee = request.data.get('assignee')
            comment = request.data.get('comment')
            max_tat = request.data.get('Max_TAT')

            # submission.assigned_by = current_employee.username  # 실제 프로젝트에서 활성화

            if assignee is not None:
                submission.comment_assign = comment
                assignee_list = [a.strip() for a in assignee.split(',') if a.strip()]
                if not assignee_list:
                    raise ValueError("최소 1명의 담당자를 지정해주세요.")

                # alarm_mail(title, comment, submitted_at, assignee_list, "assign")  # 실제 프로젝트에서 활성화

            serializer = RequestSubmissionSerializer(submission, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except ValueError as ve:
            return Response({'error': 'Invalid assignee', 'detail': str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # DELETE: 의뢰 삭제
    elif request.method == 'DELETE':
        try:
            # 권한 체크: 본인이 작성한 의뢰만 삭제 가능
            # if submission.submitted_by != current_employee.username:  # 실제 프로젝트에서 활성화
            #     return Response({'error': '본인이 작성한 의뢰만 삭제할 수 있습니다.'}, status=status.HTTP_403_FORBIDDEN)

            if submission.status == '내부결재대기중':
                # appr_id = submission.appr_id
                # comment = request.data.get('comment')
                # cancel_approval(appr_id, comment)  # 실제 프로젝트에서 활성화
                pass

            submission.delete()
            return Response({'message': '의뢰가 삭제되었습니다.'}, status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # PUT: 상태 업데이트 (결재/반려/취소)
    elif request.method == 'PUT':
        try:
            action = request.data.get('action', 'approve')
            comment = request.data.get('comment')

            title = submission.title
            submitted_at = submission.submitted_at
            recipient = submission.mail_knox

            if action == 'approve':
                submission.status = '작성완료'
                submission.comment_approve = comment
                # submission.approved_by = current_employee.username  # 실제 프로젝트에서 활성화
                # alarm_mail(title, comment, submitted_at, recipient, "approve")  # 실제 프로젝트에서 활성화

            elif action == 'reject':
                submission.status = '반려'
                submission.comment_reject = comment
                # submission.rejected_by = current_employee.username  # 실제 프로젝트에서 활성화
                # alarm_mail(title, comment, submitted_at, recipient, "reject")  # 실제 프로젝트에서 활성화

            elif action == 'cancel':
                # 권한 체크
                # if submission.submitted_by != current_employee.username:  # 실제 프로젝트에서 활성화
                #     return Response({'error': '본인이 작성한 의뢰만 취소할 수 있습니다.'}, status=status.HTTP_403_FORBIDDEN)

                if submission.status != '내부결재대기중':
                    return Response({'error': '내부결재대기중 상태에서만 취소할 수 있습니다.'}, status=status.HTTP_400_BAD_REQUEST)

                # appr_id = submission.appr_id
                # cancel_approval(appr_id, comment)  # 실제 프로젝트에서 활성화

                submission.status = '상신취소'
                submission.comment_cancel = comment

            else:
                return Response({'error': '유효하지 않은 액션입니다.'}, status=status.HTTP_400_BAD_REQUEST)

            submission.save()
            serializer = RequestSubmissionSerializer(submission)
            return Response(serializer.data, status=status.HTTP_200_OK)

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


@api_view(['GET'])
@permission_classes([AllowAny])
def calendar_list_view(request):
    """
    calendar 테이블의 모든 데이터를 조회합니다.
    GET /api/calendar

    Query Parameters:
    - search: 이름으로 검색 (선택)
    """
    if request.method == 'GET':
        try:
            queryset = Calendar.objects.all()

            # 검색 파라미터가 있으면 이름으로 필터링
            search = request.GET.get('search', '').strip()
            if search:
                queryset = queryset.filter(name__icontains=search)

            serializer = CalendarSerializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def employee_list_view(request):
    """
    employee 테이블의 모든 직원 정보를 반환합니다.
    GET /api/employees
    """
    try:
        employees = Employee.objects.all()
        serializer = EmployeeSerializer(employees, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([AllowAny])
def assignee_member_view(request):
    """
    담당자 멤버 목록 관리
    GET: 멤버 목록 조회
    POST: 멤버 추가 (단일)
    PUT: 멤버 목록 일괄 동기화 (기존 데이터 삭제 후 새 데이터로 교체)
    """
    if request.method == 'GET':
        try:
            members = AssigneeMember.objects.all().order_by('name')
            serializer = AssigneeMemberSerializer(members, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    elif request.method == 'POST':
        try:
            serializer = AssigneeMemberSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    elif request.method == 'PUT':
        # 일괄 동기화: 기존 멤버 전체 삭제 후 새 멤버 목록으로 교체
        try:
            bulk_serializer = AssigneeMemberBulkSerializer(data=request.data)
            if not bulk_serializer.is_valid():
                return Response(bulk_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            members_data = bulk_serializer.validated_data['members']

            # 트랜잭션으로 처리: 기존 데이터 삭제 후 새 데이터 삽입
            from django.db import transaction
            with transaction.atomic():
                AssigneeMember.objects.all().delete()

                for member_data in members_data:
                    AssigneeMember.objects.create(
                        knox_id=member_data['knox_id'],
                        name=member_data['name'],
                        employee_number=member_data['employee_number']
                    )

            # 새로 저장된 목록 반환
            members = AssigneeMember.objects.all().order_by('name')
            serializer = AssigneeMemberSerializer(members, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([AllowAny])
def assignee_member_delete_view(request, knox_id):
    """
    담당자 멤버 삭제
    DELETE /api/assignee-members/<knox_id>
    """
    try:
        member = AssigneeMember.objects.get(knox_id=knox_id)
        member.delete()
        return Response({'message': '삭제되었습니다.'}, status=status.HTTP_200_OK)
    except AssigneeMember.DoesNotExist:
        return Response({'error': '멤버를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Fab Info 관련 Views
# ============================================================================

def _handle_error(e, context=""):
    """내부 에러 로깅 및 안전한 응답 생성"""
    logger.error(f"[{context}] Internal error: {str(e)}", exc_info=True)
    return Response(
        {'error': '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )


@api_view(['GET'])
@permission_classes([IsManager])
def fab_info_view(request):
    """
    Fab Info 원본 데이터 조회
    GET /api/fab-info

    권한: MANAGER만 접근 가능

    Query Parameters:
    - page: 페이지 번호 (기본값: 1)
    - page_size: 페이지 크기 (기본값: 100)
    - ees_line_id: ees_line_id 필터
    - ppid_8: ppid_8 필터
    - mes_line_id: mes_line_id 필터
    - eqp_id: eqp_id 필터
    - proc_model_name: proc_model_name 필터
    """
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 100))

        queryset = Fab_Info.objects.all()

        # 필터 적용
        for field in ['ees_line_id', 'ppid_8', 'mes_line_id', 'eqp_id', 'proc_model_name']:
            value = request.GET.get(field, '').strip()
            if value:
                queryset = queryset.filter(**{f'{field}__icontains': value})

        # 페이지네이션
        total_count = queryset.count()
        start_index = (page - 1) * page_size
        end_index = start_index + page_size

        page_data = queryset[start_index:end_index]
        serializer = Fab_Info_Serializer(page_data, many=True)

        return Response({
            'results': serializer.data,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0
        })

    except Exception as e:
        return _handle_error(e, "fab_info_view")


@api_view(['GET'])
@permission_classes([IsManager])
def fab_info_all_view(request):
    """
    Fab Info 원본 데이터 전체 조회 (페이지네이션)
    GET /api/fab-info-all

    권한: MANAGER만 접근 가능

    Query Parameters:
    - page: 페이지 번호 (기본값: 1)
    - page_size: 페이지 크기 (기본값: 100)
    - ees_line_id: ees_line_id 필터
    - ppid_8: ppid_8 필터
    - mes_line_id: mes_line_id 필터
    - eqp_id: eqp_id 필터
    - proc_model_name: proc_model_name 필터
    """
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 100))

        queryset = Fab_Info.objects.all()

        # 필터 적용
        for field in ['ees_line_id', 'ppid_8', 'mes_line_id', 'eqp_id', 'proc_model_name']:
            value = request.GET.get(field, '').strip()
            if value:
                queryset = queryset.filter(**{f'{field}__icontains': value})

        # 페이지네이션
        total_count = queryset.count()
        start_index = (page - 1) * page_size
        end_index = start_index + page_size

        page_data = queryset[start_index:end_index]
        serializer = Fab_Info_Serializer(page_data, many=True)

        return Response({
            'results': serializer.data,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0
        })

    except Exception as e:
        return _handle_error(e, "fab_info_all_view")


@api_view(['GET'])
@permission_classes([IsManager])
def fab_info_ees_line_ids_view(request):
    """
    Fab Info 테이블에서 중복 제거된 ees_line_id 목록 조회
    GET /api/fab-info/ees-line-ids

    권한: MANAGER만 접근 가능
    """
    try:
        ees_line_ids = get_unique_ees_line_ids()
        return Response({'ees_line_ids': ees_line_ids})
    except Exception as e:
        return _handle_error(e, "fab_info_ees_line_ids_view")


@api_view(['GET'])
@permission_classes([IsManager])
def fab_info_filtered_view(request):
    """
    Fab Info 가공 데이터 조회
    GET /api/fab-info-filtered

    권한: MANAGER만 접근 가능

    Query Parameters:
    - page: 페이지 번호 (기본값: 1)
    - page_size: 페이지 크기 (기본값: 100)
    - ees_line_id: ees_line_id 필터
    - ppid_8: ppid_8 필터
    - mes_line_id: mes_line_id 필터
    - eqp_id: eqp_id 필터
    - proc_model_name: proc_model_name 필터
    """
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 100))

        queryset = Fab_Info_Filtered.objects.all()

        # 필터 적용
        for field in ['ees_line_id', 'ppid_8', 'mes_line_id', 'eqp_id', 'proc_model_name']:
            value = request.GET.get(field, '').strip()
            if value:
                queryset = queryset.filter(**{f'{field}__icontains': value})

        # 페이지네이션
        total_count = queryset.count()
        start_index = (page - 1) * page_size
        end_index = start_index + page_size

        page_data = queryset[start_index:end_index]
        serializer = Fab_Info_Filtered_Serializer(page_data, many=True)

        return Response({
            'results': serializer.data,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size if total_count > 0 else 0
        })

    except Exception as e:
        return _handle_error(e, "fab_info_filtered_view")


@api_view(['GET', 'POST'])
@permission_classes([IsManager])
def fab_info_rules_view(request):
    """
    Fab Info 규칙 목록 조회 및 생성
    GET: 규칙 목록 조회
    POST: 규칙 생성 (생성 후 자동으로 apply_rules 실행 - C2)

    권한: MANAGER만 접근 가능
    """
    if request.method == 'GET':
        try:
            rules = Fab_Info_Rule.objects.all().order_by('-created_at')
            serializer = Fab_Info_Rule_Serializer(rules, many=True)
            return Response(serializer.data)
        except Exception as e:
            return _handle_error(e, "fab_info_rules_view:GET")

    elif request.method == 'POST':
        try:
            serializer = Fab_Info_Rule_Serializer(data=request.data)
            if serializer.is_valid():
                serializer.save()

                # C2: 규칙 생성 후 자동으로 apply_rules 실행
                apply_result = apply_rules()

                logger.info(f"Rule created: {serializer.data}, apply_result: {apply_result}")

                return Response({
                    'rule': serializer.data,
                    'apply_result': apply_result
                }, status=status.HTTP_201_CREATED)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return _handle_error(e, "fab_info_rules_view:POST")


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsManager])
def fab_info_rule_detail_view(request, rule_id):
    """
    Fab Info 규칙 상세 조회/수정/삭제
    GET: 규칙 상세 조회
    PUT: 규칙 수정 (수정 후 자동으로 apply_rules 실행 - C2)
    DELETE: 규칙 삭제 (삭제 후 자동으로 apply_rules 실행 - C2)

    권한: MANAGER만 접근 가능
    """
    try:
        rule = Fab_Info_Rule.objects.get(id=rule_id)
    except Fab_Info_Rule.DoesNotExist:
        return Response({'error': '규칙을 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = Fab_Info_Rule_Serializer(rule)
        return Response(serializer.data)

    elif request.method == 'PUT':
        try:
            serializer = Fab_Info_Rule_Serializer(rule, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()

                # C2: 규칙 수정 후 자동으로 apply_rules 실행
                apply_result = apply_rules()

                logger.info(f"Rule updated: {serializer.data}, apply_result: {apply_result}")

                return Response({
                    'rule': serializer.data,
                    'apply_result': apply_result
                })

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return _handle_error(e, "fab_info_rule_detail_view:PUT")

    elif request.method == 'DELETE':
        try:
            rule_info = str(rule)
            rule.delete()

            # C2: 규칙 삭제 후 자동으로 apply_rules 실행
            apply_result = apply_rules()

            logger.info(f"Rule deleted: {rule_info}, apply_result: {apply_result}")

            return Response({
                'message': '규칙이 삭제되었습니다.',
                'apply_result': apply_result
            })
        except Exception as e:
            return _handle_error(e, "fab_info_rule_detail_view:DELETE")


# ============================================================================
# 동시 접속자 (Active Users) 관련 Views
# ============================================================================

ACTIVE_TIMEOUT_MINUTES = 5  # 5분 동안 활동이 없으면 비활성으로 간주


@api_view(['POST'])
@permission_classes([AllowAny])
def heartbeat_view(request):
    """
    사용자 활동 상태 업데이트 (Heartbeat)
    POST /api/heartbeat

    클라이언트에서 주기적으로 호출하여 사용자 활동 상태를 기록합니다.

    Request Body:
    - user_id: 사용자 ID (필수)
    - username: 사용자명 (선택)

    Response:
    - active_users: 현재 활성 사용자 수
    - timestamp: 서버 시간
    """
    try:
        user_id = request.data.get('user_id')
        username = request.data.get('username', 'Unknown')

        if not user_id:
            return Response(
                {'error': 'user_id는 필수입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 사용자 활동 기록 upsert (update or create)
        ActiveUser.objects.update_or_create(
            user_id=user_id,
            defaults={'username': username}
        )

        # 오래된 비활성 사용자 정리
        cutoff_time = timezone.now() - timedelta(minutes=ACTIVE_TIMEOUT_MINUTES)
        ActiveUser.objects.filter(last_activity__lt=cutoff_time).delete()

        # 현재 활성 사용자 수 반환
        active_count = ActiveUser.objects.count()

        return Response({
            'active_users': active_count,
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        logger.error(f"heartbeat_view error: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def active_users_view(request):
    """
    현재 동시 접속자 수 조회
    GET /api/active-users

    Response:
    - active_users: 현재 활성 사용자 수
    - timestamp: 서버 시간
    """
    try:
        # 오래된 비활성 사용자 정리 후 카운트
        cutoff_time = timezone.now() - timedelta(minutes=ACTIVE_TIMEOUT_MINUTES)
        ActiveUser.objects.filter(last_activity__lt=cutoff_time).delete()

        active_count = ActiveUser.objects.count()

        return Response({
            'active_users': active_count,
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        logger.error(f"active_users_view error: {str(e)}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
