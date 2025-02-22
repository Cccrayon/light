// 初始化变量
const colorWheel = document.getElementById('colorWheel');
const colorPickerHandle = document.getElementById('colorPickerHandle');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue = document.getElementById('brightnessValue');
const colorDisplay = document.getElementById('colorDisplay');
const colorPreview = document.getElementById('colorPreview');
const controlPanel = document.getElementById('controlPanel');
const toggleButton = document.getElementById('togglePanel');

// 相机相关变量
const openCameraBtn = document.getElementById('openCamera');
const cameraContainer = document.getElementById('cameraContainer');
const closeCamera = document.getElementById('closeCamera');
const videoPreview = document.getElementById('videoPreview');
const takePhotoBtn = document.getElementById('takePhoto');
const capturedPhoto = document.getElementById('capturedPhoto');
let stream = null;

// 状态变量
let currentRGB = { r: 255, g: 255, b: 255 };
let currentBrightness = 100;
let isPickingColor = false;
let isDragging = false;
let isCameraDragging = false;
let initialX, initialY;
let cameraDragX, cameraDragY;

// 创建色轮
const canvas = document.createElement('canvas');
canvas.width = 160;
canvas.height = 160;
colorWheel.appendChild(canvas);

// HSV 到 RGB 转换函数
function hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}

// 添加 RGB 转 HSV 的函数
function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = max === 0 ? 0 : diff / max;
    let v = max;

    if (diff !== 0) {
        switch (max) {
            case r:
                h = (g - b) / diff + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / diff + 2;
                break;
            case b:
                h = (r - g) / diff + 4;
                break;
        }
        h /= 6;
    }

    return { h: h * 360, s, v };
}

// 修改色轮创建函数
function createColorWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const radius = canvas.width / 2;
    const centerX = radius;
    const centerY = radius;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 使用渐变来创建更平滑的色轮
    for (let angle = 0; angle < 360; angle += 0.5) {
        const startAngle = (angle - 0.5) * Math.PI / 180;
        const endAngle = (angle + 0.5) * Math.PI / 180;

        for (let dist = 0; dist <= radius; dist++) {
            const saturation = dist / radius;
            const hue = angle / 360;
            const [r, g, b] = hsvToRgb(hue, saturation, 1);
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, dist, startAngle, endAngle);
            ctx.strokeStyle = `rgb(${r},${g},${b})`;
            ctx.stroke();
        }
    }

    // 添加平滑的中心白点
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.15);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
}

// 修改预设颜色点击处理
document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', () => {
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        
        const [r, g, b] = preset.dataset.color.split(',');
        currentRGB = { r: parseInt(r), g: parseInt(g), b: parseInt(b) };
        
        // 获取颜色的 HSV 值并更新亮度
        const { h, s, v } = rgbToHsv(currentRGB.r, currentRGB.g, currentRGB.b);
        currentBrightness = Math.round(v * 100);
        brightnessSlider.value = currentBrightness;
        brightnessValue.textContent = `${currentBrightness}%`;
        
        // 更新色轮选择器位置
        updatePickerPosition(currentRGB.r, currentRGB.g, currentRGB.b);
        
        // 最后更新颜色显示
        updateColor();
    });
});

// 修改色轮交互函数
function handleColorWheelInteraction(e) {
    const rect = colorWheel.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;
    
    const distance = Math.sqrt(x*x + y*y);
    const maxDistance = rect.width / 2;
    
    if (distance <= maxDistance) {
        colorPickerHandle.style.left = `${clientX - rect.left}px`;
        colorPickerHandle.style.top = `${clientY - rect.top}px`;
        
        // 计算角度（0度在右侧，顺时针增加）
        let angle = Math.atan2(y, x) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        
        const saturation = Math.min(distance / maxDistance, 1);
        const [r, g, b] = hsvToRgb(angle / 360, saturation, 1);
        currentRGB = { r, g, b };
        updateColor();
    }
}

// 修改色轮的事件监听
colorWheel.addEventListener('mousedown', (e) => {
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastClickTime;
    
    if (timeDiff < DOUBLE_CLICK_DELAY) {
        // 双击处理
        e.preventDefault();
        e.stopPropagation();
        
        // 重置选择器位置到中心
        const wheelRect = colorWheel.getBoundingClientRect();
        const centerX = wheelRect.width / 2;
        const centerY = wheelRect.height / 2;
        
        requestAnimationFrame(() => {
            colorPickerHandle.style.left = `${centerX}px`;
            colorPickerHandle.style.top = `${centerY}px`;
            
            // 设置为白色
            currentRGB = { r: 255, g: 255, b: 255 };
            currentBrightness = 100;
            brightnessSlider.value = 100;
            updateColor();
            
            // 移除所有预设颜色的激活状态
            document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        });
        
        // 防止触发正常的颜色选择
        isPickingColor = false;
        return;
    }
    
    // 正常的颜色选择处理
    isPickingColor = true;
    handleColorWheelInteraction(e);
    
    lastClickTime = currentTime;
});

