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

// 创建色轮
function createColorWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = -radius; x < radius; x++) {
        for (let y = -radius; y < radius; y++) {
            const dx = x / radius;
            const dy = y / radius;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= 1) {
                let hue = ((Math.atan2(dy, dx) / Math.PI * 180) + 360) % 360 / 360;
                let saturation = distance;
                let value = 1;

                const [r, g, b] = hsvToRgb(hue, saturation, value);
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(centerX + x, centerY + y, 1, 1);
            }
        }
    }

    // 添加中心白点渐变
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.15);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
}

// 更新颜色显示
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

// 色轮颜色选择
function updateColorFromWheel(e) {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;
    
    const distance = Math.sqrt(x*x + y*y);
    const maxDistance = rect.width / 2;
    
    if (distance <= maxDistance) {
        colorPickerHandle.style.left = `${e.clientX - rect.left}px`;
        colorPickerHandle.style.top = `${e.clientY - rect.top}px`;
        
        let angle = Math.atan2(-y, -x) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        
        const saturation = Math.min(distance / maxDistance, 1);
        const [r, g, b] = hsvToRgb(angle / 360, saturation, 1);
        
        currentRGB = { r, g, b };
        updateColor();
    }
}

// 控制面板拖动
controlPanel.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('toggle-button') || 
        e.target.classList.contains('color-wheel') ||
        e.target.type === 'range') return;
    
    isDragging = true;
    const rect = controlPanel.getBoundingClientRect();
    initialX = e.clientX - rect.left;
    initialY = e.clientY - rect.top;
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const x = e.clientX - initialX;
        const y = e.clientY - initialY;
        controlPanel.style.left = `${x}px`;
        controlPanel.style.top = `${y}px`;
        controlPanel.style.right = 'auto';
        controlPanel.style.bottom = 'auto';
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// 色轮事件监听
colorWheel.addEventListener('mousedown', (e) => {
    isPickingColor = true;
    updateColorFromWheel(e);
});

document.addEventListener('mousemove', (e) => {
    if (isPickingColor) {
        updateColorFromWheel(e);
    }
});

document.addEventListener('mouseup', () => {
    isPickingColor = false;
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

// 预设颜色点击
document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', () => {
        document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        
        const [r, g, b] = preset.dataset.color.split(',');
        currentRGB = { r: parseInt(r), g: parseInt(g), b: parseInt(b) };
        updateColor();
    });
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
        
        // 移除视频镜像效果
        videoPreview.style.transform = 'scaleX(1)';
        
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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    canvas.width = videoPreview.videoWidth;
    canvas.height = videoPreview.videoHeight;
    
    const ctx = canvas.getContext('2d');
    // 移除镜像翻转
    ctx.drawImage(videoPreview, 0, 0);
    
    if (isIOS) {
        // iOS设备使用新窗口显示
        const image = canvas.toDataURL('image/jpeg', 0.95);
        const newWindow = window.open();
        newWindow.document.write(`<img src="${image}" alt="photo">`);
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
    
    capturedPhoto.src = canvas.toDataURL('image/jpeg');
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

// 初始化色轮选择器位置（白色在中心）
colorPickerHandle.style.left = `${canvas.width / 2}px`;
colorPickerHandle.style.top = `${canvas.height / 2}px`; 
