#!/usr/bin/env bash
# Install Docker (apt repo, engine, usermod) and start local Kafka + DynamoDB via Docker Compose.
# Board runs sudo lines (B8).
set -euo pipefail

# --- Docker Engine install (same as install-docker-wsl.sh) ---
. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then echo "Requires Ubuntu" >&2; exit 1; fi
case "${VERSION_CODENAME:-}" in
  resolute) : ;;
  *) echo "Only Ubuntu 26.04 'resolute' supported" >&2; exit 1;;
esac
sudo apt-get remove -y docker.io docker-doc docker-compose podman-docker containerd runc || true
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu resolute stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"

# --- Docker Compose services start ---
cd "$(dirname "$0")"
# compose.yml located alongside this script
sudo docker compose up -d
# Wait for healthchecks (max 60s)
end=$((SECONDS+60))
while [ $SECONDS -lt $end ]; do
  kafka_status=$(sudo docker inspect --format='{{.State.Health.Status}}' ebook-kafka || echo "none")
  dynamo_status=$(sudo docker inspect --format='{{.State.Health.Status}}' ebook-dynamodb-local || echo "none")
  if [ "$kafka_status" = "healthy" ] && [ "$dynamo_status" = "healthy" ]; then
    echo "Kafka and DynamoDB Local healthy"
    exit 0
  fi
  sleep 2
done
echo "Timeout waiting for services health" >&2
exit 1
