#!/bin/bash

# Root 모드 실행 스크립트

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    echo "[-] 이 스크립트는 root 권한으로 실행해야 합니다."
    echo "    sudo $0"
    exit 1
fi

echo "[+] containerd 서비스 상태 확인 중..."

if ! systemctl is-active --quiet containerd; then
    echo "[+] containerd 서비스 시작"
    systemctl start containerd || exit 1
fi

echo "[+] Root 모드 nerdctl 버전 정보:"
nerdctl version

echo "[+] Root 모드 컨테이너 목록:"
nerdctl ps -a