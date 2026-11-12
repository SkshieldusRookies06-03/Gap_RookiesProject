#!/bin/bash

echo -e "\n=== 1. 기존 컨테이너 내리기 및 빌드 재기동 ==="
sudo nerdctl compose down
sudo nerdctl compose up -d

echo -e "\n=== 2. 컨테이너 상태 확인 ==="
sudo nerdctl ps

echo -e "\n=== 3. 프록시 내부 Nginx 구문 검사 및 설정 확인 ==="
sudo nerdctl exec -it gap-compose-nginx-1 nginx -t

echo -e "\n=== 3-1. 프록시 내부 Nginx 구문 frontend wget 확인 ==="
sudo nerdctl exec -it gap-compose-nginx-1 wget -O- http://gap-compose-frontend-1:80

echo -e "\n=== 3-2. 프록시 내부 로그 30줄 확인 ==="
sudo nerdctl logs --tail 30 gap-compose-nginx-1


echo -e "\n=== 4. 80 포트 인바운드 규칙(iptables) 추가 ==="
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -L -n | grep 80


echo -e "\n=== 5. 커널 패킷 포워딩 및 FORWARD 정책 허용 ==="
sudo sysctl -w net.ipv4.ip_forward=1
sudo iptables -P FORWARD ACCEPT


echo -e "\n=== 6. 로컬(서버 내부) 접속 테스트 ==="
curl -I http://localhost:80


echo -e "\n=== 완료되었습니다. 이제 외부(내 PC)에서 접속을 시도해 보세요. ==="
echo "= > curl http://15.165.164.247:80 "


echo -e "\n = > sudo nerdctl stop $(sudo nerdctl ps -qa) "
echo -e "\n = > sudo nerdctl rm $(sudo nerdctl ps -qa) "

nc -zvw3 15.165.164.247 80 2>&1
nc -zvw3 15.165.164.247 8080 2>&1
nc -zvw3 15.165.164.247 8000 2>&1
nc -zvw3 15.165.164.247 3306 2>&1

echo -e "\n ------------- "
