// 工具函数库

// 格式化数字为货币格式
function formatCurrency(value, currency = '¥') {
    if (value === null || value === undefined || value === '') return '--';
    const num = parseFloat(value);
    if (isNaN(num)) return '--';
    return currency + num.toLocaleString('zh-CN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

// 格式化百分比
function formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined || value === '') return '--';
    const num = parseFloat(value);
    if (isNaN(num)) return '--';
    return num.toFixed(decimals) + '%';
}

// 格式化数字
function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined || value === '') return '--';
    const num = parseFloat(value);
    if (isNaN(num)) return '--';
    return num.toLocaleString('zh-CN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
    });
}

// 获取正负值的CSS类
function getPnLClass(value) {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return 'neutral';
    return num > 0 ? 'positive' : 'negative';
}

// 日期格式化
function formatDate(dateString) {
    if (!dateString) return '--';
    try {
        // 处理 2025/9/19 格式
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return dateString;
    } catch (e) {
        return dateString;
    }
}

// 显示/隐藏加载覆盖层
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// 创建表格行
function createTableRow(data, columns) {
    const row = document.createElement('tr');

    columns.forEach(column => {
        const cell = document.createElement('td');
        let value = data[column.key] || '';

        // 根据列类型格式化数据
        switch (column.type) {
            case 'currency':
                value = formatCurrency(value);
                break;
            case 'percentage':
                value = formatPercentage(value);
                break;
            case 'number':
                value = formatNumber(value);
                break;
            case 'pnl':
                cell.className = getPnLClass(value);
                value = formatCurrency(value);
                break;
            default:
                break;
        }

        cell.textContent = value;
        if (column.className) {
            cell.className += ' ' + column.className;
        }

        row.appendChild(cell);
    });

    return row;
}


// 错误处理函数
function handleError(error, context = '') {
    console.error(`错误 ${context}:`, error);

    // 显示用户友好的错误信息
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    errorMessage.innerHTML = `
        <strong>加载失败</strong><br>
        ${context || '数据加载出现问题，请稍后重试'}
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            float: right;
            cursor: pointer;
            font-size: 16px;
            margin-top: -5px;
        ">&times;</button>
    `;

    document.body.appendChild(errorMessage);

    // 5秒后自动移除错误信息
    setTimeout(() => {
        if (errorMessage.parentElement) {
            errorMessage.remove();
        }
    }, 5000);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 检查是否为移动设备
function isMobile() {
    return window.innerWidth <= 768;
}

// 添加淡入动画
function addFadeInAnimation(element) {
    element.classList.add('fade-in');
}

// 添加各种动画效果
function addSlideInLeftAnimation(element, delay = 0) {
    setTimeout(() => {
        element.classList.add('slide-in-left');
    }, delay);
}

function addSlideInRightAnimation(element, delay = 0) {
    setTimeout(() => {
        element.classList.add('slide-in-right');
    }, delay);
}

function addScaleInAnimation(element, delay = 0) {
    setTimeout(() => {
        element.classList.add('scale-in');
    }, delay);
}

function addPulseEffect(element) {
    element.classList.add('pulse-effect');
}

function addBounceEffect(element) {
    element.classList.add('bounce-effect');
    setTimeout(() => {
        element.classList.remove('bounce-effect');
    }, 1000);
}

function addGlowEffect(element) {
    element.classList.add('glow-effect');
}

function addShimmerEffect(element) {
    element.classList.add('shimmer-effect');
}

function addFloatEffect(element) {
    element.classList.add('float-effect');
}

// 移除所有动画效果
function removeAllAnimations(element) {
    const animationClasses = [
        'fade-in', 'slide-in-left', 'slide-in-right', 'scale-in',
        'pulse-effect', 'bounce-effect', 'glow-effect', 'shimmer-effect', 'float-effect'
    ];
    animationClasses.forEach(cls => element.classList.remove(cls));
}

// 数值变化动画
function animateValue(element, start, end, duration = 1000, formatFn = null) {
    const startTime = performance.now();
    const range = end - start;

    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 使用easeOutQuart缓动函数
        const easedProgress = 1 - Math.pow(1 - progress, 4);
        const currentValue = start + (range * easedProgress);

        if (formatFn) {
            element.textContent = formatFn(currentValue);
        } else {
            element.textContent = Math.round(currentValue);
        }

        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }

    requestAnimationFrame(updateValue);
}

// 创建粒子效果
function createParticleEffect(container, options = {}) {
    const {
        count = 20,
        colors = ['#3b82f6', '#8b5cf6', '#06b6d4'],
        size = { min: 2, max: 6 },
        speed = { min: 0.5, max: 2 },
        duration = 3000
    } = options;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * (size.max - size.min) + size.min}px;
            height: ${Math.random() * (size.max - size.min) + size.min}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: 50%;
            pointer-events: none;
            opacity: 0.8;
            z-index: 1000;
        `;

        const startX = Math.random() * container.offsetWidth;
        const startY = Math.random() * container.offsetHeight;
        const endX = startX + (Math.random() - 0.5) * 200;
        const endY = startY - Math.random() * 100;

        particle.style.left = startX + 'px';
        particle.style.top = startY + 'px';

        container.appendChild(particle);

        // 动画
        particle.animate([
            {
                left: startX + 'px',
                top: startY + 'px',
                opacity: 0.8,
                transform: 'scale(1)'
            },
            {
                left: endX + 'px',
                top: endY + 'px',
                opacity: 0,
                transform: 'scale(0.5)'
            }
        ], {
            duration: duration,
            easing: 'ease-out'
        }).onfinish = () => {
            container.removeChild(particle);
        };
    }
}

// 添加成功反馈效果
function showSuccessFeedback(element) {
    addBounceEffect(element);
    addGlowEffect(element);

    setTimeout(() => {
        element.classList.remove('glow-effect');
    }, 2000);
}