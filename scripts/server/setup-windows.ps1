<#
  nuikit - local FiveM dev server (Windows)
  -----------------------------------------
  Installs everything a Qbox + nuikit dev server needs, then opens txAdmin:
    Git, Node.js LTS, pnpm, 7-Zip, MariaDB  (via winget)
    FXServer (latest recommended Windows build) -> C:\FXServer\server
    A `qbox` database + user in MariaDB
  Then you finish the Qbox recipe in txAdmin (needs your Cfx.re login).

  Run in PowerShell as Administrator:
    Set-ExecutionPolicy -Scope Process Bypass -Force
    irm https://raw.githubusercontent.com/belibathan/nuikit/main/scripts/server/setup-windows.ps1 | iex

  Safe to re-run: every step checks before it installs.
  Experimental: this becomes `npm create nuikit -t qbox`. Report issues on GitHub.
#>

$ErrorActionPreference = "Stop"
$Root     = if ($env:NUIKIT_SERVER_DIR) { $env:NUIKIT_SERVER_DIR } else { "C:\FXServer" }
$Server   = Join-Path $Root "server"
$TxData   = Join-Path $Root "txData"
$DbName   = "qbox"
$DbUser   = "qbox"

function Step($m) { Write-Host "`n>> $m" -ForegroundColor White }
function Ok($m)   { Write-Host "  ok $m" -ForegroundColor Green }
function Info($m) { Write-Host "  - $m" -ForegroundColor DarkGray }
function Warn($m) { Write-Host "  ! $m" -ForegroundColor Yellow }
function New-Secret { -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ }) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

# -- 0. Preflight ------------------------------------------------------------
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw "Run PowerShell as Administrator (right-click -> Run as administrator), then run this again." }
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw "winget not found. Install 'App Installer' from the Microsoft Store, then run this again." }

Write-Host ""
Write-Host "  nuikit - FiveM dev server setup" -ForegroundColor White
Write-Host "  Installs to $Root" -ForegroundColor DarkGray

# -- 1. Tools ----------------------------------------------------------------
Step "Tools"
$tools = @(
  @{ id = "Git.Git";                 cmd = "git";  name = "Git" },
  @{ id = "OpenJS.NodeJS.LTS";       cmd = "node"; name = "Node.js LTS" },
  @{ id = "7zip.7zip";               cmd = $null;  name = "7-Zip"; path = "C:\Program Files\7-Zip\7z.exe" }
)
foreach ($t in $tools) {
  $have = if ($t.cmd) { Get-Command $t.cmd -ErrorAction SilentlyContinue } else { Test-Path $t.path }
  if ($have) { Ok "$($t.name) already installed"; continue }
  Info "installing $($t.name)..."
  winget install --id $t.id -e --silent --accept-package-agreements --accept-source-agreements | Out-Null
  Ok $t.name
}
Refresh-Path
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Info "installing pnpm..."
  npm install -g pnpm | Out-Null
  Refresh-Path
}
Ok "pnpm $(pnpm --version)"

# -- 2. MariaDB --------------------------------------------------------------
Step "MariaDB"
$secretsFile = Join-Path $Root "nuikit-secrets.txt"
New-Item -ItemType Directory -Force -Path $Root | Out-Null
$secrets = @{}
if (Test-Path $secretsFile) {
  Get-Content $secretsFile | Where-Object { $_ -match "^(\w+)=(.*)$" } | ForEach-Object { $secrets[$Matches[1]] = $Matches[2] }
}

