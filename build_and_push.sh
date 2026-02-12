#!/bin/bash
set -euo pipefail

# == 설정 불러오기 ==
if [[ ! -f .env ]]; then
  echo "❌ .env 파일이 없습니다. 먼저 .env를 생성하세요."
  exit 1
fi
set -a; source ./.env; set +a

# 현재 브랜치 확인
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# 브랜치에 따라 자동으로 환경 결정
if [[ "$BRANCH" == "main" ]]; then
  ENV="prod"
  ENV_NAME="운영"
  COMPOSE_FILE="docker-compose.prod.yml"
  NGINX_PORT="${PROD_NGINX_PORT}"
else
  ENV="dev"
  ENV_NAME="개발"
  COMPOSE_FILE="docker-compose.dev.yml"
  NGINX_PORT="${DEV_NGINX_PORT}"
fi

# REGISTRY_URL 정규화
REG="${REGISTRY_URL#http://}"
REG="${REG#https://}"
REG="${REG%/}"

# 불변 태그용
SHA="$(git rev-parse --short HEAD)"
TS="$(date +%Y%m%d-%H%M%S)"

# 옵션
DRY_RUN="${DRY_RUN:-false}"
DEPLOY_AFTER_PUSH="${DEPLOY_AFTER_PUSH:-false}"
ROLLBACK="${ROLLBACK:-false}"
ROLLBACK_TO_SHA="${ROLLBACK_TO_SHA:-}"
ROLLBACK_MAX_DISPLAY="${ROLLBACK_MAX_DISPLAY:-10}"

# 이미지 정리 설정
MAX_IMAGES_PER_REPO="${MAX_IMAGES_PER_REPO:-5}"  # 리포지토리+환경별 유지할 최대 이미지 수

# == 유틸 함수 ==
msg() { echo -e "\n==> $*"; }

# CI 환경 감지 함수
is_ci_environment() {
  # CI 환경변수가 true이거나, SKIP_CONFIRM이 true이거나, GitHub Actions 환경인 경우
  [[ "${CI:-false}" == "true" ]] || \
  [[ "${SKIP_CONFIRM:-false}" == "true" ]] || \
  [[ -n "${GITHUB_ACTIONS:-}" ]]
}

# 사용자 확인 함수 (CI 환경에서는 자동 진행)
confirm_proceed() {
  local message="$1"

  if is_ci_environment; then
    echo "🤖 CI 환경 감지 - 자동 진행"
    return 0
  fi

  read -p "$message (Y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 취소되었습니다."
    exit 1
  fi
}

check_registry() {
  msg "레지스트리 핑: http://$REG/v2/"
  if ! curl -s "http://$REG/v2/" | grep -q "{}"; then
    echo "⚠️  레지스트리 응답이 비정상일 수 있습니다."
  else
    echo "✅ 레지스트리 OK"
  fi
}

build_push() {
  local name="$1"
  local dockerfile="$2"
  local context="${3:-.}"

  # Nginx는 ARG로 환경 전달
  local build_args=""
  if [[ "$name" == "jfpage_nginx" ]]; then
    build_args="--build-arg ENV=${ENV}"
  fi

  msg "🔨 Build $name ($ENV environment)"
  echo "docker build $build_args -t $REG/${name}:${ENV} -t $REG/${name}:${ENV}-${SHA} -f $dockerfile $context"

  if [[ "$DRY_RUN" != "true" ]]; then
    docker build $build_args \
                 -t "$REG/${name}:${ENV}" \
                 -t "$REG/${name}:${ENV}-${SHA}" \
                 -f "$dockerfile" "$context"
  fi

  msg "📤 Push $name (:${ENV}, :${ENV}-$SHA)"
  if [[ "$DRY_RUN" != "true" ]]; then
    docker push "$REG/${name}:${ENV}"
    docker push "$REG/${name}:${ENV}-${SHA}"
  fi
}

# == 롤백 관련 함수 ==

