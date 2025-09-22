// 数据处理模块

class DataProcessor {
    constructor() {
        this.data = null;
        this.csvPath = 'data/current/stockperformance-9.20.csv';
        this.currentFilePath = null;
    }

    // 加载CSV数据
    async loadCSVData(filePath = null) {
        try {
            let path = filePath;

            // 如果没有指定路径，尝试自动检测最新文件
            if (!path) {
                try {
                    path = await fileDetector.detectLatestCSV();
                    console.log('智能检测到最新文件:', path);
                    // 更新当前默认路径为检测到的最新文件
                    this.csvPath = path;
                } catch (error) {
                    console.warn('自动检测失败，使用默认路径:', error.message);
                    path = this.csvPath;
                }
            }

            // 添加时间戳防止缓存
            const cacheBuster = new Date().getTime();
            const urlWithCacheBuster = `${path}?t=${cacheBuster}`;

            console.log('正在加载:', urlWithCacheBuster);

            const response = await fetch(urlWithCacheBuster);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const csvText = await response.text();
            this.currentFilePath = path;
            return this.parseCSVData(csvText);
        } catch (error) {
            console.error('加载CSV数据失败:', error);
            throw error;
        }
    }

    // 解析CSV数据
    parseCSVData(csvText) {
        try {
            // 使用Papa Parse解析CSV
            const result = Papa.parse(csvText, {
                header: false,
                skipEmptyLines: true,
                encoding: 'UTF-8'
            });

            if (result.errors.length > 0) {
                console.warn('CSV解析警告:', result.errors);
            }

            const rows = result.data;
            if (rows.length === 0) {
                throw new Error('CSV文件为空');
            }

            // 解析数据结构
            const parsedData = this.extractDataFromRows(rows);
            this.data = parsedData;

            return parsedData;
        } catch (error) {
            console.error('解析CSV数据失败:', error);
            throw error;
        }
    }

