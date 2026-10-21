# P0-2 · Local tools — evidence

Owner: AWS engineer task, executed on the workstation. Date: 2026-10-19.
Constraint: **no sudo / no elevation**. Every install went to the user profile.

## Versions (all resolved from the user environment)

| Tool | Version | Path |
|:--|:--|:--|
| uv | `uv 0.13.2 (63f83b1a2 2026-10-19 x86_64-pc-windows-msvc)` | `C:\Users\Horse\.local\bin\uv.exe` |
| Python 3.12 | `Python 3.12.15` | `C:\Users\Horse\.local\bin\python3.12.exe` |
| AWS CLI v2 | `aws-cli/2.38.2 Python/3.14.6 Windows/10 exe/AMD64` | `%USERPROFILE%\.local\awscli\Amazon\AWSCLIV2\aws.exe` |
| Databricks CLI | `Databricks CLI v1.21.0` | `C:\Users\Horse\.local\bin\databricks.exe` |
| Node LTS | `v22.14.0` | `C:\Program Files\nodejs\node.exe` (already present) |
| npm | `11.19.1` | `C:\Program Files\nodejs\npm.ps1` |
| aws-cdk | `2.1145.0 (build 13877dc)` | `%APPDATA%\npm\cdk.ps1` (global) and `node_modules\.bin` (dev dep) |
| JDK 17 | `openjdk version "17.0.20.1" 2026-08-18` (Temurin) | `%USERPROFILE%\.local\jdk17\jdk-17.0.20.1+1\bin\java.exe` |

`JAVA_HOME` (user scope) = `C:\Users\Horse\.local\jdk17\jdk-17.0.20.1+1`.

## Two proofs the task asks for

**uv sync creates a Python 3.12 project** (scratch dir, so nothing lands in the repo):

```
uv init --python 3.12 --name pip25check
  Initialized project `pip25check`
uv sync
  Using CPython 3.12.15
  Creating virtual environment at: .venv
  Resolved 1 package in 47ms
...
.venv\Scripts\python.exe --version
  Python 3.12.15
.python-version -> 3.12
```

**`npm i -D aws-cdk` works as a project dev dependency**:

```
npm i -D aws-cdk
  added 1 package, and audited 2 packages in 5s
  found 0 vulnerabilities
node_modules\.bin\cdk.cmd --version
  2.1145.0 (build 13877dc)
```

## How each was installed (no elevation)

| Tool | Method |
|:--|:--|
| uv | `astral.sh/uv/install.ps1` — user script, installs into `%USERPROFILE%\.local\bin` |
| Python 3.12 | already managed by uv at `%APPDATA%\uv\python\...\3.12.15`; shim in `.local\bin\python3.12.exe` |
| AWS CLI v2 | `msiexec /a AWSCLIV2.msi TARGETDIR=%USERPROFILE%\.local\awscli` (administrative extract — no service registration, no admin) |
| Databricks CLI | release zip `databricks_cli_1.21.0_windows_amd64.zip` → `%USERPROFILE%\.local\bin\databricks.exe` |
| Node LTS | already installed system-wide (v22.14.0) |
| aws-cdk | `npm i -D aws-cdk` at project level; `npm i -g aws-cdk` was already present |
| JDK 17 | Temurin 17.0.20.1+1 zip → `%USERPROFILE%\.local\jdk17`, `JAVA_HOME` set at user scope |

## Deliberate choices

- **Not** `winget`: winget's `astral-sh.uv` and `Databricks.DatabricksCLI` entries exist on PATH but resolve to per-user package dirs that drift with upgrades. Direct user-profile installs pin the paths QA will re-check.
- **JDK 17 file name vs PATH order**: the machine-wide Oracle `javapath` (JDK 23) sits ahead of the user-entry on PATH, so a bare `java` still reports 23. `JAVA_HOME` points at 17 and is what PySpark/uv tests read. If a bare `java` must be 17, the board must remove the Oracle javapath (machine scope — requires elevation), which is out of scope for "no sudo".
- **Node 22.14.0** is LTS (22 line). Plan says "Node LTS"; no change made.

## Not done

- No repo change (needs S0.1). Nothing in `D:\abtesting` was modified by this task.
- The AWS CLI directory is not on the `bin` folder; it is added to the user PATH as its own entry.
- Docker (P0-3) is a separate task and needs board-run apt lines.