# 레지스트리에서 특정 환경의 이미지 목록 조회 (재시도 로직 포함)
query_registry_with_retry() {
  local url="$1"
  local max_retries=3
  local retry_delay=2

  for ((i=1; i<=max_retries; i++)); do
    local response=$(curl -s -f "$url" 2>&1 || echo "")

    if [[ -n "$response" ]] && echo "$response" | grep -q -E '(tags|repositories)'; then
      echo "$response"
      return 0
    fi

    if [[ $i -lt $max_retries ]]; then
      echo "⚠️  레지스트리 요청 실패, 재시도... ($i/$max_retries)" >&2
      sleep $retry_delay
      retry_delay=$((retry_delay * 2))  # 지수 백오프
    fi
  done

  echo "❌ 레지스트리 요청이 $max_retries 번 실패했습니다." >&2
  return 1
}

# 특정 환경의 SHA 태그된 이미지 목록 조회
list_registry_images_for_env() {
  local env="$1"
  local service="jfpage_backend"  # 대표 서비스로 조회

  local tags_url="http://$REG/v2/$service/tags/list"
  local response=$(query_registry_with_retry "$tags_url" || echo "")

  if [[ -z "$response" ]]; then
    return 1
  fi

  # ${env}-{SHA} 패턴의 태그만 추출 (예: prod-abc1234, dev-abc1234)
  echo "$response" | tr -d '\n\r\t ' | \
    sed 's/.*"tags":\[\([^]]*\)\].*/\1/' | \
    tr ',' '\n' | \
    tr -d '"' | \
    grep "^${env}-[a-f0-9]\{7,\}$" || true
}

