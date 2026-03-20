#!/bin/bash
set -e

APP_NAME="工作提醒助手"
APP_ID="com.noticemaid.app"
BINARY_NAME="notice_maid"
DMG_NAME="WorkNoticeMaid"
VERSION="1.0.0"
BUILD_DIR="build"
APP_DIR="$BUILD_DIR/${APP_NAME}.app"

echo "==> 清理旧构建产物..."
rm -rf "$BUILD_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

echo "==> 编译二进制 (arm64)..."
CGO_LDFLAGS="-framework UniformTypeIdentifiers" \
CGO_ENABLED=1 \
GOOS=darwin \
GOARCH=arm64 \
go build -tags "desktop,production" -ldflags="-s -w" \
  -o "$APP_DIR/Contents/MacOS/$BINARY_NAME" .

echo "==> 生成 Info.plist..."
cat > "$APP_DIR/Contents/Info.plist" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${BINARY_NAME}</string>
    <key>CFBundleIdentifier</key>
    <string>${APP_ID}</string>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleVersion</key>
    <string>${VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${VERSION}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSSupportsAutomaticGraphicsSwitching</key>
    <true/>
</dict>
</plist>
PLISTEOF

echo "==> 从 images/f1_icon.svg 生成应用图标..."
SVG_SRC="images/f1_icon.svg"
ICON_DIR="$BUILD_DIR/AppIcon.iconset"
MASTER_PNG="$BUILD_DIR/icon_master_1024.png"
mkdir -p "$ICON_DIR"

if [ ! -f "$SVG_SRC" ]; then
    echo "    错误: $SVG_SRC 不存在"
    exit 1
fi

# 方法1: 使用 qlmanage 渲染 SVG（macOS 自带）
qlmanage -t -s 1024 -o "$BUILD_DIR" "$SVG_SRC" >/dev/null 2>&1
QL_OUT="$BUILD_DIR/$(basename "$SVG_SRC").png"
if [ -f "$QL_OUT" ]; then
    mv "$QL_OUT" "$MASTER_PNG"
    echo "    Master PNG (qlmanage): 1024x1024"
else
    # 方法2: 使用 rsvg-convert（Homebrew 安装的 librsvg）
    if command -v rsvg-convert &>/dev/null; then
        rsvg-convert -w 1024 -h 1024 "$SVG_SRC" > "$MASTER_PNG"
        echo "    Master PNG (rsvg-convert): 1024x1024"
    else
        # 方法3: Python 程序化生成等效 F1 图标 PNG
        echo "    使用 Python 生成 F1 图标..."
        python3 << 'PYEOF'
import struct, zlib, math, os

def create_f1_icon(size):
    """生成红底圆角矩形 + 白色 F1 文字的 PNG"""
    pixels = bytearray()
    radius = size * 0.125
    bg_r, bg_g, bg_b = 255, 30, 0

    font_rects = []
    cx, cy = size / 2, size / 2
    scale = size / 512.0

    # "F" 字母的矩形组成
    fx = cx - 100 * scale
    fy = cy - 90 * scale
    fw = 40 * scale
    fh = 190 * scale
    font_rects.append((fx, fy, fw, fh))                         # F 竖线
    font_rects.append((fx, fy, 100 * scale, 35 * scale))        # F 上横
    font_rects.append((fx, fy + 75 * scale, 80 * scale, 35 * scale))  # F 中横

    # "1" 字形
    ox = cx + 30 * scale
    oy = cy - 90 * scale
    ow = 40 * scale
    oh = 190 * scale
    font_rects.append((ox, oy, ow, oh))                         # 1 竖线
    font_rects.append((ox - 30 * scale, oy, 30 * scale, 35 * scale))  # 1 顶部小横

    def in_rounded_rect(px, py, w, h, r):
        if px < r and py < r:
            return (px - r)**2 + (py - r)**2 <= r**2
        if px > w - r and py < r:
            return (px - (w - r))**2 + (py - r)**2 <= r**2
        if px < r and py > h - r:
            return (px - r)**2 + (py - (h - r))**2 <= r**2
        if px > w - r and py > h - r:
            return (px - (w - r))**2 + (py - (h - r))**2 <= r**2
        return 0 <= px <= w and 0 <= py <= h

    def in_text(px, py):
        for rx, ry, rw, rh in font_rects:
            if rx <= px <= rx + rw and ry <= py <= ry + rh:
                return True
        return False

    for y in range(size):
        pixels.append(0)  # filter byte
        for x in range(size):
            if in_rounded_rect(x, y, size, size, radius):
                if in_text(x, y):
                    pixels.extend([255, 255, 255, 255])
                else:
                    pixels.extend([bg_r, bg_g, bg_b, 255])
            else:
                pixels.extend([0, 0, 0, 0])

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(pixels))) + chunk(b'IEND', b'')

data = create_f1_icon(1024)
with open(os.environ.get('MASTER_PNG', 'build/icon_master_1024.png'), 'wb') as f:
    f.write(data)
print("    F1 图标 PNG 生成完成: 1024x1024")
PYEOF
    fi
fi

# 生成 iconset 所需的各尺寸
if [ -f "$MASTER_PNG" ]; then
    sizes=(16 32 64 128 256 512)
    for sz in "${sizes[@]}"; do
        sz2=$((sz * 2))
        sips -z $sz $sz "$MASTER_PNG" --out "$ICON_DIR/icon_${sz}x${sz}.png" >/dev/null 2>&1
        sips -z $sz2 $sz2 "$MASTER_PNG" --out "$ICON_DIR/icon_${sz}x${sz}@2x.png" >/dev/null 2>&1
    done

    iconutil -c icns "$ICON_DIR" -o "$APP_DIR/Contents/Resources/AppIcon.icns" && {
        sed -i '' 's|</dict>|    <key>CFBundleIconFile</key>\
    <string>AppIcon</string>\
</dict>|' "$APP_DIR/Contents/Info.plist"
        echo "    F1 应用图标 (.icns) 生成成功"
    } || echo "    iconutil 转换失败"
else
    echo "    警告: Master PNG 未生成，将使用默认图标"
fi

rm -f "$MASTER_PNG"

echo "==> 组装 DMG 内容..."
DMG_STAGING="$BUILD_DIR/dmg_staging"
mkdir -p "$DMG_STAGING"
cp -R "$APP_DIR" "$DMG_STAGING/"
ln -s /Applications "$DMG_STAGING/Applications"

echo "==> 创建 DMG 磁盘映像..."
hdiutil create \
    -volname "$DMG_NAME" \
    -srcfolder "$DMG_STAGING" \
    -ov \
    -format UDZO \
    "$BUILD_DIR/$DMG_NAME.dmg"

rm -rf "$DMG_STAGING" "$BUILD_DIR/AppIcon.iconset"

DMG_SIZE=$(du -h "$BUILD_DIR/$DMG_NAME.dmg" | cut -f1)
echo ""
echo "========================================="
echo "  DMG 打包完成!"
echo "  文件: $BUILD_DIR/$DMG_NAME.dmg"
echo "  大小: $DMG_SIZE"
echo "========================================="
