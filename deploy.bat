@echo off
chcp 65001 >nul
echo 🚀 开始部署到 GitHub Pages...

:: 检查是否存在 gh-pages 分支
git show-ref --quiet refs/heads/gh-pages
if %errorlevel% equ 0 (
    echo 📁 切换到 gh-pages 分支...
    git checkout gh-pages
) else (
    echo 📁 创建新的 gh-pages 分支...
    git checkout --orphan gh-pages
    git rm -rf .
    echo. > .nojekyll
    git add .nojekyll
    git commit -m "Initialize gh-pages branch"
    git checkout m15-winter-season
)

:: 复制 dist 目录内容
echo 📁 复制 dist 目录内容...
if exist dist (
    xcopy /s /e /y dist\* .\
    rmdir /s /q dist
)

:: 添加所有文件
git add -A

:: 检查是否有需要提交的更改
git diff --staged --quiet
if %errorlevel% equ 0 (
    echo ✅ 没有需要更新的内容
) else (
    echo 💾 提交更改...
    git commit -m "Deploy to GitHub Pages - %date% %time%"
)

:: 推送到 gh-pages 分支
echo 📤 推送到 GitHub Pages...
git push origin gh-pages --force

:: 切换回原分支
git checkout m15-winter-season

echo 🎉 部署完成！
echo 📱 手机访问地址：https://hyper90124.github.io/lingang-survival/
echo.
echo 💡 提示：如果访问出现404，请检查 GitHub Pages 设置
echo    仓库设置 → Pages → Source 选择 gh-pages 分支