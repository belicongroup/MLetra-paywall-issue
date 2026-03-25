# Publishes this repo to: https://github.com/belicongroup/MLetra-paywall-issue2 (public)
#
# Prerequisite (pick one):
#   1) Run: gh auth login
#   2) Or set: $env:GH_TOKEN = "<github_pat_with_repo_scope>"
#
$ErrorActionPreference = "Stop"
$Repo = "belicongroup/MLetra-paywall-issue2"
$Gh = Join-Path ${env:ProgramFiles} "GitHub CLI\gh.exe"
if (-not (Test-Path $Gh)) {
  Write-Error "GitHub CLI not found at $Gh. Install from https://cli.github.com/"
}

Set-Location (Split-Path $PSScriptRoot -Parent)

& $Gh auth status

# Create remote repo and push current branch (skip if remote already exists)
$remotes = @(git remote)
if ($remotes -notcontains "issue2") {
  & $Gh repo create $Repo --public --source=. --remote=issue2 --push --description "M Letras payment test harness (paywall troubleshooting)"
} else {
  git push -u issue2 HEAD:main
}

Write-Host "Done. Repo: https://github.com/$Repo"
