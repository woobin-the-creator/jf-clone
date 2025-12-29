from django.urls import path
from . import views

urlpatterns = [
    # 의뢰 상신 목록 조회/생성
    path('request-submissions', views.request_submission_view, name='request-submissions'),

    # 의뢰 상신 CSV 내보내기 (DB 전체)
    path('request-submissions/export-csv', views.export_request_submissions_csv, name='export-request-submissions-csv'),
]
