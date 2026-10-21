#!/usr/bin/env bash
# Docker Engine for WSL2 Ubuntu 26.04 ("resolute"). Board runs this (B8, Plan v4.0 §5 Ph0 step 3).
# What it does: Docker's apt repo + key, docker-ce, buildx and compose plugins; no Docker Desktop,
# no account. Docker is used for local Kafka and DynamoDB Local only (D52, D55).
#
# Usage:  bash install-docker-wsl.sh
# Then:   close the terminal, reopen it (or run `newgrp docker`), and `docker run hello-world`.
set -euo pipefail

. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then
  echo "This script expects Ubuntu in WSL; found ID=${ID:-unknown}. Stop." >&2; exit 1
fi
case "${VERSION_CODENAME:-}" in
  resolute) : ;;                      # Ubuntu 26.04 (this machine)
  *) echo "Only Ubuntu 26.04 'resolute' is verified; found '${VERSION_CODENAME:-?}'." >&2
     echo "For another release, change the two 'resolute' words below first." >&2; exit 1 ;;
esac

# 1. Remove conflicting distro packages (none of them are installed here; harmless if absent).
sudo apt-get remove -y docker.io docker-doc docker-compose podman-docker containerd runc 2>/dev/null || true

# 2. Docker's own apt repo.
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu resolute stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

# 3. Install Docker Engine (CLI + daemon + containerd), buildx, compose.
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Run docker without sudo (takes effect on the next login).
sudo usermod -aG docker "$USER"

echo
echo "Install done. Next: close this terminal, open a new one, then run"
echo "  docker version && docker compose version && docker run --rm hello-world"
