// 初始化变量
const colorWheel = document.getElementById('colorWheel');
const colorPickerHandle = document.getElementById('colorPickerHandle');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue = document.getElementById('brightnessValue');
const colorDisplay = document.getElementById('colorDisplay');
const colorPreview = document.getElementById('colorPreview');
const controlPanel = document.querySelector('.control-panel');
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

// 色轮控制点相关变量
let isHandleDragging = false;
let handleInitialX, handleInitialY;

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
    const width = canvas.width;
    const height = canvas.height;
    const radius = Math.min(width, height) / 2;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

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

// 色轮交互函数
function handleColorWheelInteraction(e) {
    const rect = colorWheel.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;
    
    const distance = Math.sqrt(x*x + y*y);
    const maxDistance = rect.width / 2;
    
    if (distance <= maxDistance) {
        colorPickerHandle.style.left = `${clientX - rect.left}px`;
        colorPickerHandle.style.top = `${clientY - rect.top}px`;
        
        let angle = Math.atan2(y, x) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        const saturation = Math.min(distance / maxDistance, 1);
        
        const [r, g, b] = hsvToRgb(angle / 360, saturation, 1);
        currentRGB = { r, g, b };
        updateColor();
        
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
    }
}

// 删除所有现有的色轮事件监听器
colorWheel.removeEventListener('mousedown', null);
colorWheel.removeEventListener('dblclick', null);
document.removeEventListener('mousemove', null);
document.removeEventListener('mouseup', null);

// 色轮鼠标事件
colorWheel.addEventListener('mousedown', function(e) {
    e.preventDefault();
    isPickingColor = true;
    handleColorWheelInteraction(e);
});

document.addEventListener('mousemove', function(e) {
    if (isPickingColor) {
        e.preventDefault();
        handleColorWheelInteraction(e);
    }
});

document.addEventListener('mouseup', function() {
    isPickingColor = false;
});

// 色轮触摸事件
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

// 预设颜色点击处理
document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', () => {
        // 清除其他预设颜色的选中状态
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        
        // 更新颜色
        const [r, g, b] = preset.dataset.color.split(',');
        currentRGB = { r: parseInt(r), g: parseInt(g), b: parseInt(b) };
        
        // 获取 HSV 值并更新亮度
        const { h, s, v } = rgbToHsv(currentRGB.r, currentRGB.g, currentRGB.b);
        currentBrightness = Math.round(v * 100);
        brightnessSlider.value = currentBrightness;
        
        // 更新色轮选择器位置
        updatePickerPosition(currentRGB.r, currentRGB.g, currentRGB.b);
        updateColor();
    });
});

// 修改色轮选择器初始位置设置
function initColorPicker() {
    const wheelRect = colorWheel.getBoundingClientRect();
    const centerX = wheelRect.width / 2;
    const centerY = wheelRect.height / 2;
    
    colorPickerHandle.style.left = `${centerX}px`;
    colorPickerHandle.style.top = `${centerY}px`;
    
    // 设置画布大小与容器相同
    canvas.width = wheelRect.width;
    canvas.height = wheelRect.height;
    createColorWheel(canvas);
}

// 初始化
createColorWheel(canvas);
updateColor();
initColorPicker();

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
    const { r, g, b } = currentRGB;
    
    // 更新背景色
    colorDisplay.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    colorPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    
    // 更新亮度
    if (bright <= 1) {
        colorDisplay.style.filter = `brightness(${bright})`;
    } else {
        const contrastValue = 1 + (bright - 1) * 0.5;
        const brightnessValue = 1 + (bright - 1) * 0.7;
        colorDisplay.style.filter = `contrast(${contrastValue}) brightness(${brightnessValue})`;
    }
    
    // 更新亮度显示
    brightnessValue.textContent = `${Math.round(currentBrightness)}%`;
}

// 相机功能
async function initCamera() {
    try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        
        const constraints = {
            video: {
                facingMode: isMobile ? "user" : "environment",
                width: { ideal: 1080 },
                height: { ideal: 1080 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;
        
        // 所有移动设备上的前置摄像头都需要镜像预览
        if (isMobile) {
            videoPreview.style.transform = 'scaleX(-1)';
        }
        
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
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    
    canvas.width = videoPreview.videoWidth;
    canvas.height = videoPreview.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // 直接绘制，不做镜像处理
    ctx.drawImage(videoPreview, 0, 0);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.95);
    
    if (isMobile) {
        const newWindow = window.open();
        newWindow.document.write(`<img src="${photoData}" alt="photo">`);
        newWindow.document.write('<div style="text-align:center;margin-top:20px;">长按图片保存到相册</div>');
    } else {
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `photo_${new Date().getTime()}.jpg`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.95);
    }
    
    // 预览拍摄的照片，不需要镜像
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

// 删除现有的亮度滑块事件监听器
brightnessSlider.removeEventListener('input', null);
brightnessSlider.removeEventListener('change', null);

// 亮度滑块事件处理
brightnessSlider.addEventListener('input', function(e) {
    e.preventDefault();
    currentBrightness = parseInt(this.value);
    brightnessValue.textContent = `${currentBrightness}%`;
    updateColor();
});

// 修改色轮控制点的事件处理
colorPickerHandle.addEventListener('mousedown', function(e) {
    e.preventDefault();
    e.stopPropagation();
    isHandleDragging = true;
});

document.addEventListener('mousemove', function(e) {
    if (isHandleDragging) {
        e.preventDefault();
        handleColorWheelInteraction(e);
    }
});

document.addEventListener('mouseup', function() {
    isHandleDragging = false;
});

// 触摸支持
colorPickerHandle.addEventListener('touchstart', function(e) {
    e.preventDefault();
    e.stopPropagation();
    isHandleDragging = true;
}, { passive: false });

document.addEventListener('touchmove', function(e) {
    if (isHandleDragging) {
        e.preventDefault();
        handleColorWheelInteraction(e.touches[0]);
    }
}, { passive: false });

document.addEventListener('touchend', function() {
    isHandleDragging = false;
});

// 添加面板拖动功能
const panelHeader = document.querySelector('.panel-header');

let xOffset = 0;
let yOffset = 0;

function dragStart(e) {
    if (e.type === "touchstart") {
        initialX = e.touches[0].clientX - xOffset;
        initialY = e.touches[0].clientY - yOffset;
    } else {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
    }

    if (e.target === panelHeader) {
        isDragging = true;
    }
}

function dragEnd() {
    isDragging = false;
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        
        if (e.type === "touchmove") {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }

        xOffset = currentX;
        yOffset = currentY;

        // 确保面板不会超出视窗
        const rect = controlPanel.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        
        xOffset = Math.min(Math.max(0, xOffset), maxX);
        yOffset = Math.min(Math.max(0, yOffset), maxY);

        setTranslate(xOffset, yOffset, controlPanel);
    }
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
}

// 添加事件监听器
panelHeader.addEventListener("touchstart", dragStart, { passive: false });
document.addEventListener("touchend", dragEnd);
document.addEventListener("touchmove", drag, { passive: false });

panelHeader.addEventListener("mousedown", dragStart);
document.addEventListener("mouseup", dragEnd);
document.addEventListener("mousemove", drag);

// 修改面板切换按钮的处理
toggleButton.addEventListener('click', function() {
    const panel = document.querySelector('.control-panel');
    const controlsContainer = panel.querySelector('.controls-container');
    
    if (controlsContainer.style.display === 'none') {
        // 展开面板
        controlsContainer.style.display = 'block';
        this.textContent = '收起';
    } else {
        // 收起面板
        controlsContainer.style.display = 'none';
        this.textContent = '展开';
    }
}); 
