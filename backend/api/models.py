from django.db import models


class Calendar(models.Model):
    """
    임직원 정보 테이블 (기존 테이블)
    """
    name = models.CharField(max_length=100, verbose_name='이름')
    employee_number = models.CharField(max_length=50, verbose_name='사번')
    part = models.CharField(max_length=100, verbose_name='부서')
    knox_id = models.CharField(max_length=50, verbose_name='Knox ID')

    class Meta:
        db_table = 'calendar'
        verbose_name = '임직원'
        verbose_name_plural = '임직원 목록'

    def __str__(self):
        return f"{self.name} ({self.employee_number})"


class RequestSubmission(models.Model):
    """
    의뢰 상신 테이블 (기존 테이블)
    """
    part = models.CharField(max_length=100, blank=True, null=True, verbose_name='부서')
    title = models.CharField(max_length=500, blank=True, null=True, verbose_name='의뢰 제목')
    content = models.TextField(blank=True, null=True, verbose_name='내용')
    submitted_by = models.CharField(max_length=100, blank=True, null=True, verbose_name='상신자')
    mail_knox = models.CharField(max_length=200, blank=True, null=True, verbose_name='상신자 메일')
    submitted_at = models.DateTimeField(blank=True, null=True, verbose_name='상신 시간')
    line_id = models.CharField(max_length=100, blank=True, null=True, verbose_name='Line ID')
    ppid = models.CharField(max_length=100, blank=True, null=True, verbose_name='PPID')
    eqpid = models.CharField(max_length=100, blank=True, null=True, verbose_name='EQPID')
    change_request_items = models.TextField(blank=True, null=True, verbose_name='변경의뢰 항목')
    Max_TAT = models.IntegerField(blank=True, null=True, verbose_name='Max TAT')
    status = models.CharField(max_length=50, blank=True, null=True, verbose_name='상태')
    assignee_internal = models.CharField(max_length=200, blank=True, null=True, verbose_name='내부결재담당자')
    assignee = models.CharField(max_length=500, blank=True, null=True, verbose_name='담당자')
    appr_id = models.CharField(max_length=100, blank=True, null=True, verbose_name='결재고유번호')
    status_knox = models.CharField(max_length=50, blank=True, null=True, verbose_name='결재상태')
    comment_assign = models.TextField(blank=True, null=True, verbose_name='코멘트(담당자배정)')
    comment_reject = models.TextField(blank=True, null=True, verbose_name='코멘트(반려)')
    comment_approve = models.TextField(blank=True, null=True, verbose_name='코멘트(승인)')
    assigned_at = models.DateTimeField(blank=True, null=True, verbose_name='배정 시간')
    assigned_by = models.CharField(max_length=100, blank=True, null=True, verbose_name='실제 배정자')
    rejected_at = models.DateTimeField(blank=True, null=True, verbose_name='반려 시간')
    rejected_by = models.CharField(max_length=100, blank=True, null=True, verbose_name='실제 반려자')
    approved_at = models.DateTimeField(blank=True, null=True, verbose_name='작성완료 시간')
    approved_by = models.CharField(max_length=100, blank=True, null=True, verbose_name='실제 승인자')
    internal_approved_at = models.DateTimeField(blank=True, null=True, verbose_name='내부 완결 시간')
    excel_1 = models.BinaryField(blank=True, null=True, verbose_name='엑셀1')
    excel_2 = models.BinaryField(blank=True, null=True, verbose_name='엑셀2')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성 시간')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정 시간')

    class Meta:
        db_table = 'request_submission'
        verbose_name = '의뢰 상신'
        verbose_name_plural = '의뢰 상신 목록'

    def __str__(self):
        return f"{self.title} - {self.submitted_by}"


class AssigneeMember(models.Model):
    """
    담당자 멤버 테이블 (신규)
    SelectAssignee 드롭다운에 표시될 담당자 목록을 관리합니다.
    """
    knox_id = models.CharField(max_length=50, unique=True, verbose_name='Knox ID')
    name = models.CharField(max_length=100, verbose_name='이름')
    employee_number = models.CharField(max_length=50, verbose_name='사번')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='추가 시간')

    class Meta:
        db_table = 'assignee_member'
        verbose_name = '담당자 멤버'
        verbose_name_plural = '담당자 멤버 목록'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.employee_number})"


class FabInfo(models.Model):
    """
    Fab 정보 원본 테이블
    bdq_handler.py에서 1시간 단위로 업데이트됩니다.
    """
    ppid_8 = models.CharField(max_length=100, blank=True, null=True, verbose_name='PPID_8')
    ees_line_id = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name='EES Line ID')
    mes_line_id = models.CharField(max_length=100, blank=True, null=True, verbose_name='MES Line ID')
    eqp_id = models.CharField(max_length=100, blank=True, null=True, verbose_name='Equipment ID')
    proc_model_name = models.CharField(max_length=100, blank=True, null=True, verbose_name='Process Model Name')

    class Meta:
        db_table = 'fab_info'
        verbose_name = 'Fab 정보'
        verbose_name_plural = 'Fab 정보 목록'

    def __str__(self):
        return f"{self.ees_line_id} - {self.eqp_id}"


class FabInfoRule(models.Model):
    """
    Fab Info 규칙 테이블
    ees_line_id 값을 변경하거나 삭제하는 규칙을 저장합니다.
    """
    ACTION_CHOICES = [
        ('replace', '변경'),
        ('delete', '삭제'),
    ]

    target_value = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name='대상 값',
        help_text='변경/삭제할 ees_line_id 값'
    )
    action = models.CharField(
        max_length=10,
        choices=ACTION_CHOICES,
        verbose_name='액션',
        help_text='변경 또는 삭제'
    )
    new_value = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='새 값',
        help_text='변경 시 새로운 값 (삭제 시 null)'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성 시간')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정 시간')

    class Meta:
        db_table = 'fab_info_rule'
        verbose_name = 'Fab Info 규칙'
        verbose_name_plural = 'Fab Info 규칙 목록'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['target_value'],
                name='unique_fab_info_rule_target_value'
            )
        ]

    def __str__(self):
        if self.action == 'replace':
            return f"{self.target_value} → {self.new_value}"
        return f"{self.target_value} (삭제)"


class FabInfoFiltered(models.Model):
    """
    Fab 정보 가공 테이블
    FabInfoRule 규칙이 적용된 데이터가 저장됩니다.
    """
    ppid_8 = models.CharField(max_length=100, blank=True, null=True, verbose_name='PPID_8')
    ees_line_id = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name='EES Line ID')
    mes_line_id = models.CharField(max_length=100, blank=True, null=True, verbose_name='MES Line ID')
    eqp_id = models.CharField(max_length=100, blank=True, null=True, verbose_name='Equipment ID')
    proc_model_name = models.CharField(max_length=100, blank=True, null=True, verbose_name='Process Model Name')

    class Meta:
        db_table = 'fab_info_filtered'
        verbose_name = 'Fab 정보 (가공)'
        verbose_name_plural = 'Fab 정보 (가공) 목록'

    def __str__(self):
        return f"{self.ees_line_id} - {self.eqp_id}"