# 이미지 생성 시간 조회
get_image_created_time() {
  local service="$1"
  local tag="$2"

  # 매니페스트 조회
  local manifest_url="http://$REG/v2/$service/manifests/$tag"
  local manifest=$(curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
                       "$manifest_url" 2>/dev/null | tr -d '\n\r\t ' || echo "")

  if [[ -z "$manifest" ]]; then
    echo "unknown"
    return
  fi

  # config digest 추출
  local config_digest=$(echo "$manifest" | sed 's/.*"config":{[^}]*"digest":"\([^"]*\)".*/\1/' || true)

  if [[ ! "$config_digest" =~ ^sha256: ]]; then
    echo "unknown"
    return
  fi

  # config blob에서 생성 시간 추출
  local config_url="http://$REG/v2/$service/blobs/$config_digest"
  local config=$(curl -s "$config_url" 2>/dev/null | tr -d '\n\r\t' || echo "")

  if [[ -z "$config" ]]; then
    echo "unknown"
    return
  fi

  # created 시간 추출
  local created=$(echo "$config" | sed 's/.*"created":"\([^"]*\)".*/\1/' | head -1 || true)

  if [[ -n "$created" ]] && [[ "$created" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
    echo "$created"
  else
    echo "unknown"
  fi
}

# 이미지가 레지스트리에 존재하는지 확인
validate_image_exists_in_registry() {
  local service="$1"
  local tag="$2"

  local manifest_url="http://$REG/v2/$service/manifests/$tag"

  if curl -s -f -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
          "$manifest_url" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# 현재 실행 중인 컨테이너의 SHA 조회
get_current_running_sha() {
  local service="jfpage_backend"
  local env="$ENV"

  # docker-compose ps로 실행 중인 컨테이너 확인
  local container_name="${service}_${env}"

  # 컨테이너 이름 패턴으로 검색 (docker-compose는 프로젝트명_서비스명_숫자 형태)
  local image=$(docker ps --filter "name=${service}" --format "{{.Image}}" 2>/dev/null | head -1 || echo "")

  if [[ -z "$image" ]]; then
    echo "unknown"
    return
  fi

  # 이미지 태그에서 SHA 추출 (예: registry.com/jfpage_backend:dev-abc1234)
  if [[ "$image" =~ ${env}-([a-f0-9]{7,}) ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "unknown"
  fi
}

# 롤백 가능한 이미지 목록 표시 및 선택
display_rollback_menu() {
  local env="$1"
  local current_sha="$2"
  shift 2
  local tags=("$@")

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🕐 이용 가능한 이전 이미지 ($ENV_NAME 환경)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # 태그별 생성 시간 조회 및 정렬
  declare -A tag_times
  local service="jfpage_backend"

  for tag in "${tags[@]}"; do
    local created=$(get_image_created_time "$service" "$tag")
    tag_times["$tag"]="$created"
  done

  # 생성 시간 기준 정렬 (최신순)
  local sorted_tags=($(
    for tag in "${!tag_times[@]}"; do
      echo "${tag_times[$tag]} $tag"
    done | sort -r | awk '{print $2}' | head -${ROLLBACK_MAX_DISPLAY}
  ))

  # 출력 및 SHA 배열 생성
  local index=1
  local sha_array=()

  for tag in "${sorted_tags[@]}"; do
    local sha="${tag#${env}-}"
    local created="${tag_times[$tag]}"
    local marker=""

    if [[ "$sha" == "$current_sha" ]]; then
      marker=" ← 현재 실행 중"
    fi

    # Git 커밋 메시지 조회 (가능한 경우)
    local commit_msg=""
    if git rev-parse --verify "$sha" >/dev/null 2>&1; then
      commit_msg=$(git log --oneline -1 "$sha" 2>/dev/null | cut -d' ' -f2- || echo "")
      if [[ -n "$commit_msg" ]]; then
        commit_msg=" - $commit_msg"
      fi
    fi

    printf " [%2d] %-15s (%s)%s%s\n" "$index" "$tag" "$created" "$marker" "$commit_msg"

    sha_array+=("$sha")
    ((index++))
  done

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # SHA 배열을 전역 변수로 내보내기
  AVAILABLE_SHAS=("${sha_array[@]}")
}

# 사용자 선택 입력 처리
prompt_user_selection() {
  local current_sha="$1"

  while true; do
    echo ""
    read -p "롤백할 이미지 번호를 입력하세요 (1-${#AVAILABLE_SHAS[@]}) 또는 'q' (취소): " selection

    if [[ "$selection" == "q" ]] || [[ "$selection" == "Q" ]]; then
      echo "❌ 롤백이 취소되었습니다."
      exit 0
    fi

    if ! [[ "$selection" =~ ^[0-9]+$ ]]; then
      echo "⚠️  잘못된 입력입니다. 숫자를 입력하세요."
      continue
    fi

    local index=$((selection - 1))
    if [[ $index -lt 0 || $index -ge ${#AVAILABLE_SHAS[@]} ]]; then
      echo "⚠️  범위를 벗어났습니다. 1-${#AVAILABLE_SHAS[@]} 사이의 숫자를 입력하세요."
      continue
    fi

    local selected_sha="${AVAILABLE_SHAS[$index]}"

    if [[ "$selected_sha" == "$current_sha" ]]; then
      echo "⚠️  이미 해당 버전이 실행 중입니다. 다른 버전을 선택하세요."
      continue
    fi

    echo "$selected_sha"
    return 0
  done
}

# 롤백 사전 조건 검증
validate_rollback_prerequisites() {
  local target_sha="$1"

  msg "🔍 롤백 사전 조건 검증"

  # 1. docker-compose 파일 존재 여부
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "❌ ERROR: $COMPOSE_FILE 파일이 없습니다."
    exit 1
  fi
  echo "  ✅ docker-compose 파일 확인: $COMPOSE_FILE"

  # 2. Docker 데몬 실행 여부
  if ! docker info > /dev/null 2>&1; then
    echo "❌ ERROR: Docker 데몬에 접근할 수 없습니다."
    exit 1
  fi
  echo "  ✅ Docker 데몬 연결 확인"

  # 3. 레지스트리 접근 가능 여부
  if ! curl -s -f "http://$REG/v2/" > /dev/null 2>&1; then
    echo "❌ ERROR: 레지스트리에 접근할 수 없습니다: http://$REG"
    exit 1
  fi
  echo "  ✅ 레지스트리 연결 확인: http://$REG"

  # 4. 모든 서비스 이미지 존재 여부
  local services=("jfpage_backend" "jfpage_front" "jfpage_nginx")
  local tag="${ENV}-${target_sha}"

  for service in "${services[@]}"; do
    if ! validate_image_exists_in_registry "$service" "$tag"; then
      echo "❌ ERROR: 레지스트리에서 이미지를 찾을 수 없습니다: $service:$tag"
      echo "   레지스트리 확인: curl http://$REG/v2/$service/tags/list"
      exit 1
    fi
    echo "  ✅ 이미지 존재 확인: $service:$tag"
  done

  echo ""
  echo "✅ 모든 사전 조건이 충족되었습니다."
}

# 롤백 확인 프롬프트
confirm_rollback_action() {
  local current_sha="$1"
  local target_sha="$2"

  # CI 환경에서는 자동 진행
  if is_ci_environment; then
    echo "🤖 CI 환경 - 롤백 자동 진행"
    return 0
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 롤백 확인"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   환경:       $ENV_NAME ($ENV)"
  echo "   현재 SHA:   $current_sha"
  echo "   대상 SHA:   $target_sha"
  echo ""

  # Git 커밋 메시지 표시
  if git rev-parse --verify "$current_sha" >/dev/null 2>&1; then
    local current_msg=$(git log --oneline -1 "$current_sha" 2>/dev/null || echo "N/A")
    echo "   현재 버전: $current_msg"
  fi

  if git rev-parse --verify "$target_sha" >/dev/null 2>&1; then
    local target_msg=$(git log --oneline -1 "$target_sha" 2>/dev/null || echo "N/A")
    echo "   대상 버전: $target_msg"
  fi

  echo ""
  echo "⚠️  경고: 롤백은 데이터베이스 마이그레이션을 되돌리지 않습니다."
  echo "   대상 버전이 현재 DB 스키마와 호환되는지 확인하세요."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  read -p "롤백을 진행하시겠습니까? [y/N]: " confirm
  echo

  if [[ "$confirm" != "y" ]] && [[ "$confirm" != "Y" ]]; then
    echo "❌ 롤백이 취소되었습니다."
    exit 0
  fi
}

# 롤백 실행
execute_rollback() {
  local target_sha="$1"
  local tag="${ENV}-${target_sha}"

  msg "🔄 롤백 실행 중: $tag"

  # 이미지 URL 설정
  export BACKEND_IMAGE="$REG/jfpage_backend:$tag"
  export FRONTEND_IMAGE="$REG/jfpage_front:$tag"
  export NGINX_IMAGE="$REG/jfpage_nginx:$tag"

  echo "   Backend:  $BACKEND_IMAGE"
  echo "   Frontend: $FRONTEND_IMAGE"
  echo "   Nginx:    $NGINX_IMAGE"
  echo ""

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY RUN] 다음 작업을 수행할 예정입니다:"
    echo "[DRY RUN]   1. 이미지 Pull: $BACKEND_IMAGE, $FRONTEND_IMAGE, $NGINX_IMAGE"
    echo "[DRY RUN]   2. 컨테이너 중지: docker-compose -f $COMPOSE_FILE down"
    echo "[DRY RUN]   3. 컨테이너 시작: docker-compose -f $COMPOSE_FILE up -d"
    return 0
  fi

  # 1. 이미지 Pull
  msg "📥 이미지 다운로드 중"
  docker pull "$BACKEND_IMAGE" || { echo "❌ Backend 이미지 Pull 실패"; exit 1; }
  docker pull "$FRONTEND_IMAGE" || { echo "❌ Frontend 이미지 Pull 실패"; exit 1; }
  docker pull "$NGINX_IMAGE" || { echo "❌ Nginx 이미지 Pull 실패"; exit 1; }
  echo "✅ 모든 이미지 다운로드 완료"

  # 2. 기존 컨테이너 중지
  msg "⏸️  기존 컨테이너 중지 중"
  docker compose -f "$COMPOSE_FILE" down || true
  echo "✅ 컨테이너 중지 완료"

  sleep 2

  # 3. 새 컨테이너 시작 (환경변수로 이미지 오버라이드)
  msg "🚀 롤백 버전으로 컨테이너 시작 중"
  docker compose -f "$COMPOSE_FILE" up -d

  # 4. 서비스 시작 대기
  echo ""
  echo "⌛ 서비스 시작 대기 중..."
  sleep 10

  # 5. 컨테이너 상태 확인
  msg "📊 컨테이너 상태 확인"
  docker compose -f "$COMPOSE_FILE" ps

  # 6. 간단한 헬스 체크
  local backend_status=$(docker compose -f "$COMPOSE_FILE" ps -q jfpage_backend 2>/dev/null | \
                         xargs docker inspect -f '{{.State.Status}}' 2>/dev/null || echo "unknown")

  if [[ "$backend_status" == "running" ]]; then
    echo "✅ 롤백 배포 성공!"
  else
    echo "⚠️  컨테이너 상태를 확인하세요 (Status: $backend_status)"
    echo ""
    msg "📋 최근 로그"
    docker compose -f "$COMPOSE_FILE" logs --tail=20
  fi
}

# 롤백 히스토리 기록
log_rollback_history() {
  local from_sha="$1"
  local to_sha="$2"
  local log_file=".rollback_history.log"

  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S%z")
  local user="${USER:-unknown}"
  local ci_marker=""

  if is_ci_environment; then
    ci_marker=" [CI]"
  fi

  local log_entry="${timestamp} | ${ENV} | ${from_sha} → ${to_sha} | ${user}${ci_marker} | success"

  echo "$log_entry" >> "$log_file" 2>/dev/null || true

  echo ""
  echo "📝 롤백 히스토리 기록됨: $log_file"
}

# 롤백 메인 함수
rollback_main() {
  msg "🔄 ROLLBACK MODE"
  echo "환경: $ENV_NAME ($ENV)"
  echo "브랜치: $BRANCH"

  # 레지스트리 연결 확인
  check_registry

  # 1. 현재 실행 중인 SHA 조회
  local current_sha=$(get_current_running_sha)
  echo ""
  echo "현재 실행 중인 버전: ${ENV}-${current_sha}"

  # 2. 대상 SHA 결정
  local target_sha=""

  if [[ -n "$ROLLBACK_TO_SHA" ]]; then
    # 직접 지정된 SHA 사용
    target_sha="$ROLLBACK_TO_SHA"
    echo "지정된 SHA로 롤백: $target_sha"
  else
    # CI 환경에서는 SHA 필수
    if is_ci_environment; then
      echo "❌ ERROR: CI 환경에서는 ROLLBACK_TO_SHA 환경변수가 필수입니다."
      echo "   사용법: ROLLBACK=true ROLLBACK_TO_SHA=abc1234 ./build_and_push.sh"
      exit 1
    fi

    # 인터랙티브 선택
    msg "📋 이용 가능한 이미지 조회 중"
    local available_tags=($(list_registry_images_for_env "$ENV"))

    if [[ ${#available_tags[@]} -eq 0 ]]; then
      echo "❌ 레지스트리에서 롤백 가능한 이미지를 찾을 수 없습니다."
      echo "   레지스트리 확인: curl http://$REG/v2/jfpage_backend/tags/list"
      exit 1
    fi

    echo "✅ ${#available_tags[@]}개의 이미지를 찾았습니다."

    # 메뉴 표시
    display_rollback_menu "$ENV" "$current_sha" "${available_tags[@]}"

    # 사용자 선택
    target_sha=$(prompt_user_selection "$current_sha")
  fi

  echo ""
  echo "선택된 롤백 대상: ${ENV}-${target_sha}"

  # 3. 사전 조건 검증
  validate_rollback_prerequisites "$target_sha"

  # 4. 사용자 확인
  confirm_rollback_action "$current_sha" "$target_sha"

  # 5. 롤백 실행
  execute_rollback "$target_sha"

  # 6. 히스토리 기록
  log_rollback_history "$current_sha" "$target_sha"

  # 완료 메시지
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ 롤백 완료!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   환경:      $ENV_NAME"
  echo "   이전 SHA:  $current_sha"
  echo "   현재 SHA:  $target_sha"
  echo "   접속 URL:  https://localhost:${NGINX_PORT}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "💡 실시간 로그 확인: docker compose -f $COMPOSE_FILE logs -f"
}

# 커밋 기반 이미지 정리 (리포지토리+환경별 최근 N개만 유지)
cleanup_registry() {
  msg "🧹 레지스트리 이미지 정리 (커밋 기반: 리포지토리별 최근 ${MAX_IMAGES_PER_REPO}개 유지)"

  local registry_url="http://$REG"

  # 정리 대상 리포지토리 목록 (jfpage 관련만)
  local target_repos=("jfpage_backend" "jfpage_front" "jfpage_nginx")

  # 정리 대상 환경 (prod, dev)
  local target_envs=("prod" "dev")

  local total_deleted=0
  local total_retained=0

  for repo in "${target_repos[@]}"; do
    # 리포지토리 존재 여부 확인
    local tags_response=$(curl -s "$registry_url/v2/$repo/tags/list" 2>/dev/null || echo "")

    if [[ -z "$tags_response" ]] || echo "$tags_response" | grep -q "NAME_UNKNOWN"; then
      echo "   ℹ️  [$repo] 리포지토리 없음 (건너뜀)"
      continue
    fi

    # 모든 태그 추출
    local all_tags=$(echo "$tags_response" | grep -o '"tags":\[[^]]*\]' | sed 's/"tags":\[//;s/\]//;s/"//g;s/,/ /g' || true)

    if [[ -z "$all_tags" ]] || [[ "$all_tags" == "null" ]]; then
      echo "   ℹ️  [$repo] 태그 없음 (건너뜀)"
      continue
    fi

    echo ""
    echo "   📦 $repo"

    for env in "${target_envs[@]}"; do
      # 해당 환경의 SHA 태그만 필터링 (예: prod-abc1234, dev-def5678)
      # prod, dev 같은 mutable 태그는 제외 (보호)
      local sha_tags=()
      for tag in $all_tags; do
        # 정확히 {env}-{sha} 패턴만 매칭 (예: prod-abc1234)
        if [[ "$tag" =~ ^${env}-[a-f0-9]+$ ]]; then
          sha_tags+=("$tag")
        fi
      done

      local sha_count=${#sha_tags[@]}

      if [[ $sha_count -eq 0 ]]; then
        echo "      [$env] SHA 태그 없음"
        continue
      fi

      echo "      [$env] SHA 태그 ${sha_count}개 발견"

      # SHA 태그가 MAX_IMAGES_PER_REPO 이하면 정리 불필요
      if [[ $sha_count -le $MAX_IMAGES_PER_REPO ]]; then
        echo "      [$env] ✅ ${sha_count}개 모두 유지 (최대 ${MAX_IMAGES_PER_REPO}개 이하)"
        total_retained=$((total_retained + sha_count))
        continue
      fi

      # 각 태그의 생성 시간 조회 및 정렬
      declare -A tag_timestamps

      for tag in "${sha_tags[@]}"; do
        # 매니페스트에서 config digest 조회 (multi-line JSON 대응: tr로 줄바꿈 제거)
        local manifest=$(curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
                             "$registry_url/v2/$repo/manifests/$tag" 2>/dev/null | tr -d '\n\r\t ' || echo "")

        if [[ -z "$manifest" ]]; then
          continue
        fi

        # config 블록에서 digest 추출 (줄바꿈 제거된 JSON에서 파싱)
        local config_digest=$(echo "$manifest" | sed 's/.*"config":{[^}]*"digest":"\([^"]*\)".*/\1/' || true)

        # sha256:으로 시작하지 않으면 파싱 실패로 간주
        if [[ ! "$config_digest" =~ ^sha256: ]]; then
          continue
        fi

        # config blob에서 생성 시간 추출
        local config=$(curl -s "$registry_url/v2/$repo/blobs/$config_digest" 2>/dev/null || echo "")

        if [[ -z "$config" ]]; then
          continue
        fi

        # created 시간 추출 (ISO 8601 형식)
        local created=$(echo "$config" | tr -d '\n\r\t' | sed 's/.*"created":"\([^"]*\)".*/\1/' | head -1 || true)

        # ISO 8601 형식 검증 (YYYY-MM-DD로 시작해야 함)
        if [[ -n "$created" ]] && [[ "$created" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
          tag_timestamps["$tag"]="$created"
        fi
      done

      # 타임스탬프 기준으로 정렬 (최신순)
      local sorted_tags=($(
        for tag in "${!tag_timestamps[@]}"; do
          echo "${tag_timestamps[$tag]} $tag"
        done | sort -r | awk '{print $2}'
      ))

      # 정렬된 태그가 없으면 건너뛰기
      if [[ ${#sorted_tags[@]} -eq 0 ]]; then
        echo "      [$env] ⚠️  타임스탬프 조회 실패 (건너뜀)"
        continue
      fi

      # 최근 N개 유지, 나머지 삭제
      local keep_count=0
      local delete_count=0

      for i in "${!sorted_tags[@]}"; do
        local tag="${sorted_tags[$i]}"

        if [[ $i -lt $MAX_IMAGES_PER_REPO ]]; then
          # 유지
          echo "      [$env] ✅ $tag (유지 - $((i+1))번째 최신)"
          keep_count=$((keep_count + 1))
          total_retained=$((total_retained + 1))
        else
          # 삭제 대상
          echo "      [$env] 🗑️  $tag (삭제 대상)"

          if [[ "$DRY_RUN" != "true" ]]; then
            # 매니페스트 digest 조회 (삭제용)
            local manifest_digest=$(curl -s -I -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
                                        "$registry_url/v2/$repo/manifests/$tag" 2>/dev/null | \
                                    grep -i "docker-content-digest" | awk '{print $2}' | tr -d '\r' || true)

            if [[ -n "$manifest_digest" ]]; then
              local delete_result=$(curl -s -X DELETE \
                                        "$registry_url/v2/$repo/manifests/$manifest_digest" \
                                        -w "%{http_code}" -o /dev/null 2>/dev/null || echo "000")

              if [[ "$delete_result" == "202" ]] || [[ "$delete_result" == "200" ]]; then
                echo "      [$env]    ↳ 삭제 완료"
                delete_count=$((delete_count + 1))
                total_deleted=$((total_deleted + 1))
              else
                echo "      [$env]    ↳ 삭제 실패 (HTTP $delete_result)"
              fi
            else
              echo "      [$env]    ↳ digest 조회 실패"
            fi
          else
            delete_count=$((delete_count + 1))
            total_deleted=$((total_deleted + 1))
          fi
        fi
      done

      echo "      [$env] 결과: 유지 ${keep_count}개, 삭제 ${delete_count}개"

      # associative array 초기화
      unset tag_timestamps
      declare -A tag_timestamps
    done
  done

  echo ""
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "✅ 정리 시뮬레이션 완료 (DRY_RUN=true)"
  else
    echo "✅ 정리 완료"
  fi
  echo "   📊 총 유지: ${total_retained}개, 총 삭제: ${total_deleted}개"
  echo ""
  echo "💡 참고: 삭제된 태그의 실제 스토리지 정리는 레지스트리 Garbage Collection 필요"
  echo "   docker exec -it <registry_container> registry garbage-collect /etc/docker/registry/config.yml"
}

# == 메인 실행 로직 ==

# 롤백 모드 또는 빌드 모드 선택
if [[ "$ROLLBACK" == "true" ]]; then
  # ==================== 롤백 모드 ====================
  rollback_main

else
  # ==================== 빌드 & 배포 모드 ====================

  # == 실행 확인 ==
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 배포 정보"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   브랜치: $BRANCH"
  echo "   환경: $ENV_NAME ($ENV)"
  echo "   이미지 태그: $ENV"
  echo "   SHA: $SHA"
  if [[ "$DEPLOY_AFTER_PUSH" == "true" ]]; then
    echo "   배포: ✅ $ENV_NAME 컨테이너 재시작"
    echo "   포트: https://localhost:$NGINX_PORT"
  else
    echo "   배포: ❌ 빌드만 수행 (DEPLOY_AFTER_PUSH=false)"
  fi
  if is_ci_environment; then
    echo "   모드: 🤖 CI/CD 자동 실행"
  else
    echo "   모드: 👤 수동 실행"
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if [[ "$DEPLOY_AFTER_PUSH" == "true" ]]; then
    echo "현재 활성화된 브랜치는 [$BRANCH] 브랜치"
    echo "[$ENV] 태그 이미지가 새로 build&push > ${ENV_NAME} 컨테이너가 완전히 재시작됩니다."
    confirm_proceed "계속 하시겠습니까?"
  else
    echo "이미지 빌드 및 푸시만 수행합니다 (컨테이너 배포 없음)."
    confirm_proceed "계속 하시겠습니까?"
  fi

  echo ""

  check_registry

  # 빌드/푸시
  build_push "jfpage_backend" "./backend/Dockerfile"  "."
  build_push "jfpage_front"   "./client/Dockerfile"   "."
  build_push "jfpage_nginx"   "./nginx/Dockerfile"    "."

  msg "🎉 완료: $REG/jfpage_*(:${ENV}, :${ENV}-$SHA)"

  # 배포
  if [[ "$DEPLOY_AFTER_PUSH" == "true" ]]; then
    msg "🚀 Deploy to $ENV environment"

    if [[ ! -f "$COMPOSE_FILE" ]]; then
      echo "❌ $COMPOSE_FILE 파일이 없습니다."
      exit 1
    fi

    # 환경변수 로드 (개선: 공백/한글 완벽 처리)
    if [[ -f ".env" ]]; then
      set -a  # export 자동 적용
      source .env
      set +a  # 원상복구
      echo "✅ 환경변수 로드 완료"
    else
      echo "❌ .env 파일이 없습니다"
      exit 1
    fi

    echo "📥 현재 실행 중인 컨테이너 확인..."
    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    msg "🛑 기존 컨테이너 종료 및 제거"
    docker compose -f "$COMPOSE_FILE" down

    echo ""
    msg "🗑️  기존 이미지 제거 (강제 재풀 유도)"
    # jfpage 관련 이미지들을 강제로 제거하여 다시 pull하도록 함
    docker rmi "$REG/jfpage_backend:${ENV}" 2>/dev/null || true
    docker rmi "$REG/jfpage_front:${ENV}" 2>/dev/null || true
    docker rmi "$REG/jfpage_nginx:${ENV}" 2>/dev/null || true
    echo "✅ 이미지 제거 완료"

    sleep 2

    msg "📥 최신 이미지 Pull (--pull always 사용)"
    # --pull always 옵션으로 항상 최신 이미지 pull
    docker compose -f "$COMPOSE_FILE" pull --policy always

    msg "🚀 새로운 컨테이너 시작"
    docker compose -f "$COMPOSE_FILE" up -d

    echo ""
    echo "⌛ 서비스 시작 대기 중..."
    sleep 10

    msg "📊 실행 중인 컨테이너 상태"
    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    msg "📋 최근 로그 확인"
    docker compose -f "$COMPOSE_FILE" logs --tail=20

    echo ""
    msg "✅ $ENV_NAME 환경 배포 완료!"
    echo "📍 $ENV_NAME 서버: https://localhost:${NGINX_PORT}"
    echo ""
    echo "💡 실시간 로그 확인: docker compose -f $COMPOSE_FILE logs -f"
  fi

  # 레지스트리 이미지 정리 (커밋 기반)
  if [[ "${CLEANUP_REGISTRY:-true}" == "true" ]]; then
    echo ""
    cleanup_registry
  fi

  # 로컬 이미지 캐시 정리
  if [[ "${CLEANUP_LOCAL_AFTER_DEPLOY:-true}" == "true" ]]; then
    echo ""
    msg "🧹 로컬 이미지 캐시 정리"
    docker image prune -a -f --filter "until=240h"
    docker builder prune -f --filter "until=240h"
    echo "✅ 정리 완료"
  fi

  echo ""
  echo "✨ 모든 작업이 완료되었습니다!"
fi
