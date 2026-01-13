"""
커스텀 권한 클래스
"""
from rest_framework.permissions import BasePermission
import logging

logger = logging.getLogger(__name__)


class IsManager(BasePermission):
    """
    MANAGER 권한을 가진 사용자만 접근 허용

    사용 방법:
        @permission_classes([IsManager])
        def my_view(request):
            ...
    """
    message = "MANAGER 권한이 필요합니다."

    def has_permission(self, request, view):
        # 인증되지 않은 사용자 거부
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"Unauthenticated access attempt to {view.__class__.__name__}")
            return False

        # auth 속성 확인 (사용자 모델에 auth 필드가 있다고 가정)
        user_auth = getattr(request.user, 'auth', None)

        if user_auth != 'MANAGER':
            logger.warning(
                f"Non-MANAGER access attempt: user={request.user}, auth={user_auth}, "
                f"view={view.__class__.__name__}"
            )
            return False

        return True


class IsManagerOrReadOnly(BasePermission):
    """
    MANAGER 권한: 모든 작업 허용
    일반 사용자: 읽기(GET, HEAD, OPTIONS)만 허용
    """
    message = "수정 권한이 없습니다. MANAGER 권한이 필요합니다."

    def has_permission(self, request, view):
        # 읽기 요청은 모든 인증된 사용자 허용
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return request.user and request.user.is_authenticated

        # 쓰기 요청은 MANAGER만 허용
        if not request.user or not request.user.is_authenticated:
            return False

        user_auth = getattr(request.user, 'auth', None)
        return user_auth == 'MANAGER'
