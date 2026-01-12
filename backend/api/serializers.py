from rest_framework import serializers
from .models import Calendar, RequestSubmission, AssigneeMember


class CalendarSerializer(serializers.ModelSerializer):
    """임직원 정보 Serializer"""
    class Meta:
        model = Calendar
        fields = ['name', 'employee_number', 'part', 'knox_id']


class RequestSubmissionSerializer(serializers.ModelSerializer):
    """의뢰 상신 Serializer"""
    class Meta:
        model = RequestSubmission
        fields = '__all__'


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
