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
]
