# Use this if you created an EMPTY public repo on GitHub first:
#   https://github.com/organizations/belicongroup/repositories/new
#   Name: MLetra-paywall-issue2  (public, no README / no .gitignore)
#
# Then run this script from PowerShell (uses your existing git HTTPS credentials).
#
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$Url = "https://github.com/belicongroup/MLetra-paywall-issue2.git"
git remote remove issue2 2>$null
git remote add issue2 $Url
git push -u issue2 main
Write-Host "Pushed to: $Url"
