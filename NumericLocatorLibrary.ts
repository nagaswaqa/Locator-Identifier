// Reusable XPath Numeric Locator Library
// For Playwright, Selenium, and Cypress

// ============================================================
// XPATH PATTERN GENERATORS
// ============================================================

/**
 * Generate XPath patterns for numeric value matching
 * @class XPathBuilder
 */
export class XPathBuilder {
    
    /**
     * Exact numeric match
     * @param {string} numericValue - The exact numeric value to match
     * @returns {string} XPath expression
     */
    static exactNumeric(numericValue: string): string {
        return `//*[normalize-space(text()) = '${numericValue}']`;
    }
    
    /**
     * Text starting with numeric value
     * @param {string} prefix - Numeric prefix (e.g., '2024')
     * @returns {string} XPath expression
     */
    static startsWithNumeric(prefix: string): string {
        return `//*[starts-with(text(), '${prefix}')]`;
    }
    
    /**
     * Text ending with numeric value
     * @param {string} suffix - Numeric suffix (e.g., '2024')
     * @returns {string} XPath expression
     */
    static endsWithNumeric(suffix: string): string {
        return `//*[substring(text(), string-length(text()) - ${suffix.length - 1}) = '${suffix}']`;
    }
    
    /**
     * Text containing numeric substring
     * @param {string} numericValue - Numeric substring to find
     * @returns {string} XPath expression
     */
    static containsNumeric(numericValue: string): string {
        return `//*[contains(text(), '${numericValue}')]`;
    }
    
    /**
     * Text with specific date pattern (YYYY-MM-DD)
     * @returns {string} XPath expression
     */
    static datePattern(): string {
        return `//*[matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]`;
    }
    
    /**
     * Text with specific timestamp pattern (HH:MM:SS)
     * @returns {string} XPath expression
     */
    static timePattern(): string {
        return `//*[matches(text(), '[0-2][0-9]:[0-5][0-9]:[0-5][0-9]')]`;
    }
    
    /**
     * Text with currency format ($X,XXX.XX)
     * @returns {string} XPath expression
     */
    static currencyPattern(): string {
        return `//*[matches(text(), '\\$[0-9,]+\\.[0-9]{2}')]`;
    }
    
    /**
     * Text with percentage format (XX.XX%)
     * @returns {string} XPath expression
     */
    static percentagePattern(): string {
        return `//*[matches(text(), '[0-9]{1,3}(\\.[0-9]{1,2})?%')]`;
    }
    
    /**
     * Text with code pattern (CODE-YYYY-NNNNN)
     * @param {string} codePrefix - The prefix (e.g., 'ORD', 'INV')
     * @returns {string} XPath expression
     */
    static codePattern(codePrefix: string): string {
        return `//*[matches(text(), '${codePrefix}-[0-9]+-[0-9]+')]`;
    }
    
    /**
     * Combined: element with class and numeric content
     * @param {string} className - CSS class name
     * @param {string} numericValue - Numeric value to match
     * @returns {string} XPath expression
     */
    static classAndNumeric(className: string, numericValue: string): string {
        return `//*[@class='${className}'][contains(text(), '${numericValue}')]`;
    }
    
    /**
     * ag-Grid row with numeric cell content
     * @param {string} numericValue - Cell content
     * @returns {string} XPath expression
     */
    static agGridCell(numericValue: string): string {
        return `//div[@role='row']//div[@role='gridcell'][text() = '${numericValue}']`;
    }
    
    /**
     * ag-Grid row containing numeric value
     * @param {string} numericValue - Value in row
     * @returns {string} XPath expression
     */
    static agGridRowContaining(numericValue: string): string {
        return `//div[@role='row'][.//div[@role='gridcell'][contains(text(), '${numericValue}')]]`;
    }
    
    /**
     * DevExpress table row with numeric value
     * @param {string} numericValue - Row content
     * @returns {string} XPath expression
     */
    static devExpressRow(numericValue: string): string {
        return `//table[@class='dx-datagrid-table']//tr[.//td[contains(text(), '${numericValue}')]]`;
    }
    
