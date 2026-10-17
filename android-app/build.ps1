param([string]$Jdk = 'C:\Program Files\Java\jdk-17')
$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
# aapt2 on Windows cannot reliably open paths containing Chinese characters.
$base = Join-Path $env:LOCALAPPDATA 'EarthOnlineBuild'
New-Item -ItemType Directory -Force $base | Out-Null
Copy-Item "$project/res","$project/src","$project/AndroidManifest.xml" -Destination $base -Recurse -Force
$sdk = Join-Path $project 'tools/sdk'
$bt = Join-Path $sdk 'android-15'
$platform = Join-Path $base 'android.jar'
Copy-Item "$sdk/android-35/android.jar" -Destination $platform -Force
$out = Join-Path $base 'build'
$release = Join-Path $base 'release'
$private = Join-Path $project 'private'
New-Item -ItemType Directory -Force $out,"$out/gen","$out/classes","$out/dex",$release,$private | Out-Null
$env:JAVA_HOME = $Jdk
function Run([string]$program, [string[]]$params) {
    & $program @params
    if ($LASTEXITCODE -ne 0) { throw "Build tool failed: $program ($LASTEXITCODE)" }
}
Run "$bt/aapt2.exe" @('compile','--dir',"$base/res",'-o',"$out/resources.zip")
Run "$bt/aapt2.exe" @('link','-o',"$out/resources.apk",'--manifest',"$base/AndroidManifest.xml",'-I',$platform,'--java',"$out/gen","$out/resources.zip")
$sources = @(Get-ChildItem "$base/src","$out/gen" -Filter '*.java' -Recurse | ForEach-Object { '"' + $_.FullName.Replace('\','/') + '"' })
[IO.File]::WriteAllLines("$out/sources.txt",$sources,[Text.UTF8Encoding]::new($false))
Run "$Jdk/bin/javac.exe" @('-encoding','UTF-8','-source','8','-target','8','-classpath',$platform,'-d',"$out/classes","@$out/sources.txt")
Run "$Jdk/bin/jar.exe" @('cf',"$out/classes.jar",'-C',"$out/classes",'.')
Run "$bt/d8.bat" @('--lib',$platform,'--min-api','26','--output',"$out/dex","$out/classes.jar")
Copy-Item -LiteralPath "$out/resources.apk" -Destination "$out/unsigned.apk" -Force
Run "$Jdk/bin/jar.exe" @('uf',"$out/unsigned.apk",'-C',"$out/dex",'classes.dex')
Run "$bt/zipalign.exe" @('-f','-p','4',"$out/unsigned.apk","$out/aligned.apk")
$keystore = "$private/earth-online-release.p12"
$passwordFile = "$private/signing-password.txt"
if (!(Test-Path -LiteralPath $keystore)) {
    if (Test-Path -LiteralPath $passwordFile) { throw 'Signing key missing but password exists. Restore the original key; do not silently rotate it.' }
    $bytes = [byte[]]::new(32)
    [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    [IO.File]::WriteAllText($passwordFile,[Convert]::ToBase64String($bytes))
    Run "$Jdk/bin/keytool.exe" @('-genkeypair','-keystore',$keystore,'-storetype','PKCS12','-storepass:file',$passwordFile,'-alias','earth-online','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Earth Online, OU=Application, O=lme.one, C=CN')
}
$apk = "$release/earth-online-0.1.0.apk"
Run "$bt/apksigner.bat" @('sign','--ks',$keystore,'--ks-pass',"file:$passwordFile",'--ks-key-alias','earth-online','--out',$apk,"$out/aligned.apk")
Run "$bt/apksigner.bat" @('verify','--verbose',$apk)
Run "$bt/zipalign.exe" @('-c','-v','4',$apk)
Get-FileHash -LiteralPath $apk -Algorithm SHA256
Get-Item -LiteralPath $apk | Select-Object FullName,Length
New-Item -ItemType Directory -Force "$project/release" | Out-Null
Copy-Item -LiteralPath $apk -Destination "$project/release/earth-online-0.1.0.apk" -Force
