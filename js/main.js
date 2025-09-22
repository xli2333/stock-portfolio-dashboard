// 主要应用逻辑

class StockPortfolioApp {
    constructor() {
        this.data = null;
        this.isLoading = false;
    }

    // 初始化应用
    async init() {
        try {
            // 绑定事件
            this.bindEvents();

            // 加载数据
            await this.loadData();

            console.log('应用初始化完成');
        } catch (error) {
            handleError(error, '应用初始化失败');
        }
    }

    // 绑定事件监听器
    bindEvents() {
        // 窗口大小改变时重新渲染
        window.addEventListener('resize', debounce(() => {
            this.render();
        }, 300));

        // 页面可见性变化时刷新数据
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.loadData();
            }
        });
    }

    // 加载数据
    async loadData() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            showLoading();

            // 使用数据处理器加载CSV数据
            const data = await dataProcessor.loadCSVData();

            // 验证数据
            dataProcessor.validateData();

            // 计算派生指标
            dataProcessor.calculateDerivedMetrics();

            // 保存数据
            this.data = dataProcessor.getData();

            // 渲染界面
            this.render();

            // 更新最后更新时间
            this.updateLastRefreshTime();

            console.log('数据加载完成:', this.data);

        } catch (error) {
            handleError(error, '数据加载失败');
        } finally {
            this.isLoading = false;
            hideLoading();
        }
    }

    // 渲染界面
    render() {
        if (!this.data) return;

        try {
            this.renderOverview();
            this.renderHoldingsTable();
            this.updateMetadata();

            // 渲染所有图表
            setTimeout(() => {
                chartRenderer.renderAllCharts(this.data);
            }, 100);

            // 添加淡入动画
            document.querySelectorAll('section').forEach((section, index) => {
                setTimeout(() => {
                    addFadeInAnimation(section);
                }, index * 100);
            });

        } catch (error) {
            handleError(error, '界面渲染失败');
        }
    }

    // 渲染概览卡片
    renderOverview() {
        const summary = this.data.summary;
        const calculated = this.data.calculated || {};

        // 总资产 - 添加数值动画
        const totalAssetsEl = document.getElementById('totalAssets');
        if (totalAssetsEl) {
            const totalAssets = summary.totalAmount || calculated.totalMarketValue || 0;
            const currentValue = parseFloat(totalAssetsEl.textContent.replace(/[^0-9.-]/g, '')) || 0;
            animateValue(totalAssetsEl, currentValue, totalAssets, 1500, (value) => formatCurrency(value));
        }

        // 总收益率 - 添加动画和特效
        const totalReturnEl = document.getElementById('totalReturn');
        if (totalReturnEl) {
            const returnPct = summary.totalReturnPct || calculated.totalReturnPct || 0;
            const currentValue = parseFloat(totalReturnEl.textContent.replace('%', '')) || 0;
            animateValue(totalReturnEl, currentValue, returnPct, 1500, (value) => formatPercentage(value));
            totalReturnEl.className = 'card-value ' + getPnLClass(returnPct);

            // 如果收益率为正，添加脉冲效果
            if (returnPct > 0) {
                addPulseEffect(totalReturnEl);
            }
        }

        // 仓位占用
        const positionUsageEl = document.getElementById('positionUsage');
        if (positionUsageEl) {
            const usage = summary.positionUsage || 0;
            const currentValue = parseFloat(positionUsageEl.textContent.replace('%', '')) || 0;
            animateValue(positionUsageEl, currentValue, usage, 1500, (value) => formatPercentage(value));
        }

        // 当日盈亏 - 添加特殊效果
        const dailyPnLEl = document.getElementById('dailyPnL');
        if (dailyPnLEl) {
            const dailyPnL = summary.dailyPnL || calculated.dailyTotalPnL || 0;
            const currentValue = parseFloat(dailyPnLEl.textContent.replace(/[^0-9.-]/g, '')) || 0;
            animateValue(dailyPnLEl, currentValue, dailyPnL, 1500, (value) => formatCurrency(value));
            dailyPnLEl.className = 'card-value ' + getPnLClass(dailyPnL);

            // 如果当日盈利超过1000，添加特殊效果
            if (dailyPnL > 1000) {
                const cardElement = dailyPnLEl.closest('.card');
                if (cardElement) {
                    createParticleEffect(cardElement, {
                        count: 15,
                        colors: ['#10b981', '#059669', '#047857'],
                        duration: 2000
                    });
                }
            }
        }

        // 为所有卡片添加进入动画
        document.querySelectorAll('.card').forEach((card, index) => {
            addScaleInAnimation(card, index * 150);
        });
    }

    // 渲染持仓表格
    renderHoldingsTable() {
        const tbody = document.getElementById('holdingsBody');
        if (!tbody || !this.data.holdings) return;

        // 清空现有内容
        tbody.innerHTML = '';

        // 表格列配置
        const columns = [
            { key: 'symbol', type: 'text' },
            { key: 'nameZh', type: 'text' },
            { key: 'description', type: 'text' },
            { key: 'quantity', type: 'number' },
            { key: 'costPrice', type: 'currency' },
            { key: 'closePrice', type: 'currency' },
            { key: 'marketValue', type: 'currency' },
            { key: 'positionRatio', type: 'percentage' },
            { key: 'dailyPnL', type: 'pnl' },
            { key: 'totalPnL', type: 'pnl' }
        ];

        // 创建表格行
        this.data.holdings.forEach(holding => {
            const row = createTableRow(holding, columns);
            tbody.appendChild(row);
        });

        // 如果没有数据，显示空状态
        if (this.data.holdings.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="${columns.length}" style="text-align: center; padding: 2rem; color: #6c757d;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    暂无持仓数据
                </td>
            `;
            tbody.appendChild(emptyRow);
        }
    }


    // 更新元数据
    updateMetadata() {
        const metadata = this.data.metadata || {};

        // 更新数据日期
        const dataDateEl = document.getElementById('dataDate');
        if (dataDateEl) {
            const currentDate = metadata.currentDate || new Date().toISOString().split('T')[0];
            dataDateEl.textContent = formatDate(currentDate);
        }
    }

    // 更新最后刷新时间
    updateLastRefreshTime() {
        const lastUpdateEl = document.getElementById('lastUpdate');
        if (lastUpdateEl) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            lastUpdateEl.textContent = timeString;
        }
    }

    // 获取应用数据
    getData() {
        return this.data;
    }

    // 手动刷新数据
    async refresh() {
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            addShimmerEffect(refreshBtn);
        }

        try {
            await this.loadData();

            // 刷新成功反馈
            if (refreshBtn) {
                showSuccessFeedback(refreshBtn);
                setTimeout(() => {
                    refreshBtn.classList.remove('shimmer-effect');
                }, 1000);
            }
        } catch (error) {
            if (refreshBtn) {
                refreshBtn.classList.remove('shimmer-effect');
            }
            throw error;
        }
    }
}

// 全局应用实例
const app = new StockPortfolioApp();

// 全局函数，供HTML调用
async function loadData() {
    await app.refresh();
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 等待Chart.js加载完成
        await waitForChart();
        console.log('Chart.js加载完成');

        await app.init();

        // 绑定图表控制事件
        chartRenderer.bindChartControls();

        // 窗口大小改变时重新调整图表
        window.addEventListener('resize', debounce(() => {
            chartRenderer.resizeCharts();
        }, 300));

    } catch (error) {
        console.error('应用启动失败:', error);
        handleError(error, '应用启动失败，请刷新页面重试');
    }
});

// 错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    handleError(event.error, '系统错误');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
    handleError(event.reason, 'Promise错误');
});

// 导出全局变量供调试使用
window.app = app;
window.dataProcessor = dataProcessor;
window.chartRenderer = chartRenderer;