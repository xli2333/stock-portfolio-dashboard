// 图表渲染模块

class ChartRenderer {
    constructor() {
        this.charts = {};
        this.isDarkTheme = true;
        this.defaultOptions = this.getDefaultOptions();
    }

    // 获取默认图表配置
    getDefaultOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#cbd5e1',
                        font: {
                            family: 'Inter',
                            size: 12
                        },
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    font: {
                        family: 'JetBrains Mono'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'JetBrains Mono',
                            size: 11
                        }
                    }
                }
            }
        };
    }

    // 渲染持仓分布饼图
    renderPositionChart(data, mode = 'position') {
        const ctx = document.getElementById('positionChart');
        if (!ctx) return;

        // 销毁现有图表
        if (this.charts.positionChart) {
            this.charts.positionChart.destroy();
        }

        let chartData, labels, values, title;

        if (mode === 'position' && data.categories && Object.keys(data.categories).length > 0) {
            // 使用分类数据
            const categories = Object.entries(data.categories).slice(0, 8);
            labels = categories.map(([key]) => key);
            values = categories.map(([, value]) => value);
            title = '投资分类占比';
        } else if (data.holdings && data.holdings.length > 0) {
            // 使用个股数据
            const holdings = data.holdings.slice(0, 10);
            labels = holdings.map(h => h.symbol);
            values = mode === 'position'
                ? holdings.map(h => h.positionRatio || 0)
                : holdings.map(h => h.marketValue || 0);
            title = mode === 'position' ? '个股持仓占比' : '个股市值分布';
        } else {
            // 没有数据时显示空状态
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
            return;
        }

        // 生成渐变色
        const colors = this.generateGradientColors(labels.length);

        const config = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: '#0a0b0f',
                    borderWidth: 2,
                    hoverBorderWidth: 4,
                    hoverBorderColor: '#3b82f6'
                }]
            },
            options: {
                ...this.defaultOptions,
                cutout: '65%',
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: true,
                        text: title,
                        color: '#cbd5e1',
                        font: {
                            family: 'Inter',
                            size: 14,
                            weight: 600
                        },
                        padding: {
                            bottom: 20
                        }
                    },
                    legend: {
                        ...this.defaultOptions.plugins.legend,
                        position: 'right',
                        align: 'center'
                    },
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const label = context.label;
                                const formattedValue = mode === 'value'
                                    ? formatCurrency(value)
                                    : `${value.toFixed(1)}%`;
                                return `${label}: ${formattedValue}`;
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        };

        this.charts.positionChart = new Chart(ctx, config);
    }

    // 渲染收益表现柱状图
    renderPerformanceChart(data, mode = 'daily') {
        const ctx = document.getElementById('performanceChart');
        if (!ctx || !data.holdings) return;

        // 销毁现有图表
        if (this.charts.performanceChart) {
            this.charts.performanceChart.destroy();
        }

        const holdings = data.holdings
            .filter(h => {
                const value = mode === 'daily' ? h.dailyPnL : h.totalPnL;
                return value !== null && value !== undefined;
            })
            .sort((a, b) => {
                const aValue = mode === 'daily' ? (a.dailyPnL || 0) : (a.totalPnL || 0);
                const bValue = mode === 'daily' ? (b.dailyPnL || 0) : (b.totalPnL || 0);
                return Math.abs(bValue) - Math.abs(aValue);
            });

        const labels = holdings.map(h => h.symbol);
        const values = holdings.map(h => mode === 'daily' ? (h.dailyPnL || 0) : (h.totalPnL || 0));

        // 根据正负值设置颜色
        const colors = values.map(value => {
            if (value > 0) return 'rgba(16, 185, 129, 0.8)';
            if (value < 0) return 'rgba(239, 68, 68, 0.8)';
            return 'rgba(100, 116, 139, 0.8)';
        });

        const borderColors = values.map(value => {
            if (value > 0) return '#10b981';
            if (value < 0) return '#ef4444';
            return '#64748b';
        });

        const config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: mode === 'daily' ? '当日盈亏' : '总盈亏',
                    data: values,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    ...this.defaultOptions.scales,
                    y: {
                        ...this.defaultOptions.scales.y,
                        beginAtZero: true,
                        ticks: {
                            ...this.defaultOptions.scales.y.ticks,
                            callback: function(value) {
                                return formatCurrency(value, '¥');
                            }
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        display: false
                    },
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const symbol = context.label;
                                const holding = holdings.find(h => h.symbol === symbol);
                                return `${symbol}: ${formatCurrency(value)}`;
                            },
                            afterLabel: (context) => {
                                const symbol = context.label;
                                const holding = holdings.find(h => h.symbol === symbol);
                                if (holding) {
                                    return `${holding.nameZh || ''}`;
                                }
                                return '';
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart',
                    delay: (context) => context.dataIndex * 100
                }
            }
        };

        this.charts.performanceChart = new Chart(ctx, config);
    }

    // 渲染分类统计雷达图
    renderCategoryChart(data) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx || !data.categories) return;

        // 销毁现有图表
        if (this.charts.categoryChart) {
            this.charts.categoryChart.destroy();
        }

        const categories = Object.entries(data.categories)
            .filter(([key, value]) => value !== null && value !== undefined)
            .slice(0, 8); // 最多显示8个分类

        if (categories.length === 0) return;

        const labels = categories.map(([key]) => key);
        const values = categories.map(([, value]) => value);

        const config = {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '分类占比',
                    data: values,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#1e40af',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#60a5fa',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                return `${context.label}: ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: Math.max(...values) * 1.2,
                        grid: {
                            color: 'rgba(148, 163, 184, 0.2)'
                        },
                        angleLines: {
                            color: 'rgba(148, 163, 184, 0.2)'
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                family: 'JetBrains Mono',
                                size: 10
                            },
                            callback: function(value) {
                                return value.toFixed(0) + '%';
                            }
                        },
                        pointLabels: {
                            color: '#cbd5e1',
                            font: {
                                family: 'Inter',
                                size: 11,
                                weight: 500
                            }
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            }
        };

        this.charts.categoryChart = new Chart(ctx, config);
    }

    // 渲染股票热力图
    renderStockHeatmap(data) {
        const container = document.getElementById('stockHeatmap');
        if (!container) return;

        container.innerHTML = '';

        if (!data.holdings || data.holdings.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fas fa-chart-area" style="font-size: 3rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i>
                    <p style="font-size: 1.1rem; margin: 0;">暂无持仓数据</p>
                </div>
            `;
            return;
        }

        const holdings = data.holdings
            .filter(h => h.dailyPnL !== null && h.dailyPnL !== undefined)
            .sort((a, b) => Math.abs(b.dailyPnL || 0) - Math.abs(a.dailyPnL || 0));

        if (holdings.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #64748b;">
                    <i class="fas fa-chart-area" style="font-size: 3rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i>
                    <p style="font-size: 1.1rem; margin: 0;">暂无盈亏数据</p>
                </div>
            `;
            return;
        }

        holdings.forEach((holding, index) => {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';

            const dailyPnL = holding.dailyPnL || 0;
            const totalPnL = holding.totalPnL || 0;

            // 使用总盈亏确定主色调，日盈亏确定强度
            const maxPnL = Math.max(...holdings.map(h => Math.abs(h.dailyPnL || 0)));
            const intensity = maxPnL > 0 ? Math.min(Math.abs(dailyPnL) / maxPnL, 1) : 0.5;

            // 根据盈亏设置颜色
            let backgroundColor;
            if (dailyPnL > 0) {
                backgroundColor = `rgba(16, 185, 129, ${0.3 + intensity * 0.7})`;
            } else if (dailyPnL < 0) {
                backgroundColor = `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
            } else {
                backgroundColor = 'rgba(100, 116, 139, 0.5)';
            }

            cell.style.backgroundColor = backgroundColor;

            // 计算收益率
            const returnPct = holding.marketValue && holding.totalPnL
                ? ((holding.totalPnL / (holding.marketValue - holding.totalPnL)) * 100).toFixed(1)
                : '0.0';

            cell.innerHTML = `
                <div class="symbol" style="font-weight: 700; margin-bottom: 4px;">${holding.symbol}</div>
                <div class="change" style="font-size: 0.85rem; margin-bottom: 2px;">${formatCurrency(dailyPnL)}</div>
                <div class="return" style="font-size: 0.75rem; opacity: 0.8;">${returnPct}%</div>
            `;

            // 添加工具提示
            cell.title = `${holding.symbol} - ${holding.nameZh || ''}
当日盈亏: ${formatCurrency(dailyPnL)}
总盈亏: ${formatCurrency(totalPnL)}
持仓市值: ${formatCurrency(holding.marketValue)}`;

            // 添加点击事件
            cell.addEventListener('click', () => {
                this.showStockDetail(holding);
            });

            // 添加悬停效果
            cell.addEventListener('mouseenter', () => {
                cell.style.transform = 'scale(1.05)';
                cell.style.zIndex = '10';
                cell.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
            });

            cell.addEventListener('mouseleave', () => {
                cell.style.transform = 'scale(1)';
                cell.style.zIndex = '1';
                cell.style.boxShadow = 'none';
            });

            // 添加进入动画
            cell.style.opacity = '0';
            cell.style.transform = 'scale(0.8)';
            cell.style.transition = 'all 0.3s ease';

            setTimeout(() => {
                cell.style.opacity = '1';
                cell.style.transform = 'scale(1)';
            }, index * 50);

            container.appendChild(cell);
        });
    }

    // 显示股票详情弹窗
    showStockDetail(holding) {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'stock-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--bg-card);
            border-radius: 16px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            border: 1px solid var(--border-primary);
            box-shadow: var(--shadow-xl);
        `;

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="color: var(--text-primary); font-size: 1.5rem; margin: 0;">
                    ${holding.symbol} - ${holding.nameZh || ''}
                </h3>
                <button class="close-btn" style="
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 50%;
                    transition: all 0.3s ease;
                " onmouseover="this.style.color='var(--text-primary)'" onmouseout="this.style.color='var(--text-muted)'">×</button>
            </div>
            <div style="color: var(--text-secondary); line-height: 1.8;">
                <p><strong>简介:</strong> ${holding.description || '暂无'}</p>
                <p><strong>持仓数量:</strong> ${formatNumber(holding.quantity)}</p>
                <p><strong>成本价:</strong> ${formatCurrency(holding.costPrice, '$')}</p>
                <p><strong>收盘价:</strong> ${formatCurrency(holding.closePrice, '$')}</p>
                <p><strong>持仓市值:</strong> ${formatCurrency(holding.marketValue)}</p>
                <p><strong>持仓占比:</strong> ${formatPercentage(holding.positionRatio)}</p>
                <p><strong>当日盈亏:</strong> <span class="${getPnLClass(holding.dailyPnL)}">${formatCurrency(holding.dailyPnL)}</span></p>
                <p><strong>总盈亏:</strong> <span class="${getPnLClass(holding.totalPnL)}">${formatCurrency(holding.totalPnL)}</span></p>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // 绑定关闭事件
        const closeBtn = content.querySelector('.close-btn');
        const closeModal = () => {
            modal.style.opacity = '0';
            setTimeout(() => document.body.removeChild(modal), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // 添加进入动画
        modal.style.opacity = '0';
        setTimeout(() => modal.style.opacity = '1', 10);
        modal.style.transition = 'opacity 0.3s ease';
    }

    // 生成渐变色数组
    generateGradientColors(count) {
        const colors = [
            '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
            '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316'
        ];

        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }

    // 绑定图表控制事件
    bindChartControls() {
        // 持仓分布图表控制
        const positionControls = document.querySelectorAll('[data-chart="position"], [data-chart="value"]');
        positionControls.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.chart;
                const data = window.app?.getData();
                if (data) {
                    // 更新按钮状态
                    positionControls.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    // 重新渲染图表
                    this.renderPositionChart(data, mode);
                }
            });
        });

        // 收益表现图表控制
        const performanceControls = document.querySelectorAll('[data-chart="daily"], [data-chart="total"]');
        performanceControls.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.chart;
                const data = window.app?.getData();
                if (data) {
                    // 更新按钮状态
                    performanceControls.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    // 重新渲染图表
                    this.renderPerformanceChart(data, mode);
                }
            });
        });
    }

    // 渲染所有图表
    renderAllCharts(data) {
        if (!data) return;

        try {
            this.renderPositionChart(data, 'position');
            this.renderPerformanceChart(data, 'daily');
            this.renderStockHeatmap(data);
        } catch (error) {
            console.error('渲染图表失败:', error);
        }
    }

    // 销毁所有图表
    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    // 响应式更新
    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
}

// 全局图表渲染器实例
const chartRenderer = new ChartRenderer();