// 添加回 mousemove 和 mouseup 事件监听
document.addEventListener('mousemove', (e) => {
    if (isPickingColor) {
        e.preventDefault();
        handleColorWheelInteraction(e);
    }
});

document.addEventListener('mouseup', () => {
    isPickingColor = false;
});

// 修改色轮的触摸事件处理
colorWheel.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isPickingColor = true;
    handleColorWheelInteraction(e.touches[0]);
}, { passive: false });

colorWheel.addEventListener('touchmove', (e) => {
    if (isPickingColor) {
        e.preventDefault();
        handleColorWheelInteraction(e.touches[0]);
    }
}, { passive: false });

document.addEventListener('touchend', () => {
    isPickingColor = false;
});

// 添加亮度滑块的触摸支持
brightnessSlider.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = brightnessSlider.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = (x / rect.width) * 200;
    currentBrightness = Math.max(0, Math.min(200, percentage));
    brightnessSlider.value = currentBrightness;
    updateColor();
}, { passive: false });

brightnessSlider.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = brightnessSlider.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = (x / rect.width) * 200;
    currentBrightness = Math.max(0, Math.min(200, percentage));
    brightnessSlider.value = currentBrightness;
    updateColor();
}, { passive: false });

// 修改控制面板拖动逻辑
controlPanel.addEventListener('mousedown', (e) => {
    // 如果点击的是色轮区域或其他控制元素，不触发拖动
    if (e.target.closest('.color-wheel-container') || // 使用 closest 检查是否点击色轮区域
        e.target.classList.contains('toggle-button') || 
        e.target.classList.contains('color-preset') ||
        e.target.type === 'range' ||
        e.target.classList.contains('brightness-control')) {
        return;
    }
    
    isDragging = true;
    const rect = controlPanel.getBoundingClientRect();
    initialX = e.clientX - rect.left;
    initialY = e.clientY - rect.top;
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        e.preventDefault(); // 防止选中文本
        const x = e.clientX - initialX;
        const y = e.clientY - initialY;
        
        // 防止面板拖出屏幕
        const maxX = window.innerWidth - controlPanel.offsetWidth;
        const maxY = window.innerHeight - controlPanel.offsetHeight;
        
        controlPanel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        controlPanel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        controlPanel.style.right = 'auto';
        controlPanel.style.bottom = 'auto';
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// 亮度调节
brightnessSlider.addEventListener('input', () => {
    currentBrightness = brightnessSlider.value;
    updateColor();
});

brightnessSlider.addEventListener('dblclick', () => {
    currentBrightness = 100;
    brightnessSlider.value = 100;
    updateColor();
});

// 面板展开/收起
toggleButton.addEventListener('click', () => {
    const isExpanded = controlPanel.classList.contains('expanded');
    controlPanel.classList.toggle('expanded');
    controlPanel.classList.toggle('collapsed');
    toggleButton.textContent = isExpanded ? '展开' : '收起';
});

// 相机功能
async function initCamera() {
    try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        const constraints = {
            video: {
                facingMode: isMobile ? "user" : "environment",
                width: { ideal: 1080 },
                height: { ideal: 1080 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;
        
        cameraContainer.style.display = 'block';
        
        if (!isMobile) {
            const x = (window.innerWidth - cameraContainer.offsetWidth) / 2;
            const y = (window.innerHeight - cameraContainer.offsetHeight) / 2;
            cameraContainer.style.left = `${x}px`;
            cameraContainer.style.top = `${y}px`;
        } else {
            cameraContainer.style.right = '15px';
            cameraContainer.style.top = '15px';
            cameraContainer.style.left = 'auto';
        }
    } catch (err) {
        console.error('相机访问失败:', err);
        alert('无法访问相机，请确保已授予相机访问权限。');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    videoPreview.srcObject = null;
    cameraContainer.style.display = 'none';
}

function takePhoto() {
    const canvas = document.createElement('canvas');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    canvas.width = videoPreview.videoWidth;
    canvas.height = videoPreview.videoHeight;
    
    const ctx = canvas.getContext('2d');
    
    // 先重置任何可能的变换
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // 在非移动设备上，总是进行镜像处理
    if (!isMobile) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }
    // 在移动设备上保持原样
    
    ctx.drawImage(videoPreview, 0, 0);
    
    // 重置变换以确保后续操作不受影响
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // 生成正确方向的照片数据
    const photoData = canvas.toDataURL('image/jpeg', 0.95);
    
    if (isMobile) {
        // 移动设备使用新窗口显示
        const newWindow = window.open();
        newWindow.document.write(`<img src="${photoData}" alt="photo">`);
        newWindow.document.write('<div style="text-align:center;margin-top:20px;">长按图片保存到相册</div>');
    } else {
        // 其他设备直接下载
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `photo_${new Date().getTime()}.jpg`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);
    }
    
    // 预览拍摄的照片
    capturedPhoto.src = photoData;
    capturedPhoto.style.transform = 'scaleX(1)';
    videoPreview.style.display = 'none';
    capturedPhoto.style.display = 'block';
    
    setTimeout(() => {
        capturedPhoto.style.display = 'none';
        videoPreview.style.display = 'block';
    }, 3000);
}

// 相机拖动
cameraContainer.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('camera-header')) {
        isCameraDragging = true;
        const rect = cameraContainer.getBoundingClientRect();
        cameraDragX = e.clientX - rect.left;
        cameraDragY = e.clientY - rect.top;
    }
});

