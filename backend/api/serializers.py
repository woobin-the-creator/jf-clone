from rest_framework import serializers
from .models import Calendar, RequestSubmission, AssigneeMember, Employee, Fab_Info, Fab_Info_Rule, Fab_Info_Filtered
from .fab_info_utils import validate_input


class CalendarSerializer(serializers.ModelSerializer):
    """임직원 정보 Serializer"""
    class Meta:
        model = Calendar
        fields = ['name', 'employee_number', 'part', 'knox_id']


class EmployeeSerializer(serializers.ModelSerializer):
    """임직원 정보 Serializer (Employee 테이블 → Calendar 형식으로 변환)"""
    name = serializers.CharField(source='username')
    part = serializers.CharField(source='deptname_knox')
    knox_id = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = ['name', 'employee_number', 'part', 'knox_id']

    def get_knox_id(self, obj):
        """mail_knox에서 @ 이후 도메인을 제거하고 ID만 반환"""
        if obj.mail_knox:
            return obj.mail_knox.split('@')[0]
        return ''


class RequestSubmissionSerializer(serializers.ModelSerializer):
    """의뢰 상신 Serializer (전체 필드 포함)"""
    class Meta:
        model = RequestSubmission
        fields = '__all__'


class RequestSubmissionLightSerializer(serializers.ModelSerializer):
    """의뢰 상신 경량 Serializer (Binary 및 큰 TextField 제외로 성능 최적화)"""
    class Meta:
        model = RequestSubmission
        exclude = [
            'excel_1', 'excel_2',           # Binary 필드
            'content',                       # TextField (큰 데이터)
            'comment_assign',                # TextField
            'comment_reject',                # TextField
            'comment_approve',               # TextField
            'change_request_items',          # TextField
        ]


class AssigneeMemberSerializer(serializers.ModelSerializer):
    """담당자 멤버 Serializer"""
    class Meta:
        model = AssigneeMember
        fields = ['id', 'knox_id', 'name', 'employee_number', 'created_at']
        read_only_fields = ['id', 'created_at']


class AssigneeMemberBulkSerializer(serializers.Serializer):
    """담당자 멤버 일괄 저장용 Serializer"""
    members = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        ),
        allow_empty=True
    )

    def validate_members(self, value):
        """멤버 데이터 유효성 검증"""
        required_fields = ['knox_id', 'name', 'employee_number']
        for member in value:
            for field in required_fields:
                if field not in member:
                    raise serializers.ValidationError(
                        f"각 멤버에는 {required_fields} 필드가 필요합니다."
                    )
        return value


class Fab_Info_Serializer(serializers.ModelSerializer):
    """Fab_Info 원본 데이터 Serializer"""
    class Meta:
        model = Fab_Info
        fields = ['id', 'ppid_8', 'ees_line_id', 'mes_line_id', 'eqp_id', 'proc_model_name']


class Fab_Info_Filtered_Serializer(serializers.ModelSerializer):
    """Fab_Info 가공 데이터 Serializer"""
    class Meta:
        model = Fab_Info_Filtered
        fields = ['id', 'ppid_8', 'ees_line_id', 'mes_line_id', 'eqp_id', 'proc_model_name']


class Fab_Info_Rule_Serializer(serializers.ModelSerializer):
    """Fab_Info 규칙 Serializer"""
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = Fab_Info_Rule
        fields = ['id', 'target_value', 'action', 'action_display', 'new_value', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_target_value(self, value):
        """target_value SQL 인젝션 검사 (E1)"""
        try:
            return validate_input(value)
        except ValueError as e:
            raise serializers.ValidationError(str(e))

    def validate_new_value(self, value):
        """new_value SQL 인젝션 검사 (E1)"""
        if value:
            try:
                return validate_input(value)
            except ValueError as e:
                raise serializers.ValidationError(str(e))
        return value

    def validate(self, data):
        """전체 데이터 유효성 검증"""
        action = data.get('action')
        new_value = data.get('new_value')
        target_value = data.get('target_value')

        # A4: 변경 액션인데 new_value가 없으면 에러 (프론트 버튼 비활성화와 별개로 백엔드에서도 검증)
        if action == 'replace' and not new_value:
            raise serializers.ValidationError({
                'new_value': '변경 액션의 경우 새 값을 입력해야 합니다.'
            })

        # A7: target_value와 new_value가 같으면 에러
        if action == 'replace' and target_value == new_value:
            raise serializers.ValidationError({
                'new_value': '변경 전 값과 변경 후 값이 동일합니다.'
            })

        return data
