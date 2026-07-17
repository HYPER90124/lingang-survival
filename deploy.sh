#!/bin/bash

# 部署脚本：将项目部署到 GitHub Pages
# 使用 gh-pages 分支进行部署

echo "🚀 开始部署到 GitHub Pages..."

# 切换到 gh-pages 分支（如果不存在则创建）
if git show-ref --quiet refs/heads/gh-pages; then
    git checkout gh-pages
else
    git checkout --orphan gh-pages
    git rm -rf .
    touch .nojekyll
    git add .nojekyll
    git commit -m "Initialize gh-pages branch"
    git checkout m15-winter-season
fi

# 复制 dist 目录内容到 gh-pages 分支
echo "📁 复制 dist 目录内容..."
cp -r dist/* ./
rm -rf dist/

# 添加所有文件
git add -A

# 提交更改
if git diff --staged --quiet; then
    echo "✅ 没有需要更新的内容"
else
    git commit -m "Deploy to GitHub Pages - $(date '+%Y-%m-%d %H:%M:%S')"
fi

# 推送到 gh-pages 分支
git push origin gh-pages --force

# 切换回原分支
git checkout m15-winter-season

echo "🎉 部署完成！"
echo "📱 手机访问地址：https://hyper90124.github.io/lingang-survival/"