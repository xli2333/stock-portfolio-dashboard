// 文件检测模块 - 自动检测最新的CSV文件

class FileDetector {
    constructor() {
        this.baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        this.dataPath = 'data/current/';
        this.rootPath = './';
    }

    // 检测最新的CSV文件
    async detectLatestCSV() {
        try {
            // 策略1：尝试找到所有可用的CSV文件并按日期排序
            const allValidFiles = await this.findAllValidCSVFiles();
            if (allValidFiles.length > 0) {
                const latestFile = this.selectLatestFile(allValidFiles);
                console.log('通过日期排序找到最新文件:', latestFile.path);
                return latestFile.path;
            }
        } catch (error) {
            console.warn('智能检测策略失败，尝试备用方案:', error.message);
        }

        // 策略2：按时间顺序尝试可能的路径
        const possiblePaths = await this.generatePossiblePaths();
        for (const path of possiblePaths) {
            try {
                console.log('尝试路径:', path);
                const response = await fetch(path + '?t=' + Date.now());
                if (response.ok) {
                    console.log('找到文件:', path);
                    return path;
                }
            } catch (error) {
                console.log('路径无效:', path, error.message);
            }
        }

        throw new Error('未找到有效的CSV文件');
    }

    // 找到所有有效的CSV文件
    async findAllValidCSVFiles() {
        const allFiles = [];
        const basePaths = [this.dataPath, this.rootPath, ''];

        // 生成更广泛的日期范围（过去30天）
        const dateRange = this.generateDateRange(30);

        console.log('开始扫描所有可能的文件...');

        // 并发检测多个文件以提高速度
        const checkPromises = [];

        for (const basePath of basePaths) {
            for (const dateStr of dateRange) {
                const path = `${basePath}stockperformance-${dateStr}.csv`;
                checkPromises.push(this.checkFileWithMetadata(path, dateStr));
            }
        }

        // 等待所有检测完成
        const results = await Promise.allSettled(checkPromises);

        // 收集成功的结果
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                allFiles.push(result.value);
            }
        }

        console.log(`找到 ${allFiles.length} 个有效的CSV文件:`, allFiles.map(f => f.path));
        return allFiles;
    }

    // 检测文件并返回元数据
    async checkFileWithMetadata(path, dateStr) {
        try {
            const response = await fetch(path + '?t=' + Date.now());
            if (response.ok) {
                // 验证是否为有效的CSV
                const isValid = await this.validateCSV(path);
                if (isValid) {
                    return {
                        path: path,
                        dateStr: dateStr,
                        dateObj: this.parseDateString(dateStr),
                        lastModified: response.headers.get('last-modified'),
                        size: response.headers.get('content-length')
                    };
                }
            }
        } catch (error) {
            // 静默忽略错误
        }
        return null;
    }

    // 选择最新的文件
    selectLatestFile(files) {
        if (files.length === 0) return null;

        // 按日期排序（最新的在前）
        files.sort((a, b) => {
            // 先按解析的日期对象排序
            if (a.dateObj && b.dateObj) {
                return b.dateObj.getTime() - a.dateObj.getTime();
            }

            // 如果日期对象无效，按文件的last-modified排序
            if (a.lastModified && b.lastModified) {
                return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
            }

            // 最后按字符串比较
            return b.dateStr.localeCompare(a.dateStr);
        });

        console.log('文件排序结果:', files.map(f => `${f.path} (${f.dateStr})`));
        return files[0];
    }

    // 生成日期范围
    generateDateRange(days) {
        const dates = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            // 添加多种日期格式
            dates.push(
                this.formatDate(date, 'M.d'),    // 9.22
                this.formatDate(date, 'M.dd'),   // 9.22
                this.formatDate(date, 'MM.d'),   // 09.22
                this.formatDate(date, 'MM.dd')   // 09.22
            );
        }

        // 去重并返回
        return [...new Set(dates)];
    }

    // 解析日期字符串为Date对象
    parseDateString(dateStr) {
        try {
            // 处理 M.d 格式 (9.22)
            const parts = dateStr.split('.');
            if (parts.length === 2) {
                const month = parseInt(parts[0], 10);
                const day = parseInt(parts[1], 10);

                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const year = new Date().getFullYear();
                    return new Date(year, month - 1, day);
                }
            }
        } catch (error) {
            console.warn('解析日期失败:', dateStr, error);
        }
        return null;
    }

    // 生成可能的文件路径（备用策略）
    async generatePossiblePaths() {
        const today = new Date();
        const paths = [];

        // 生成过去7天的日期
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            const formats = [
                this.formatDate(date, 'M.d'),
                this.formatDate(date, 'M.dd'),
                this.formatDate(date, 'MM.d'),
                this.formatDate(date, 'MM.dd')
            ];

            const basePaths = [this.dataPath, this.rootPath, ''];

            for (const basePath of basePaths) {
                for (const dateFormat of formats) {
                    paths.push(`${basePath}stockperformance-${dateFormat}.csv`);
                }
            }
        }

        return paths;
    }

    // 格式化日期
    formatDate(date, format) {
        const month = date.getMonth() + 1;
        const day = date.getDate();

        switch (format) {
            case 'M.d':
                return `${month}.${day}`;
            case 'M.dd':
                return `${month}.${day.toString().padStart(2, '0')}`;
            case 'MM.d':
                return `${month.toString().padStart(2, '0')}.${day}`;
            case 'MM.dd':
                return `${month.toString().padStart(2, '0')}.${day.toString().padStart(2, '0')}`;
            default:
                return `${month}.${day}`;
        }
    }

    // 验证文件是否为有效的CSV
    async validateCSV(path) {
        try {
            const response = await fetch(path + '?t=' + Date.now());
            if (!response.ok) return false;

            const text = await response.text();
            // 检查是否包含预期的列标题
            return text.includes('代码') && text.includes('中文名') && text.includes('持仓数量');
        } catch (error) {
            return false;
        }
    }
}

// 全局文件检测器实例
const fileDetector = new FileDetector();