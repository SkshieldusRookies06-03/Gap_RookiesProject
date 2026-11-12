#!/bin/bash

# Rootless nerdctl 실행 스크립트

# Root 실행 방지
if [ "$EUID" -eq 0 ]; then
    echo "[-] Rootless 모드는 일반 사용자 계정으로 실행해야 합니다."
    exit 1
fi

# 환경 변수 설정
export PATH="/usr/local/bin:$HOME/bin:$PATH"

# XDG_RUNTIME_DIR 확인
if [ -z "$XDG_RUNTIME_DIR" ]; then
    export XDG_RUNTIME_DIR="/run/user/$(id -u)"
fi

if [ ! -d "$XDG_RUNTIME_DIR" ]; then
    echo "[-] XDG_RUNTIME_DIR 디렉터리가 존재하지 않습니다."
    echo "[-] 사용자 systemd 세션 및 linger 설정을 확인하세요."
    exit 1
fi

echo "[+] 현재 사용자: $(whoami)"
echo "[+] UID: $(id -u)"
echo "[+] XDG_RUNTIME_DIR: $XDG_RUNTIME_DIR"

# Rootless containerd 서비스 확인
echo "[+] Rootless containerd 서비스 상태 확인"

if ! systemctl --user is-active --quiet containerd; then
    echo "[-] Rootless containerd 서비스가 실행 중이지 않습니다."
    echo "[-] Rootless 환경 설정을 확인하세요."
fi

# nerdctl 버전 확인
echo "[+] Rootless nerdctl 버전 확인:"
nerdctl version

# 컨테이너 목록 확인
echo "[+] Rootless 컨테이너 목록:"
nerdctl ps -a