# P0-3 · Docker install for the board (B8)

Plan v4.0 §5 Phase 0 step 3. Docker Engine in WSL2 Ubuntu 26.04, used **only** for local Kafka 4.2.2 and DynamoDB Local (D52, D55). No Docker Desktop, no account, no AWS involvement.

Two files, both verified as far as is possible without Docker:

| File | What it is | Verified how |
|:--|:--|:--|
| `install-docker-wsl.sh` | the six-line apt/install script the board runs (that *is* B8) | `bash -n` clean; Docker's apt repo confirmed to publish `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin` and `docker-compose-plugin` for `resolute` (Ubuntu 26.04); GPG key fingerprint `9DC8 5822 9FC7 DD38 854A  E2D8 8D81 803C 0EBF CD88` re-checked today |
| `compose.yml` | local Kafka + DynamoDB Local, the thing `docker compose up` has to take healthy | `docker compose config --quiet` passes; official compose-spec JSON Schema validates it; both image tags exist on Docker Hub (`apache/kafka:4.2.2` published 2026-09-28, `amazon/dynamodb-local:3.3.2` published 2026-10-15) |

Not run: this machine has no Docker yet (that is the point of the script), and the sudo password is the board's. So the "healthy" half of the acceptance is the board's run, below.

## What the board runs

Inside WSL Ubuntu (not PowerShell):

```bash
cd /mnt/d/abtesting/docker      # or wherever the two files were saved
bash install-docker-wsl.sh      # asks for your sudo password once
```

Then **close and reopen the terminal** (the `docker` group change only applies to a new login), and check:

```bash
docker version --format '{{.Server.Version}}'
docker compose version
```

Expected: `29.9.x` and `Docker Compose version v5.6.x`.

Then start the two local services and check they are healthy:

```bash
docker compose -f /mnt/d/abtesting/docker/compose.yml up -d --wait
docker compose -f /mnt/d/abtesting/docker/compose.yml ps
```

Expected within ~60 s: both rows `healthy`.

```bash
# Kafka really answers
docker exec ebook-kafka /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 | head -1
# DynamoDB Local really answers (any JSON error means the HTTP server is up; a closed port means it is not)
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/
```

Expected: a broker line, and `400`.

Stop them when done: `docker compose -f /mnt/d/abtesting/docker/compose.yml down`

## Why these settings

- **Kafka 4.2.2, KRaft, single node.** D4 pins 4.2.2 for laptop and CI alike. KRaft means no ZooKeeper. `KAFKA_LOG_RETENTION_HOURS=72` matches the topic contract; `KAFKA_NUM_PARTITIONS=2` matches the 5 topics × 2 partitions layout; auto-create is **off** so `tools/topics.py` (Phase 2) stays the only way topics appear.
- **Advertised as `localhost:9092`, port bound to `127.0.0.1`.** Clients on Windows and in WSL both reach it, nothing on the LAN does.
- **`KAFKA_HEAP_OPTS=-Xms512m -Xmx1g`.** WSL has 7.9 GB and ~2 GB is all the plan allows Kafka locally (A9).
- **DynamoDB Local 3.3.2, `-inMemory`.** Pinned tag, clean tables per run, which is what the edge integration tests want.
- **Healthchecks on both.** `--wait` then works, so "healthy" is something the board sees as a fact, not a guess.

## Deliberately not here

No persistence for DynamoDB Local (in-memory), no auth/TLS on either service, no Kafka UI, no Spark (D55 removed it), no Aiven (D52), no GitHub Actions mirror — CI gets its own service container in `ci.yml` (Phase 2).

## Where the files land in the repo

`docker/compose.yml` + `docker/install-docker-wsl.sh` go in at the same time as PIP-24's repo check, i.e. as soon as S0.1 is answered (PIP-37). Until then these two files live on this task only, so the repo is untouched.
