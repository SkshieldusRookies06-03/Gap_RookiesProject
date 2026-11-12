#!/usr/bin/env bash




set -euo pipefail


. /etc/os-release
echo "== OS: ${PRETTY_NAME}"


if command -v docker >/dev/null 2>&1; then
  echo "== Docker 이미 설치됨: $(docker --version)"

elif [ "${ID}" = "amzn" ]; then
  echo "== Docker 설치 (dnf)"
  sudo dnf install -y docker

elif [ "${ID}" = "ubuntu" ]; then
  echo "== Docker 설치 (get.docker.com)"
  curl -fsSL https://get.docker.com | sudo sh

else
  echo "지원하지 않는 OS 입니다: ${ID}" >&2
  exit 1
fi


sudo systemctl enable --now docker


if docker compose version >/dev/null 2>&1 || sudo docker compose version >/dev/null 2>&1; then
  echo "== Compose 이미 설치됨"
else
  echo "== Compose 플러그인 설치"
  ARCH="$(uname -m)"
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -fSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose

  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi


if [ "$(swapon --show | wc -l)" -eq 0 ]; then
  echo "== 스왑 2GB 생성"

  # 1) 2GB 크기의 빈 파일 만들기 (/dev/zero 에서 1MB 씩 2048번 = 2GB)
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none

  # 2) root 만 읽고 쓸 수 있게 (메모리 내용이 디스크에 기록되므로 다른 사용자가 보면 안 됨)
  sudo chmod 600 /swapfile

  # 3) 이 파일을 스왑 영역으로 포맷
  sudo mkswap /swapfile >/dev/null

  # 4) 지금 바로 스왑 사용 시작
  sudo swapon /swapfile

  # 5) 재부팅 후에도 자동으로 스왑을 켜도록 /etc/fstab 에 한 줄 추가
  #    tee -a : 파일 끝에 추가 (sudo 권한으로 쓰기 위해 echo > 대신 tee 사용)
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
else
  echo "== 스왑 이미 있음"
fi


sudo usermod -aG docker "${USER}"


echo
sudo docker --version            # 예: Docker version 25.x
sudo docker compose version      # 예: Docker Compose version v2.x
free -h | head -3                # Mem(실제 메모리), Swap(2.0Gi 이면 정상)
echo
echo "완료. 로그아웃(exit) 후 다시 SSH 접속하면 sudo 없이 docker 명령을 쓸 수 있습니다."
echo "다음 단계: cp .env.example .env && chmod 600 .env && nano .env"