document.addEventListener('mousemove', (e) => {
    if (isCameraDragging) {
        const x = e.clientX - cameraDragX;
        const y = e.clientY - cameraDragY;
        cameraContainer.style.left = `${x}px`;
        cameraContainer.style.top = `${y}px`;
        cameraContainer.style.right = 'auto';
    }
});

document.addEventListener('mouseup', () => {
    isCameraDragging = false;
});

// 相机触摸支持
cameraContainer.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('camera-header')) {
        isCameraDragging = true;
        const rect = cameraContainer.getBoundingClientRect();
        cameraDragX = e.touches[0].clientX - rect.left;
        cameraDragY = e.touches[0].clientY - rect.top;
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (isCameraDragging) {
        e.preventDefault();
        const x = e.touches[0].clientX - cameraDragX;
        const y = e.touches[0].clientY - cameraDragY;
        cameraContainer.style.left = `${x}px`;
        cameraContainer.style.top = `${y}px`;
        cameraContainer.style.right = 'auto';
    }
}, { passive: false });

document.addEventListener('touchend', () => {
    isCameraDragging = false;
});

// 事件监听
openCameraBtn.addEventListener('click', initCamera);
closeCamera.addEventListener('click', stopCamera);
takePhotoBtn.addEventListener('click', takePhoto);

// 初始化
createColorWheel(canvas);
updateColor();

// 修改色轮选择器初始位置设置
function initColorPicker() {
    requestAnimationFrame(() => {
        const wheelRect = colorWheel.getBoundingClientRect();
        const centerX = wheelRect.width / 2;
        const centerY = wheelRect.height / 2;
        
        colorPickerHandle.style.left = `${centerX}px`;
        colorPickerHandle.style.top = `${centerY}px`;
    });
}

initColorPicker();

// 修改色轮双击事件处理
let lastClickTime = 0;
const DOUBLE_CLICK_DELAY = 100;

colorWheel.addEventListener('mousedown', (e) => {
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastClickTime;
    
    if (timeDiff < DOUBLE_CLICK_DELAY) {
        // 双击处理
        e.preventDefault();
        e.stopPropagation(); // 阻止事件冒泡
        
        // 重置选择器位置到中心
        const wheelRect = colorWheel.getBoundingClientRect();
        const centerX = wheelRect.width / 2;
        const centerY = wheelRect.height / 2;
        
        requestAnimationFrame(() => {
            colorPickerHandle.style.left = `${centerX}px`;
            colorPickerHandle.style.top = `${centerY}px`;
            
            // 设置为白色
            currentRGB = { r: 255, g: 255, b: 255 };
            currentBrightness = 100;
            brightnessSlider.value = 100;
            updateColor();
            
            // 移除所有预设颜色的激活状态
            document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        });
        
        // 防止触发正常的颜色选择
        isPickingColor = false;
        return;
    }
    
    // 正常的颜色选择处理
    isPickingColor = true;
    handleColorWheelInteraction(e);
    
    lastClickTime = currentTime;
});

// 移除原来的双击事件监听器
colorWheel.removeEventListener('dblclick', null);

// 修改更新色轮选择器位置的函数，移除重复的亮度更新
function updatePickerPosition(r, g, b) {
    const { h, s, v } = rgbToHsv(r, g, b);
    const wheelRect = colorWheel.getBoundingClientRect();
    const radius = wheelRect.width / 2;
    const centerX = radius;
    const centerY = radius;
    
    // 计算角度（0度在右侧，顺时针增加）
    const angleRad = (h * Math.PI) / 180;
    
    // 计算新位置，考虑明度的影响
    const distance = s * radius; // 饱和度决定离中心的距离
    const x = centerX + distance * Math.cos(angleRad);
    const y = centerY + distance * Math.sin(angleRad);
    
    colorPickerHandle.style.left = `${x}px`;
    colorPickerHandle.style.top = `${y}px`;
}

// 修改更新颜色显示函数
function updateColor() {
    const bright = currentBrightness / 100;
    
    if (bright <= 1) {
        colorDisplay.style.filter = `brightness(${bright})`;
    } else {
        const contrastValue = 1 + (bright - 1) * 0.5;
        const brightnessValue = 1 + (bright - 1) * 0.7;
        colorDisplay.style.filter = `contrast(${contrastValue}) brightness(${brightnessValue})`;
    }
    
    const { r, g, b } = currentRGB;
    colorDisplay.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    colorPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    brightnessValue.textContent = `${Math.round(currentBrightness)}%`;
} 
