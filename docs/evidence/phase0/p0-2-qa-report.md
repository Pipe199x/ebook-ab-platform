# P0-2 · QA report — local tools

Reviewer: QA engineer. Date: 2026-10-20. Issue: PIP-25. Plan ref: §5 Phase 0 step 2.
Owner evidence verified: `docs/evidence/phase0/p0-2-local-tools.md`.
Verdict: **PASS**. Nothing was taken from the owner's transcript — every version was re-run here.

## Method

Fresh shell reconstructed from the registry (`Machine\Path` + `User\Path` + `User\JAVA_HOME`), so the
check does not inherit an already-open agent process. Elevation checked in the same process.

```
elevated=no            (net session → non-zero; IsInRole(Administrator) = False)
```

## Versions — QA output (fresh shell)

```
uv --version
  uv 0.13.2 (63f83b1a2 2026-10-19 x86_64-pc-windows-msvc)

python3.12 --version
  Python 3.12.15

aws --version
  aws-cli/2.38.2 Python/3.14.6 Windows/10 exe/AMD64

databricks version
  Databricks CLI v1.21.0

node --version
  v22.14.0            (process.release.lts = "Jod" → Node 22 LTS line)

npm --version
  11.19.1

cdk --version
  2.1145.0 (build 13877dc)

"%JAVA_HOME%\bin\java.exe" -version
  openjdk version "17.0.20.1" 2026-08-18
  OpenJDK Runtime Environment Temurin-17.0.20.1+1
```

Resolved paths (`where`), all matching the owner's table:

```
C:\Users\Horse\.local\bin\uv.exe
C:\Users\Horse\.local\bin\python3.12.exe
C:\Users\Horse\.local\awscli\Amazon\AWSCLIV2\aws.exe
C:\Users\Horse\.local\bin\databricks.exe
C:\Program Files\nodejs\node.exe        (pre-existing machine install)
C:\Users\Horse\AppData\Roaming\npm\cdk.cmd
```

## The plan's two proofs, reproduced in the QA run scratch dir

`uv sync` on a Python 3.12 project:

```
uv init --python 3.12 --name p0check   →  Initialized project `p0check`
uv sync                                →  Installed 1 package in 16ms
uv sync --frozen                       →  Checked 1 package in 4ms
.venv\Scripts\python.exe -c "import sys;print(sys.version)"
                                       →  3.12.15 (main, Oct 14 2026, 01:08:45) [MSC v.1944 64 bit (AMD64)]
uv python find 3.12                    →  %APPDATA%\uv\python\cpython-3.12-windows-x86_64-none\python.exe
.python-version                        →  3.12
```

`npm i -D aws-cdk` as a project dev dependency:

```
npm i -D aws-cdk                       →  added 1 package in 2s
npm ls aws-cdk                         →  `-- aws-cdk@2.1145.0
node_modules\.bin\cdk.cmd --version    →  2.1145.0 (build 13877dc)
```

## "No sudo" evidence

- The checking process is **not elevated** (`net session` fails; `IsInRole(Administrator)` = False).
- uv, Python 3.12, AWS CLI, Databricks CLI and JDK 17 all live under `%USERPROFILE%`.
- `JAVA_HOME` is set at **user** scope: `C:\Users\Horse\.local\jdk17\jdk-17.0.20.1+1`.
- User `Path` carries the new entries; **no machine-scope variable was added** — machine `Path` still
  contains only the pre-existing entries (`C:\Program Files\nodejs`, `%APPDATA%\npm`, Oracle javapath, …).

## Findings

| # | Severity | Finding | Disposition |
|:--|:--|:--|:--|
| 1 | info | A bare `java` resolves to Oracle **JDK 23.0.1** (`C:\Program Files\Common Files\Oracle\Java\javapath`, machine PATH, ahead of the user JDK 17 entry). `JAVA_HOME` and `%JAVA_HOME%\bin\java.exe` are 17, which is what PySpark/uv read. | Matches the owner's declared caveat. Fixing bare `java` needs the machine-scope entry removed = elevation, out of scope for "no sudo". Board-optional. |
| 2 | info | A bare `python` is 3.13.2 (pre-existing user Python313). 3.12 is reached as `python3.12` and by `uv sync`, which pins it via `.python-version`. | Not a defect: the plan asks for `uv` + Python 3.12 through `uv sync` (D2). |
| 3 | info | `databricks version` also prints "Databricks skills are not installed … run `databricks aitools install`". | Cosmetic; the version line is correct. |
| 4 | info | A process launched **before** the install does not see the new user PATH entries (this agent shell could not resolve `aws` until PATH was rebuilt from the registry). | Expected Windows behaviour, not a defect: a fresh shell resolves all six. |
| 5 | process | `docs/evidence/phase0/p0-2-local-tools.md` and this report are **untracked**; committing needs S0.1 (board OK). The installs themselves changed no tracked repo file. | Correct as stated by the owner; resolved when S0.1 clears. |

## Acceptance (plan §Phase 0 step 2)

Plan text: *"Local tools (no sudo): uv → Python 3.12 → `uv sync`; AWS CLI v2 (user install);
Databricks CLI; Node LTS; `npm i -D aws-cdk`; a JDK 17 for local PySpark tests."*

- [x] uv present and on the user path — 0.13.2
- [x] Python 3.12 resolvable and usable by uv — 3.12.15
- [x] `uv sync` creates a 3.12 venv — verified in a scratch project
- [x] AWS CLI v2, user install — 2.38.2
- [x] Databricks CLI — 1.21.0
- [x] Node LTS — v22.14.0 (Jod)
- [x] `npm i -D aws-cdk` — aws-cdk 2.1145.0 installed as a dev dependency
- [x] JDK 17 available for PySpark — Temurin 17.0.20.1 via `JAVA_HOME`
- [x] No sudo / no elevation

Result: **PASS.** Unblocks PIP-27, PIP-29, PIP-32. Outstanding items are board-optional (finding 1)
or already tracked (finding 5).
