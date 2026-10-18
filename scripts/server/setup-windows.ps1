<#
  nuikit - local FiveM dev server (Windows), experimental
  Run in PowerShell as Administrator:
    Set-ExecutionPolicy -Scope Process Bypass -Force
    irm https://raw.githubusercontent.com/belibathan/nuikit/main/scripts/server/setup-windows.ps1 | iex

  Optional: $env:NUIKIT_DB_ROOT = '<existing MariaDB root password>' before running.

  1. Installs Git, Node LTS, pnpm, 7-Zip (winget).
  2. MariaDB: keeps an existing install if the root password works; otherwise
     reinstalls it with a fresh password (old folder is renamed, not deleted).
  3. Downloads the latest recommended FXServer to C:\FXServer\server and starts txAdmin.
  Credentials go to %USERPROFILE%\nuikit-server.txt and the root password to the clipboard.
#>

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"   # PS 5.1 downloads crawl with the progress bar on
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Root    = "C:\FXServer"
$Server  = "$Root\server"
$TxData  = "$Root\txData"
$Secrets = "$env:USERPROFILE\nuikit-server.txt"

function Step($m) { Write-Host "`n>> $m" -ForegroundColor White }
function Ok($m)   { Write-Host "   ok $m" -ForegroundColor Green }
function Info($m) { Write-Host "   - $m" -ForegroundColor DarkGray }
function New-Secret { -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ }) }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User") }
function Find-Mysql { Get-ChildItem "C:\Program Files\MariaDB*\bin\mysql.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName }
function Test-Root([string]$pw) {
  $m = Find-Mysql; if (-not $m -or -not $pw) { return $false }
  $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  & $m -u root "--password=$pw" -e "SELECT 1" 2>&1 | Out-Null
  $code = $LASTEXITCODE; $ErrorActionPreference = $prev
  return ($code -eq 0)
}
function Wait-Root([string]$pw) { for ($i = 0; $i -lt 40; $i++) { if (Test-Root $pw) { return $true }; Start-Sleep 1 }; return $false }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Open PowerShell as Administrator and run this again." }

Write-Host "`n   nuikit - FiveM dev server setup" -ForegroundColor White

# 1. Tools ------------------------------------------------------------------
Step "Tools"
foreach ($t in @(@{id="Git.Git";cmd="git"}, @{id="OpenJS.NodeJS.LTS";cmd="node"})) {
  if (Get-Command $t.cmd -ErrorAction SilentlyContinue) { Ok $t.id; continue }
  winget install --id $t.id -e --silent --accept-package-agreements --accept-source-agreements | Out-Null; Ok "$($t.id) installed"
}
if (-not (Test-Path "C:\Program Files\7-Zip\7z.exe")) { winget install --id 7zip.7zip -e --silent --accept-package-agreements --accept-source-agreements | Out-Null }
Ok "7-Zip"
Refresh-Path
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { npm install -g pnpm | Out-Null; Refresh-Path }
Ok "pnpm"

# 2. MariaDB ----------------------------------------------------------------
Step "MariaDB"
$saved = (Get-Content $Secrets -ErrorAction SilentlyContinue | Where-Object { $_ -like "ROOT_PASSWORD=*" } | Select-Object -First 1)
if ($saved) { $saved = $saved.Substring(14) }
$rootPw = $null
foreach ($candidate in @($env:NUIKIT_DB_ROOT, $saved)) {
  if ($candidate -and (Test-Root $candidate)) { $rootPw = $candidate; break }
}
if ($rootPw) {
  Ok "existing MariaDB, root login works"
} else {
  if (Find-Mysql) {
    Info "existing MariaDB with an unknown root password: reinstalling it clean"
    Get-Service | Where-Object { $_.Name -like "MariaDB*" -or $_.Name -like "MySQL*" } | Stop-Service -Force -ErrorAction SilentlyContinue
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    winget uninstall --id MariaDB.Server -e --silent --accept-source-agreements 2>&1 | Out-Null
    Get-Package -Name "MariaDB*" -ErrorAction SilentlyContinue | Uninstall-Package -Force -ErrorAction SilentlyContinue | Out-Null
    $ErrorActionPreference = $prev
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Get-ChildItem "C:\Program Files" -Directory -Filter "MariaDB*" -ErrorAction SilentlyContinue | ForEach-Object {
      Rename-Item $_.FullName "$($_.Name).backup-$stamp"; Info "old files kept at C:\Program Files\$($_.Name).backup-$stamp"
    }
  }
  $rootPw = New-Secret
  Info "installing MariaDB (port 3306)... this takes a minute"
  winget install --id MariaDB.Server -e --silent --accept-package-agreements --accept-source-agreements `
    --override "SERVICENAME=MariaDB PORT=3306 PASSWORD=$rootPw /qn" | Out-Null
  if (-not (Wait-Root $rootPw)) { throw "MariaDB installed but root login failed. Send a screenshot of this window." }
  Ok "MariaDB installed"
}
@("# nuikit dev server. Local only.", "ROOT_PASSWORD=$rootPw", "DB_HOST=localhost", "DB_PORT=3306", "DB_USER=root") | Set-Content $Secrets
Ok "root password saved to $Secrets"

# 3. FXServer ---------------------------------------------------------------
Step "FXServer"
$fx = "$Server\FXServer.exe"
if (Test-Path $fx) { Ok "already at $Server" } else {
  # Cfx's version API first; the download page as a fallback (the old artifact index now redirects there).
  $url = $null
  try { $url = (Invoke-RestMethod "https://changelogs-live.fivem.net/api/changelog/versions/win32/server").recommended_download } catch {}
  if (-not $url) {
    $html = (Invoke-WebRequest "https://docs.fivem.net/docs/server-download/?os=windows&platform=legacy" -UseBasicParsing).Content
    $m = [regex]::Match($html, 'https://runtime\.fivem\.net/artifacts/fivem/build_server_windows/master/[^"''\s]+/server\.7z')
    if ($m.Success) { $url = $m.Value }
  }
  if (-not $url) { throw "Couldn't find the recommended FXServer build. Download it from https://docs.fivem.net/docs/server-download/ and extract it to $Server, then run this again." }
  Info "downloading $url"
  $archive = "$env:TEMP\fxserver.7z"
  Invoke-WebRequest $url -OutFile $archive -UseBasicParsing
  New-Item -ItemType Directory -Force -Path $Server | Out-Null
  & "C:\Program Files\7-Zip\7z.exe" x $archive "-o$Server" -y | Out-Null
  Remove-Item $archive
  if (-not (Test-Path $fx)) { throw "Extraction failed: $fx not found." }
  Ok "FXServer at $Server"
}

# 4. Launch -----------------------------------------------------------------
New-Item -ItemType Directory -Force -Path $TxData | Out-Null
Set-Clipboard -Value $rootPw
Start-Process -FilePath $fx -ArgumentList "+set txDataPath `"$TxData`"" -WorkingDirectory $Server

Step "Done. txAdmin is opening at http://localhost:40120"
Write-Host @"
   1. Link Account (Cfx.re login), set an admin password, name the server
   2. Popular Recipes -> Qbox, data folder $TxData
   3. Paste your license key
   4. Database: localhost / 3306 / root / password is on your clipboard
   5. Run Recipe -> Save & Run Server -> in FiveM press F8: connect localhost
"@ -ForegroundColor Gray