function Find-Mysql {
  Get-ChildItem "C:\Program Files\MariaDB*\bin\mysql.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
$mysql = Find-Mysql
if (-not $mysql) {
  if (-not $secrets.ROOT_PASSWORD) { $secrets.ROOT_PASSWORD = New-Secret }
  Info "installing MariaDB (service 'MariaDB', port 3306)..."
  winget install --id MariaDB.Server -e --silent --accept-package-agreements --accept-source-agreements `
    --override "SERVICENAME=MariaDB PORT=3306 PASSWORD=$($secrets.ROOT_PASSWORD) /qn" | Out-Null
  $mysql = Find-Mysql
  if (-not $mysql) { throw "MariaDB didn't install. Install it from https://mariadb.org/download (keep port 3306), then run this again." }
  Ok "MariaDB installed"
} else {
  Ok "MariaDB already installed"
  if (-not $secrets.ROOT_PASSWORD) {
    $secure = Read-Host "  MariaDB root password" -AsSecureString
    $secrets.ROOT_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  }
}
Start-Service MariaDB -ErrorAction SilentlyContinue

if (-not $secrets.DB_PASSWORD) { $secrets.DB_PASSWORD = New-Secret }
$sql = @"
CREATE DATABASE IF NOT EXISTS ``$DbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$($secrets.DB_PASSWORD)';
ALTER USER '$DbUser'@'localhost' IDENTIFIED BY '$($secrets.DB_PASSWORD)';
GRANT ALL PRIVILEGES ON ``$DbName``.* TO '$DbUser'@'localhost';
FLUSH PRIVILEGES;
"@
$ErrorActionPreference = "Continue"   # native stderr must not throw in Windows PowerShell 5.1
$sql | & $mysql -u root "-p$($secrets.ROOT_PASSWORD)" 2>&1 | Out-Null
$code = $LASTEXITCODE
$ErrorActionPreference = "Stop"
if ($code -ne 0) { throw "Couldn't log in to MariaDB as root. Check the root password in $secretsFile, then run this again." }
Ok "database '$DbName' and user '$DbUser' ready (utf8mb4_unicode_ci)"

# -- 3. FXServer -------------------------------------------------------------
Step "FXServer"
$fx = Join-Path $Server "FXServer.exe"
if (Test-Path $fx) {
  Ok "already at $Server (delete the folder to update)"
} else {
  $page = Invoke-WebRequest "https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/" -UseBasicParsing
  $href = ($page.Links | Where-Object { $_.outerHTML -match "LATEST RECOMMENDED" } | Select-Object -First 1).href
  if (-not $href) { $href = ($page.Links | Where-Object { $_.href -match "server\.7z$" } | Select-Object -First 1).href }
  if (-not $href) { throw "Couldn't find the recommended artifact. Download it from https://docs.fivem.net/docs/server-download/ into $Server, then run this again." }
  $url = if ($href -match "^https?://") { $href } else { "https://runtime.fivem.net/artifacts/fivem/build_server_windows/master/" + $href.TrimStart("./") }
  Info "downloading $(($url -split '/')[-2])..."
  $archive = Join-Path $env:TEMP "fxserver.7z"
  Invoke-WebRequest $url -OutFile $archive -UseBasicParsing
  New-Item -ItemType Directory -Force -Path $Server | Out-Null
  & "C:\Program Files\7-Zip\7z.exe" x $archive "-o$Server" -y | Out-Null
  Remove-Item $archive
  Ok "extracted to $Server"
}

# -- 4. Save secrets + launch ------------------------------------------------
$conn = "mysql://$($DbUser):$($secrets.DB_PASSWORD)@localhost:3306/$($DbName)?charset=utf8mb4"
@(
  "# nuikit dev server secrets. Local only; don't commit or share.",
  "ROOT_PASSWORD=$($secrets.ROOT_PASSWORD)",
  "DB_PASSWORD=$($secrets.DB_PASSWORD)",
  "DB_CONNECTION=$conn"
) | Set-Content $secretsFile
Ok "credentials saved to $secretsFile"

Step "Next: finish in txAdmin (opens in your browser)"
Write-Host @"
  1. Link Account with your Cfx.re login, set an admin password, name the server.
  2. Popular Recipes -> Qbox. Data location: $TxData
  3. License key: the one from portal.cfx.re
  4. Database: host localhost - port 3306 - user $DbUser - database $DbName
     password is on your clipboard (also in $secretsFile)
  5. Save & Run Server -> open FiveM -> F8 -> connect localhost
"@ -ForegroundColor Gray
Set-Clipboard -Value $secrets.DB_PASSWORD

New-Item -ItemType Directory -Force -Path $TxData | Out-Null
Start-Process -FilePath $fx -ArgumentList "+set txDataPath `"$TxData`"" -WorkingDirectory $Server
Write-Host "`n  FXServer is starting in a new window. txAdmin: http://localhost:40120`n" -ForegroundColor White
