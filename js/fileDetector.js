// 文件检测模块 - 自动检测最新的CSV文件

class FileDetector {
    constructor() {
        this.baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        this.dataPath = 'data/current/';
        this.rootPath = './';
    }

    // 检测最新的CSV文件
    async detectLatestCSV() {
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

    // 生成可能的文件路径
    async generatePossiblePaths() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const paths = [];

        // 尝试不同的日期格式和路径
        const dates = [
            this.formatDate(today, 'M.d'),      // 9.22
            this.formatDate(yesterday, 'M.d'),   // 9.21
            this.formatDate(today, 'M.dd'),     // 9.22
            this.formatDate(yesterday, 'M.dd'),  // 9.21
            '9.19' // 当前已知的文件
        ];

        const basePaths = [
            this.dataPath,  // data/current/
            this.rootPath,  // ./
            ''              // 根目录
        ];

        // 生成所有可能的组合
        for (const basePath of basePaths) {
            for (const date of dates) {
                paths.push(`${basePath}stockperformance-${date}.csv`);
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