    // 从CSV行中提取数据
    extractDataFromRows(rows) {
        const data = {
            holdings: [],
            summary: {},
            categories: {},
            metadata: {}
        };

        // 找到股票数据的起始和结束行
        let holdingsStart = -1;
        let holdingsEnd = -1;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row[0] && row[0].includes('代码')) {
                holdingsStart = i + 1;
            } else if (holdingsStart > -1 && (!row[0] || row[0].trim() === '')) {
                holdingsEnd = i;
                break;
            }
        }

        // 提取股票持仓数据
        if (holdingsStart > -1) {
            const endIndex = holdingsEnd > -1 ? holdingsEnd : rows.length;
            for (let i = holdingsStart; i < endIndex; i++) {
                const row = rows[i];
                if (row[0] && row[0].trim() !== '') {
                    const holding = this.parseHoldingRow(row);
                    if (holding) {
                        data.holdings.push(holding);
                    }
                }
            }
        }

        // 提取汇总信息
        data.summary = this.extractSummaryData(rows);

        // 提取分类信息
        data.categories = this.extractCategoryData(rows);

        // 提取元数据
        data.metadata = this.extractMetadata(rows);

        return data;
    }

    // 解析单个持仓行
    parseHoldingRow(row) {
        try {
            // 映射CSV列到对象属性
            const holding = {
                symbol: this.cleanValue(row[0]),
                nameZh: this.cleanValue(row[1]),
                description: this.cleanValue(row[2]),
                quantity: this.parseNumber(row[3]),
                costPrice: this.parseNumber(row[4]),
                closePrice: this.parseNumber(row[5]),
                marketValue: this.parseNumber(row[6]),
                positionRatio: this.parsePercentage(row[7]),
                prevClosePrice: this.parseNumber(row[8]),
                dailyPnL: this.parseNumber(row[9]),
                totalPnL: this.parseNumber(row[10])
            };

            // 验证必要字段
            if (!holding.symbol || holding.quantity === null) {
                return null;
            }

            return holding;
        } catch (error) {
            console.warn('解析持仓行失败:', row, error);
            return null;
        }
    }

    // 提取汇总数据
    extractSummaryData(rows) {
        const summary = {};

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const key = row[0];

            if (key && key.includes('总金额')) {
                summary.totalAmount = this.parseNumber(row[1]);
            } else if (key && key.includes('仓位')) {
                summary.positionUsage = this.parsePercentage(row[1]);
            } else if (key && key.includes('总盈亏') && !key.includes('（%）')) {
                summary.totalPnL = this.parseNumber(row[1]);
            } else if (key && key.includes('总盈亏（%）')) {
                summary.totalReturnPct = this.parsePercentage(row[1]);
            } else if (key && key.includes('当日盈亏')) {
                // 当日盈亏可能在第9列
                summary.dailyPnL = this.parseNumber(row[9]) || this.parseNumber(row[1]);
            }
        }

        // 如果在第15行找到单独的当日盈亏数据
        if (rows.length > 14) {
            const dailyPnLRow = rows[14]; // 第15行(0-based index 14)
            if (dailyPnLRow && dailyPnLRow[8] && dailyPnLRow[8].includes('当日盈亏')) {
                summary.dailyPnL = this.parseNumber(dailyPnLRow[9]);
            }
        }

        return summary;
    }

    // 提取分类数据
    extractCategoryData(rows) {
        const categories = {};

        // 寻找持仓占比部分
        let categoryStart = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] && rows[i][0].includes('持仓占比')) {
                categoryStart = i + 1;
                break;
            }
        }

        if (categoryStart > -1) {
            // 从持仓占比部分开始解析
            for (let i = categoryStart; i < rows.length; i++) {
                const row = rows[i];
                const key = row[0];

                if (!key || key.trim() === '') {
                    break; // 遇到空行停止
                }

                if (key.includes('今日日期') || key.includes('昨天日期')) {
                    break; // 遇到日期行停止
                }

                if (row[1] && this.isPercentage(row[1])) {
                    categories[key] = this.parsePercentage(row[1]);
                }
            }
        }

        // 如果没找到持仓占比部分，使用旧方法
        if (Object.keys(categories).length === 0) {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const key = row[0];

                if (key && row[1] && this.isPercentage(row[1])) {
                    // 跳过已知的汇总行
                    if (key.includes('总') || key.includes('仓位') || key.includes('日期')) {
                        continue;
                    }

                    categories[key] = this.parsePercentage(row[1]);
                }
            }
        }

        return categories;
    }

    // 提取元数据
    extractMetadata(rows) {
        const metadata = {};

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const key = row[0];

            if (key && key.includes('今日日期')) {
                metadata.currentDate = this.cleanValue(row[1]);
            } else if (key && key.includes('昨天日期')) {
                metadata.previousDate = this.cleanValue(row[1]);
            }
        }

        return metadata;
    }

    // 工具方法：清理值
    cleanValue(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim().replace(/^"|"$/g, '');
    }

    // 工具方法：解析数字
    parseNumber(value) {
        if (value === null || value === undefined || value === '') return null;

        // 移除逗号和引号
        const cleaned = String(value).replace(/[,"]/g, '').trim();
        const num = parseFloat(cleaned);

        return isNaN(num) ? null : num;
    }

    // 工具方法：解析百分比
    parsePercentage(value) {
        if (value === null || value === undefined || value === '') return null;

        const cleaned = String(value).replace(/[%,"]/g, '').trim();
        const num = parseFloat(cleaned);

        return isNaN(num) ? null : num;
    }

    // 工具方法：检查是否为百分比格式
    isPercentage(value) {
        if (!value) return false;
        return String(value).includes('%');
    }

    // 获取处理后的数据
    getData() {
        return this.data;
    }

    // 计算派生指标
    calculateDerivedMetrics() {
        if (!this.data || !this.data.holdings) return;

        const holdings = this.data.holdings;

        // 计算总市值
        const totalMarketValue = holdings.reduce((sum, holding) => {
            return sum + (holding.marketValue || 0);
        }, 0);

        // 计算总盈亏
        const totalPnL = holdings.reduce((sum, holding) => {
            return sum + (holding.totalPnL || 0);
        }, 0);

        // 计算当日总盈亏
        const dailyTotalPnL = holdings.reduce((sum, holding) => {
            return sum + (holding.dailyPnL || 0);
        }, 0);

        // 更新汇总数据
        this.data.calculated = {
            totalMarketValue,
            totalPnL,
            dailyTotalPnL,
            totalReturnPct: totalMarketValue > 0 ? (totalPnL / (totalMarketValue - totalPnL)) * 100 : 0
        };
    }

    // 验证数据完整性
    validateData() {
        if (!this.data) {
            throw new Error('没有数据可验证');
        }

        if (!Array.isArray(this.data.holdings) || this.data.holdings.length === 0) {
            throw new Error('没有找到有效的持仓数据');
        }

        // 检查关键字段
        const requiredFields = ['symbol', 'quantity', 'marketValue'];
        for (const holding of this.data.holdings) {
            for (const field of requiredFields) {
                if (holding[field] === null || holding[field] === undefined) {
                    console.warn(`持仓 ${holding.symbol} 缺少字段: ${field}`);
                }
            }
        }

        return true;
    }
}

// 全局数据处理器实例
const dataProcessor = new DataProcessor();