    /**
     * Nexus component with numeric ID
     * @param {string} numericId - Component ID containing number
     * @returns {string} XPath expression
     */
    static nexusComponent(numericId: string): string {
        return `//*[@data-component-id][contains(@data-component-id, '${numericId}')]`;
    }
    
    /**
     * Any numeric value (4+ digits)
     * @returns {string} XPath expression
     */
    static anyLargeNumber(): string {
        return `//*[matches(text(), '[0-9]{4,}')]`;
    }
}

// ============================================================
// IFRAME LOCATOR MANAGER
// ============================================================

/**
 * Manage iframe context switching and locating
 * @class IFrameLocator
 */
export class IFrameLocator {
    
    /**
     * Switch to iframe and find element (Selenium)
     * @param {WebDriver} driver - Selenium WebDriver instance
     * @param {string} frameSelector - Frame ID or CSS selector
     * @param {string} xpathExpression - XPath to find element
     * @returns {WebElement} Found element
     */
    static seleniumFindInFrame(
        driver: any,
        frameSelector: string,
        xpathExpression: string
    ): any {
        try {
            // Switch to frame
            driver.switchTo().frame(frameSelector);
            
            // Find element
            const element = driver.findElement({ xpath: xpathExpression });
            
            // Return to main content
            driver.switchTo().defaultContent();
            
            return element;
        } catch (error) {
            driver.switchTo().defaultContent();
            throw new Error(`Failed to find element in frame: ${error.message}`);
        }
    }
    
    /**
     * Find all numeric values in frame (Selenium)
     * @param {WebDriver} driver - Selenium WebDriver instance
     * @param {string} frameId - Frame ID
     * @param {string} numericValue - Numeric value to find
     * @returns {WebElement[]} Found elements
     */
    static seleniumFindAllInFrame(
        driver: any,
        frameId: string,
        numericValue: string
    ): any[] {
        driver.switchTo().frame(frameId);
        const xpath = XPathBuilder.containsNumeric(numericValue);
        const elements = driver.findElements({ xpath });
        driver.switchTo().defaultContent();
        
        return elements;
    }
    
    /**
     * Switch to nested iframes and find element (Selenium)
     * @param {WebDriver} driver - Selenium WebDriver instance
     * @param {string[]} frameIds - Array of frame IDs (outer to inner)
     * @param {string} xpathExpression - XPath to find element
     * @returns {WebElement} Found element
     */
    static seleniumFindInNestedFrames(
        driver: any,
        frameIds: string[],
        xpathExpression: string
    ): any {
        try {
            // Switch through frames
            for (const frameId of frameIds) {
                driver.switchTo().frame(frameId);
            }
            
            // Find element
            const element = driver.findElement({ xpath: xpathExpression });
            
            // Return to default content
            driver.switchTo().defaultContent();
            
            return element;
        } catch (error) {
            driver.switchTo().defaultContent();
            throw error;
        }
    }
    
    /**
     * Find element in frame and extract numeric data (Playwright)
     * @param {Page} page - Playwright Page
     * @param {string} frameSelector - Frame selector
     * @param {string} xpathExpression - XPath expression
     * @returns {Promise<string>} Text content
     */
    static async playwrightFindInFrame(
        page: any,
        frameSelector: string,
        xpathExpression: string
    ): Promise<string> {
        try {
            const frameHandle = await page.$(frameSelector);
            if (!frameHandle) {
                throw new Error(`Frame not found: ${frameSelector}`);
            }
            
            const frame = await frameHandle.contentFrame();
            const element = await frame.$(`xpath=${xpathExpression}`);
            
            if (!element) {
                throw new Error(`Element not found with XPath: ${xpathExpression}`);
            }
            
            return await element.textContent();
        } catch (error) {
            console.error('Playwright iframe search failed:', error);
            throw error;
        }
    }
    
    /**
     * Wait for numeric value in frame (Playwright)
     * @param {Page} page - Playwright Page
     * @param {string} frameId - Frame ID
     * @param {string} numericValue - Value to wait for
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<boolean>} True if found
     */
    static async playwrightWaitForNumericInFrame(
        page: any,
        frameId: string,
        numericValue: string,
        timeoutMs: number = 5000
    ): Promise<boolean> {
        try {
            const frameHandle = await page.$(`iframe#${frameId}`);
            const frame = await frameHandle.contentFrame();
            
            const xpath = XPathBuilder.containsNumeric(numericValue);
            await frame.waitForSelector(`xpath=${xpath}`, { timeout: timeoutMs });
            
            return true;
        } catch (error) {
            console.warn(`Numeric value ${numericValue} not found in frame within timeout`);
            return false;
        }
    }
}

