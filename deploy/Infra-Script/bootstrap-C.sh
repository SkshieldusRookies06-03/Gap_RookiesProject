#!/usr/bin/env bash

set -euo pipefail

. /etc/os-release
echo "== OS: ${PRETTY_NAME}"

# 1. containerd 설치 (Docker 대신 저수준 런타임 사용)
if command -v containerd >/dev/null 2>&1; then
  echo "== containerd 이미 설치됨: $(containerd --version)"
elif [ "${ID}" = "amzn" ]; then
  echo "== containerd 및 필수 툴 설치 (dnf)"
  sudo dnf install -y containerd runc iptables
elif [ "${ID}" = "ubuntu" ]; then
  echo "== containerd 및 필수 툴 설치 (apt)"
  sudo apt-get update && sudo apt-get install -y containerd runc iptables
else
  echo "지원하지 않는 OS 입니다: ${ID}" >&2
  exit 1
fi

# containerd 기본 설정 생성 및 서비스 활성화
sudo mkdir -p /etc/containerd
if [ ! -f /etc/containerd/config.toml ]; then
  containerd config default | sudo tee /etc/containerd/config.toml >/dev/null
  # SystemdCgroup 설정 활성화 (쿠버네티스/컨테이너 안정성 권장)
  sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
fi
sudo systemctl enable --now containerd

# 2. nerdctl 설치 (Docker CLI 호환 저수준/OCI 관리 도구)
if command -v nerdctl >/dev/null 2>&1; then
  echo "== nerdctl 이미 설치됨: $(nerdctl --version)"
else
  echo "== nerdctl 최신 풀 패키지 설치"
  ARCH="amd64"
  [ "$(uname -m)" = "aarch64" ] && ARCH="arm64"
  
  # buildkit, CNI 플러그인이 모두 포함된 full 아카이브 다운로드
  NERDCTL_VERSION="1.7.6" # 필요시 최신 버전으로 조정 가능
  DOWNLOAD_URL="https://github.com/containerd/nerdctl/releases/download/v${NERDCTL_VERSION}/nerdctl-full-${NERDCTL_VERSION}-linux-${ARCH}.tar.gz"
  
  curl -sSL "${DOWNLOAD_URL}" -o /tmp/nerdctl-full.tar.gz
  sudo tar Cxzf /usr/local /tmp/nerdctl-full.tar.gz
  rm -f /tmp/nerdctl-full.tar.gz
  echo "== nerdctl 설치 완료"
fi

# 3. 스왑(Swap) 2GB 생성 (메모리 부족 방지용)
if [ "$(swapon --show | wc -l)" -eq 0 ]; then
  echo "== 스왑 2GB 생성 중..."
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
else
  echo "== 스왑 이미 존재함"
fi

# 4. 검증 및 상태 출력
echo
echo "=============================="
containerd --version
nerdctl --version
free -h | head -3
echo "=============================="
echo "완료! containerd와 nerdctl 환경 세팅이 정상적으로 끝났습니다."
echo "다음 단계 예시:"
echo "  nerdctl pull vega2krookies6/langchain-rag-app:v1"
echo "  nerdctl run -d --name rag-app -p 80:7860 -e OPENAI_API_KEY=\"sk-...\" vega2krookies6/langchain-rag-app:v1"
