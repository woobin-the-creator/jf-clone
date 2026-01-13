from django.urls import path
from . import views

urlpatterns = [
    # 의뢰 상신 목록 조회/생성
    path('request-submissions', views.request_submission_view, name='request-submissions'),

    # 의뢰 상신 CSV 내보내기 (DB 전체)
    path('request-submissions/export-csv', views.export_request_submissions_csv, name='export-request-submissions-csv'),

    # 임직원 목록 조회 (Calendar 테이블)
    path('calendar', views.calendar_list_view, name='calendar-list'),

    # 담당자 멤버 관리
    path('assignee-members', views.assignee_member_view, name='assignee-members'),
    path('assignee-members/<str:knox_id>', views.assignee_member_delete_view, name='assignee-member-delete'),

    # Fab Info 원본 데이터
    path('fab-info', views.fab_info_view, name='fab-info'),
    path('fab-info/ees-line-ids', views.fab_info_ees_line_ids_view, name='fab-info-ees-line-ids'),

    # Fab Info 가공 데이터
    path('fab-info-filtered', views.fab_info_filtered_view, name='fab-info-filtered'),

    # Fab Info 규칙 관리
    path('fab-info-rules', views.fab_info_rules_view, name='fab-info-rules'),
    path('fab-info-rules/<int:rule_id>', views.fab_info_rule_detail_view, name='fab-info-rule-detail'),
]