// ============================================================
// NUMERIC DATA EXTRACTOR
// ============================================================

/**
 * Extract and classify numeric data from elements
 * @class NumericExtractor
 */
export class NumericExtractor {
    
    /**
     * Classify text value by numeric pattern
     * @param {string} text - Text to classify
     * @returns {string} Classification type
     */
    static classifyNumericType(text: string): string {
        const trimmed = text.trim();
        
        // Pure numeric ID
        if (/^\d+$/.test(trimmed)) {
            return 'numeric_id';
        }
        
        // Date format YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
            return 'date';
        }
        
        // Time format HH:MM:SS
        if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) {
            return 'time';
        }
        
        // Currency format
        if (/^\$[\d,]+\.\d{2}/.test(trimmed)) {
            return 'currency';
        }
        
        // Percentage
        if (/^\d{1,3}(\.\d{1,2})?%$/.test(trimmed)) {
            return 'percentage';
        }
        
        // Code pattern (e.g., ORD-2024-12345)
        if (/^[A-Z]+-\d+-\d+$/.test(trimmed)) {
            return 'code';
        }
        
        // Contains numeric
        if (/\d+/.test(trimmed)) {
            return 'contains_numeric';
        }
        
        return 'text';
    }
    
    /**
     * Extract numeric portion from text
     * @param {string} text - Text containing numeric value
     * @returns {string|null} Extracted numeric value
     */
    static extractNumeric(text: string): string | null {
        const match = text.match(/\d+/);
        return match ? match[0] : null;
    }
    
    /**
     * Extract date from text (YYYY-MM-DD format)
     * @param {string} text - Text containing date
     * @returns {string|null} Extracted date
     */
    static extractDate(text: string): string | null {
        const match = text.match(/(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : null;
    }
    
    /**
     * Extract time from text (HH:MM:SS format)
     * @param {string} text - Text containing time
     * @returns {string|null} Extracted time
     */
    static extractTime(text: string): string | null {
        const match = text.match(/(\d{2}:\d{2}:\d{2})/);
        return match ? match[1] : null;
    }
    
    /**
     * Extract currency amount from text
     * @param {string} text - Text containing currency
     * @returns {number|null} Extracted amount as number
     */
    static extractCurrency(text: string): number | null {
        const match = text.match(/\$?([\d,]+\.\d{2})/);
        if (match) {
            return parseFloat(match[1].replace(/,/g, ''));
        }
        return null;
    }
    
    /**
     * Extract percentage value from text
     * @param {string} text - Text containing percentage
     * @returns {number|null} Percentage as number (0-100)
     */
    static extractPercentage(text: string): number | null {
        const match = text.match(/(\d{1,3}(?:\.\d{1,2})?)/);
        if (match) {
            return parseFloat(match[1]);
        }
        return null;
    }
    
    /**
     * Validate numeric pattern
     * @param {string} value - Value to validate
     * @param {string} type - Type to validate against
     * @returns {boolean} True if valid
     */
    static isValidNumericPattern(value: string, type: string): boolean {
        const patterns: Record<string, RegExp> = {
            numeric_id: /^\d+$/,
            date: /^\d{4}-\d{2}-\d{2}$/,
            time: /^\d{2}:\d{2}:\d{2}$/,
            currency: /^\$[\d,]+\.\d{2}$/,
            percentage: /^\d{1,3}(\.\d{1,2})?%$/,
            code: /^[A-Z]+-\d+-\d+$/,
            timestamp: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
        };
        
        const pattern = patterns[type];
        return pattern ? pattern.test(value.trim()) : false;
    }
}

// ============================================================
// GRID DATA EXTRACTOR
// ============================================================

/**
 * Extract data from grid components (ag-Grid, DevExpress)
 * @class GridExtractor
 */
export class GridExtractor {
    
    /**
     * Extract row data from ag-Grid by numeric ID (Playwright)
     * @param {Frame} frame - Playwright frame
     * @param {string} numericId - Numeric ID to find
     * @returns {Promise<Record<string, string>>} Row data
     */
    static async agGridRowByNumericId(
        frame: any,
        numericId: string
    ): Promise<Record<string, string>> {
        const rowXPath = XPathBuilder.agGridRowContaining(numericId);
        const row = await frame.$(rowXPath);
        
        if (!row) {
            throw new Error(`Row with ID ${numericId} not found`);
        }
        
        // Get all cells in row
        const cells = await row.$$('[role="gridcell"]');
        const rowData: Record<string, string> = {};
        
        for (let i = 0; i < cells.length; i++) {
            const text = await cells[i].textContent();
            const normalizedText = text.trim();
            const type = NumericExtractor.classifyNumericType(normalizedText);
            
            rowData[`col_${i}_${type}`] = normalizedText;
        }
        
        return rowData;
    }
    
    /**
     * Extract all rows containing numeric pattern (Playwright)
     * @param {Frame} frame - Playwright frame
     * @param {string} numericPattern - Pattern to search
     * @returns {Promise<Record<string, string>[]>} Array of row data
     */
    static async agGridRowsByPattern(
        frame: any,
        numericPattern: string
    ): Promise<Record<string, string>[]> {
        const rowXPath = `//div[@role='row'][.//div[@role='gridcell'][contains(text(), '${numericPattern}')]]`;
        const rows = await frame.$$(rowXPath);
        
        const results = [];
        
        for (const row of rows) {
            const cells = await row.$$('[role="gridcell"]');
            const rowData: Record<string, string> = {};
            
            for (let i = 0; i < cells.length; i++) {
                const text = await cells[i].textContent();
                rowData[`col_${i}`] = text.trim();
            }
            
            results.push(rowData);
        }
        
        return results;
    }
    
    /**
     * Extract DevExpress table row by numeric value (Selenium)
     * @param {WebDriver} driver - Selenium WebDriver
     * @param {string} frameId - Frame ID
     * @param {string} numericValue - Value to find
     * @returns {Record<string, string>} Row data
     */
    static devExpressRowBySingleNumeric(
        driver: any,
        frameId: string,
        numericValue: string
    ): Record<string, string> {
        driver.switchTo().frame(frameId);
        
        const rowXPath = XPathBuilder.devExpressRow(numericValue);
        const row = driver.findElement({ xpath: rowXPath });
        
        const cells = row.findElements({ xpath: './/td' });
        const rowData: Record<string, string> = {};
        
        cells.forEach((cell, index) => {
            const text = cell.getText();
            const type = NumericExtractor.classifyNumericType(text);
            rowData[`col_${index}_${type}`] = text;
        });
        
        driver.switchTo().defaultContent();
        
        return rowData;
    }
    
    /**
     * Filter grid rows by numeric criteria (Playwright)
     * @param {Frame} frame - Playwright frame
     * @param {number} minValue - Minimum numeric value
     * @param {number} maxValue - Maximum numeric value
     * @returns {Promise<Record<string, string>[]>} Filtered rows
     */
    static async agGridFilterByNumericRange(
        frame: any,
        minValue: number,
        maxValue: number
    ): Promise<Record<string, string>[]> {
        const rows = await frame.$$('div[role="row"]');
        const results = [];
        
        for (const row of rows) {
            const cells = await row.$$('div[role="gridcell"]');
            
            for (const cell of cells) {
                const text = await cell.textContent();
                const numeric = NumericExtractor.extractNumeric(text);
                
                if (numeric) {
                    const value = parseInt(numeric, 10);
                    if (value >= minValue && value <= maxValue) {
                        const rowData = {};
                        const allCells = await row.$$('div[role="gridcell"]');
                        
                        for (let i = 0; i < allCells.length; i++) {
                            const cellText = await allCells[i].textContent();
                            rowData[`col_${i}`] = cellText.trim();
                        }
                        
                        results.push(rowData);
                        break;
                    }
                }
            }
        }
        
        return results;
    }
}

// ============================================================
// WAIT/RETRY STRATEGIES
// ============================================================

/**
 * Retry and wait strategies for numeric locators
 * @class NumericWait
 */
export class NumericWait {
    
    /**
     * Retry finding element with numeric value (Playwright)
     * @param {Page} page - Playwright Page
     * @param {string} frameId - Frame ID
     * @param {string} numericValue - Value to find
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} delayMs - Delay between retries
     * @returns {Promise<string>} Found text content
     */
    static async playwriteFindWithRetry(
        page: any,
        frameId: string,
        numericValue: string,
        maxRetries: number = 3,
        delayMs: number = 500
    ): Promise<string> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const frameHandle = await page.$(`iframe#${frameId}`);
                if (!frameHandle) {
                    throw new Error('Frame not found');
                }
                
                const frame = await frameHandle.contentFrame();
                const xpath = XPathBuilder.containsNumeric(numericValue);
                const element = await frame.$(xpath);
                
                if (element) {
                    const text = await element.textContent();
                    if (text.includes(numericValue)) {
                        console.log(`✓ Found on attempt ${attempt}`);
                        return text.trim();
                    }
                }
            } catch (error) {
                console.log(`✗ Attempt ${attempt} failed: ${error.message}`);
                
                if (attempt < maxRetries) {
                    await page.waitForTimeout(delayMs);
                }
            }
        }
        
        throw new Error(`Failed to find ${numericValue} after ${maxRetries} attempts`);
    }
    
    /**
     * Wait for numeric value to change (Playwright)
     * @param {Page} page - Playwright Page
     * @param {string} frameId - Frame ID
     * @param {string} currentValue - Current value
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<string>} New value
     */
    static async playwrightWaitForNumericChange(
        page: any,
        frameId: string,
        currentValue: string,
        timeoutMs: number = 10000
    ): Promise<string> {
        const startTime = Date.now();
        const checkIntervalMs = 250;
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const frameHandle = await page.$(`iframe#${frameId}`);
                const frame = await frameHandle.contentFrame();
                
                // Find any element with numeric content
                const xpath = XPathBuilder.anyLargeNumber();
                const elements = await frame.$$(xpath);
                
                for (const element of elements) {
                    const text = await element.textContent();
                    if (text.trim() !== currentValue && /\d+/.test(text)) {
                        console.log(`✓ Value changed from ${currentValue} to ${text.trim()}`);
                        return text.trim();
                    }
                }
            } catch (error) {
                // Continue waiting
            }
            
            await page.waitForTimeout(checkIntervalMs);
        }
        
        throw new Error(`Numeric value did not change within ${timeoutMs}ms`);
    }
    
    /**
     * Wait for multiple numeric values to appear (Playwright)
     * @param {Page} page - Playwright Page
     * @param {string} frameId - Frame ID
     * @param {string[]} numericValues - Values to wait for
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise<string[]>} Found values
     */
    static async playwrightWaitForMultipleNumeric(
        page: any,
        frameId: string,
        numericValues: string[],
        timeoutMs: number = 5000
    ): Promise<string[]> {
        const foundValues: string[] = [];
        const startTime = Date.now();
        
        while (foundValues.length < numericValues.length && Date.now() - startTime < timeoutMs) {
            try {
                const frameHandle = await page.$(`iframe#${frameId}`);
                const frame = await frameHandle.contentFrame();
                
                for (const value of numericValues) {
                    if (!foundValues.includes(value)) {
                        const xpath = XPathBuilder.containsNumeric(value);
                        const element = await frame.$(xpath);
                        
                        if (element) {
                            const text = await element.textContent();
                            if (text.includes(value)) {
                                foundValues.push(value);
                                console.log(`✓ Found: ${value}`);
                            }
                        }
                    }
                }
            } catch (error) {
                // Continue waiting
            }
            
            await page.waitForTimeout(250);
        }
        
        if (foundValues.length === numericValues.length) {
            return foundValues;
        }
        
        throw new Error(`Only found ${foundValues.length}/${numericValues.length} values`);
    }
}

// ============================================================
// EXPORT ALL
// ============================================================

export {
    XPathBuilder,
    IFrameLocator,
    NumericExtractor,
    GridExtractor,
    NumericWait
};
