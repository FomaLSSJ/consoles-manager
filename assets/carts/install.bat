@echo off&setlocal
for %%i in ("%~dp0.") do set "folder=%%~fi"

cd %folder%

reg add HKCR\.gba\DefaultIcon /t REG_EXPAND_SZ /d %CD%\gba.ico /ve /f
echo "GBA"

reg add HKCR\.gbc\DefaultIcon /t REG_EXPAND_SZ /d %CD%\gbc.ico /ve /f
echo "GBC"

reg add HKCR\.gb\DefaultIcon /t REG_EXPAND_SZ /d %CD%\gb.ico /ve /f
echo "GB"

reg add HKCR\.nes\DefaultIcon /t REG_EXPAND_SZ /d %CD%\nes.ico /ve /f
echo "NES"

reg add HKCR\.smc\DefaultIcon /t REG_EXPAND_SZ /d %CD%\snes.ico /ve /f
reg add HKCR\.sfc\DefaultIcon /t REG_EXPAND_SZ /d %CD%\snes.ico /ve /f
echo "SNES"

reg add HKCR\.z64\DefaultIcon /t REG_EXPAND_SZ /d %CD%\n64.ico /ve /f
echo "N64"

reg add HKCR\.sms\DefaultIcon /t REG_EXPAND_SZ /d %CD%\gen.ico /ve /f
echo "SMS"

reg add HKCR\.smd\DefaultIcon /t REG_EXPAND_SZ /d %CD%\gen.ico /ve /f
echo "GEN"

echo "All of your rom files are now cooler."