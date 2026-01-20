// ============================================================
// PRACTICAL USAGE EXAMPLES
// Numeric XPath Locators for Complex Components
// ============================================================

import {
    XPathBuilder,
    IFrameLocator,
    NumericExtractor,
    GridExtractor,
    NumericWait
} from './NumericLocatorLibrary';

// ============================================================
// EXAMPLE 1: PLAYWRIGHT - AG-GRID WITH NUMERIC IDs
// ============================================================

export class PlaywrightAGGridExample {
    
    constructor(private page: any, private frameId: string = 'data-frame') {}
    
    /**
     * Find order by numeric ID and verify data
     */
    async findOrderById(orderId: string) {
        const frameHandle = await this.page.$(`iframe#${this.frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find cell with exact numeric ID
        const cellXPath = XPathBuilder.agGridCell(orderId);
        const cell = await frame.$(cellXPath);
        
        if (!cell) {
            throw new Error(`Order ${orderId} not found in ag-Grid`);
        }
        
        // Get parent row
        const rowXPath = `ancestor::div[@role='row']`;
        const row = await cell.$(rowXPath);
        
        // Extract row data
        const rowData = {};
        const cells = await row.$$('div[role="gridcell"]');
        
        for (let i = 0; i < cells.length; i++) {
            const text = await cells[i].textContent();
            const type = NumericExtractor.classifyNumericType(text);
            rowData[`column_${i}_${type}`] = text.trim();
        }
        
        console.log('Order data:', rowData);
        return rowData;
    }
    
    /**
     * Filter grid by date range (YYYY-MM-DD)
     */
    async findOrdersByDateRange(startDate: string, endDate: string) {
        const frameHandle = await this.page.$(`iframe#${this.frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find rows with dates in range
        const dateXPath = `//*[matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]`;
        const dateElements = await frame.$$(dateXPath);
        
        const results = [];
        
        for (const dateElement of dateElements) {
            const dateText = await dateElement.textContent();
            const date = dateText.trim();
            
            if (date >= startDate && date <= endDate) {
                // Get parent row
                const row = await dateElement.$('ancestor::div[@role="row"]');
                
                // Extract full row data
                const cells = await row.$$('div[role="gridcell"]');
                const rowData = [];
                
                for (const cell of cells) {
                    const text = await cell.textContent();
                    rowData.push(text.trim());
                }
                
                results.push({ date, data: rowData });
            }
        }
        
        console.log(`Found ${results.length} orders between ${startDate} and ${endDate}`);
        return results;
    }
    
    /**
     * Click on grid cell with specific numeric value
     */
    async clickRowWithNumericValue(numericValue: string) {
        const frameHandle = await this.page.$(`iframe#${this.frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find cell
        const xpath = XPathBuilder.containsNumeric(numericValue);
        const element = await frame.$(xpath);
        
        if (element) {
            await element.click();
            console.log(`Clicked element with value: ${numericValue}`);
            return true;
        }
        
        throw new Error(`Could not find element with value: ${numericValue}`);
    }
    
    /**
     * Extract numeric statistics from grid column
     */
    async analyzeNumericColumn(columnIndex: number) {
        const frameHandle = await this.page.$(`iframe#${this.frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Get all cells in column
        const xpath = `//div[@role='row']//div[@role='gridcell'][${columnIndex}]`;
        const cells = await frame.$$(xpath);
        
        const numbers: number[] = [];
        const texts: string[] = [];
        
        for (const cell of cells) {
            const text = await cell.textContent();
            texts.push(text.trim());
            
            const numeric = NumericExtractor.extractNumeric(text);
            if (numeric) {
                numbers.push(parseInt(numeric, 10));
            }
        }
        
        // Calculate statistics
        const stats = {
            total: numbers.length,
            sum: numbers.reduce((a, b) => a + b, 0),
            average: numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0,
            min: Math.min(...numbers),
            max: Math.max(...numbers),
            samples: texts.slice(0, 5)
        };
        
        console.log('Column statistics:', stats);
        return stats;
    }
}

// ============================================================
// EXAMPLE 2: SELENIUM - DEVEXPRESS TABLE WITH TIMESTAMPS
// ============================================================

export class SeleniumDevExpressExample {
    
    constructor(
        private driver: any,
        private frameId: string = 'table-frame'
    ) {}
    
    /**
     * Find table row with specific timestamp (HH:MM:SS)
     */
    findRowByTimestamp(timestamp: string) {
        this.driver.switchTo().frame(this.frameId);
        
        // Build XPath to find cell with timestamp
        const xpath = `//table[@class='dx-datagrid-table']//td[contains(text(), '${timestamp}')]`;
        const cell = this.driver.findElement({ xpath });
        
        // Get parent row
        const row = cell.findElement({ xpath: 'ancestor::tr' });
        
        // Extract all cells in row
        const cells = row.findElements({ xpath: './/td' });
        const rowData = {};
        
        cells.forEach((cell, index) => {
            const text = cell.getText();
            const type = NumericExtractor.classifyNumericType(text);
            rowData[`col_${index}_${type}`] = text;
        });
        
        this.driver.switchTo().defaultContent();
        
        console.log('Row found:', rowData);
        return rowData;
    }
    
    /**
     * Find all rows with date in today (YYYY-MM-DD)
     */
    findRowsByDate(targetDate: string) {
        this.driver.switchTo().frame(this.frameId);
        
        // Find all rows containing date
        const xpath = `//table[@class='dx-datagrid-table']//tr[.//td[contains(text(), '${targetDate}')]]`;
        const rows = this.driver.findElements({ xpath });
        
        const results = [];
        
        rows.forEach((row) => {
            const cells = row.findElements({ xpath: './/td' });
            const rowData = [];
            
            cells.forEach((cell) => {
                rowData.push(cell.getText());
            });
            
            results.push(rowData);
        });
        
        this.driver.switchTo().defaultContent();
        
        console.log(`Found ${results.length} rows for date: ${targetDate}`);
        return results;
    }
    
    /**
     * Sort by numeric column and verify order
     */
    sortAndVerifyNumericColumn(columnIndex: number) {
        this.driver.switchTo().frame(this.frameId);
        
        // Get header to click for sorting
        const headerXPath = `//table[@class='dx-datagrid-table-fixed']//thead//th[${columnIndex}]`;
        const header = this.driver.findElement({ xpath: headerXPath });
        header.click();
        
        // Wait for sort to complete
        this.driver.sleep(500);
        
        // Extract numeric values from sorted column
        const cellXPath = `//table[@class='dx-datagrid-table']//tbody//tr//td[${columnIndex}]`;
        const cells = this.driver.findElements({ xpath: cellXPath });
        
        const numbers = [];
        cells.forEach((cell) => {
            const text = cell.getText();
            const numeric = NumericExtractor.extractNumeric(text);
            if (numeric) {
                numbers.push(parseInt(numeric, 10));
            }
        });
        
        // Verify sorted order (ascending)
        let isSorted = true;
        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i] < numbers[i - 1]) {
                isSorted = false;
                break;
            }
        }
        
        this.driver.switchTo().defaultContent();
        
        console.log(`Column sorted: ${isSorted}`, numbers);
        return { isSorted, numbers };
    }
}

// ============================================================
// EXAMPLE 3: PLAYWRIGHT - NEXUS COMPONENTS WITH DATA ATTRIBUTES
// ============================================================

export class PlaywrightNexusExample {
    
    constructor(
        private page: any,
        private frameId: string = 'content-frame'
    ) {}
    
    /**
     * Find Nexus component by numeric data-component-id
     */
    async findComponentById(componentId: string) {
        const frameHandle = await this.page.$(`iframe#${this.frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find component with numeric ID
        const xpath = `//*[@data-component-id][contains(@data-component-id, '${componentId}')]`;
        const element = await frame.$(xpath);
        
        if (!element) {
            throw new Error(`Component ${componentId} not found`);
        }
        
        // Extract component info
        const componentData = await element.evaluate((el) => ({
            tagName: el.tagName,
            componentId: el.getAttribute('data-component-id'),
            text: el.textContent?.trim() || '',
            classes: el.className,
            dataAttributes: Array.from(el.attributes)
                .filter(attr => attr.name.startsWith('data-'))
                .reduce((acc, attr) => {
                    acc[attr.name] = attr.value;
                    return acc;
                }, {})
        }));
        
        console.log('Component found:', componentData);
        return componentData;
    }
    
    /**
     * Find Nexus grid row by numeric ID
     */
    async findGridRow(rowId: string) {
        const frameHandle = await this.page.$(`iframe#${this.frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find row with data-component-id containing numeric ID
        const rowXPath = `//*[@data-component-id][contains(@data-component-id, 'row-${rowId}')]`;
        const row = await frame.$(rowXPath);
        
        if (!row) {
            throw new Error(`Row ${rowId} not found`);
        }
        
        // Find all cells in row
        const cellXPath = `./*[@data-component-id][contains(@data-component-id, 'cell-')]`;
        const cells = await row.$$(cellXPath);
        
        const cellData = [];
        for (const cell of cells) {
            const cellInfo = await cell.evaluate((el) => ({
                id: el.getAttribute('data-component-id'),
                text: el.textContent?.trim() || '',
                type: el.getAttribute('data-type') || 'text'
            }));
            cellData.push(cellInfo);
        }
        
        console.log('Row data:', cellData);
        return cellData;
    }
    
    /**
     * Click Nexus button containing numeric code
     */
    async clickButtonWithCode(code: string) {
        const frameHandle = await this.page.$(`iframe#${this.frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find button containing numeric code
        const xpath = `//button[@data-component-id][contains(text(), '${code}')]`;
        const button = await frame.$(xpath);
        
        if (button) {
            await button.click();
            console.log(`Clicked button with code: ${code}`);
            return true;
        }
        
        throw new Error(`Button with code ${code} not found`);
    }
    
    /**
     * List all rows with numeric IDs matching pattern
     */
    async findRowsByPattern(pattern: RegExp) {
        const frameHandle = await this.page.$(`iframe#${this.frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find all row components
        const xpath = `//*[@data-component-id][contains(@data-component-id, 'row-')]`;
        const rows = await frame.$$(xpath);
        
        const results = [];
        
        for (const row of rows) {
            const componentId = await row.evaluate((el) => el.getAttribute('data-component-id'));
            
            if (pattern.test(componentId)) {
                // Extract row data
                const cells = await row.$$('*[data-component-id*="cell-"]');
                const cellData = [];
                
                for (const cell of cells) {
                    const text = await cell.evaluate((el) => el.textContent?.trim() || '');
                    cellData.push(text);
                }
                
                results.push({
                    rowId: componentId,
                    data: cellData
                });
            }
        }
        
        console.log(`Found ${results.length} matching rows`);
        return results;
    }
}

// ============================================================
// EXAMPLE 4: COMPLEX SCENARIO - MULTI-FRAME WITH RETRY
// ============================================================

export class ComplexMultiFrameExample {
    
    constructor(private page: any) {}
    
    /**
     * Complete workflow: Find order, verify date, get total
     */
    async processOrderWorkflow(orderId: string) {
        try {
            // Step 1: Switch to main data frame
            console.log(`\n=== Finding Order ${orderId} ===`);
            const mainFrameHandle = await this.page.$('iframe#main-content');
            const mainFrame = await mainFrameHandle.contentFrame();
            
            // Step 2: Find order by numeric ID with retry
            console.log('Step 1: Locating order...');
            const orderXPath = XPathBuilder.agGridCell(orderId);
            let orderCell = await mainFrame.$(orderXPath);
            
            if (!orderCell) {
                // Retry with contains instead of exact match
                const retryXPath = XPathBuilder.containsNumeric(orderId);
                orderCell = await mainFrame.$(retryXPath);
            }
            
            if (!orderCell) {
                throw new Error(`Order ${orderId} not found after retry`);
            }
            
            console.log('✓ Order located');
            
            // Step 3: Extract date (YYYY-MM-DD format)
            console.log('Step 2: Extracting order date...');
            const row = await orderCell.$('ancestor::div[@role="row"]');
            const dateXPath = `.//div[@role='gridcell'][matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]`;
            const dateCell = await row.$(dateXPath);
            const orderDate = await dateCell.textContent();
            
            console.log(`✓ Order date: ${orderDate}`);
            
            // Step 4: Switch to detail frame
            console.log('Step 3: Switching to detail frame...');
            const detailFrameHandle = await this.page.$('iframe#order-details');
            const detailFrame = await detailFrameHandle.contentFrame();
            
            // Step 5: Find total amount (currency format $X,XXX.XX)
            console.log('Step 4: Finding order total...');
            const totalXPath = `//*[matches(text(), '\\$[0-9,]+\\.[0-9]{2}')]`;
            const totalElement = await detailFrame.$(totalXPath);
            const totalText = await totalElement.textContent();
            const totalAmount = NumericExtractor.extractCurrency(totalText);
            
            console.log(`✓ Order total: ${totalText} (${totalAmount})`);
            
            // Step 6: Verify date is valid
            console.log('Step 5: Validating date...');
            const isValidDate = NumericExtractor.isValidNumericPattern(orderDate, 'date');
            
            if (!isValidDate) {
                throw new Error(`Invalid date format: ${orderDate}`);
            }
            
            console.log('✓ Date validated');
            
            // Step 7: Return results
            const result = {
                orderId,
                orderDate: orderDate.trim(),
                totalAmount,
                status: 'SUCCESS'
            };
            
            console.log('\n=== Order Processing Complete ===');
            console.log(result);
            
            return result;
            
        } catch (error) {
            console.error(`✗ Workflow failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Batch process multiple orders
     */
    async processMultipleOrders(orderIds: string[]) {
        const results = [];
        
        for (const orderId of orderIds) {
            try {
                const result = await this.processOrderWorkflow(orderId);
                results.push(result);
                
                // Wait between orders
                await this.page.waitForTimeout(1000);
                
            } catch (error) {
                console.error(`Failed to process order ${orderId}:`, error.message);
                results.push({
                    orderId,
                    status: 'FAILED',
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

// ============================================================
// EXAMPLE 5: ROBUST WAIT AND VALIDATION
// ============================================================

export class RobustWaitExample {
    
    constructor(private page: any) {}
    
    /**
     * Wait for numeric value with detailed logging
     */
    async waitForNumericValueWithLogging(
        frameId: string,
        numericValue: string,
        timeoutMs: number = 5000
    ) {
        console.log(`\n⏳ Waiting for value: ${numericValue} (timeout: ${timeoutMs}ms)`);
        
        const startTime = Date.now();
        const attempts = [];
        
        try {
            // Use PlaywrightNumericWait with retry
            const result = await NumericWait.playwriteFindWithRetry(
                this.page,
                frameId,
                numericValue,
                3,
                500
            );
            
            const duration = Date.now() - startTime;
            console.log(`✓ Found in ${duration}ms: ${result}`);
            
            return {
                found: true,
                value: result,
                duration,
                attempts: 3
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`✗ Not found after ${duration}ms: ${error.message}`);
            
            return {
                found: false,
                error: error.message,
                duration
            };
        }
    }
    
    /**
     * Wait for numeric value to change with tracking
     */
    async trackNumericValueChange(
        frameId: string,
        initialValue: string,
        timeoutMs: number = 10000
    ) {
        console.log(`\n📍 Tracking value change from: ${initialValue}`);
        
        try {
            const newValue = await NumericWait.playwrightWaitForNumericChange(
                this.page,
                frameId,
                initialValue,
                timeoutMs
            );
            
            console.log(`✓ Value changed to: ${newValue}`);
            
            return {
                changed: true,
                oldValue: initialValue,
                newValue,
                type: NumericExtractor.classifyNumericType(newValue)
            };
            
        } catch (error) {
            console.log(`✗ Value did not change: ${error.message}`);
            
            return {
                changed: false,
                error: error.message
            };
        }
    }
    
    /**
     * Wait for multiple numeric values with progress
     */
    async waitForMultipleValuesWithProgress(
        frameId: string,
        numericValues: string[],
        timeoutMs: number = 5000
    ) {
        console.log(`\n🔄 Waiting for ${numericValues.length} values: ${numericValues.join(', ')}`);
        
        try {
            const found = await NumericWait.playwrightWaitForMultipleNumeric(
                this.page,
                frameId,
                numericValues,
                timeoutMs
            );
            
            console.log(`✓ All ${found.length} values found: ${found.join(', ')}`);
            
            return {
                allFound: true,
                foundCount: found.length,
                totalCount: numericValues.length,
                values: found
            };
            
        } catch (error) {
            console.log(`✗ Not all values found: ${error.message}`);
            
            return {
                allFound: false,
                error: error.message
            };
        }
    }
}

// ============================================================
// USAGE ENTRY POINT
// ============================================================

export async function runExamples() {
    // Example 1: AG-Grid with Playwright
    console.log('=== Example 1: Playwright AG-Grid ===');
    // const agGridExample = new PlaywrightAGGridExample(page, 'data-frame');
    // await agGridExample.findOrderById('12345');
    // await agGridExample.findOrdersByDateRange('2024-01-01', '2024-01-31');
    
    // Example 2: DevExpress with Selenium
    // console.log('\n=== Example 2: Selenium DevExpress ===');
    // const devExpressExample = new SeleniumDevExpressExample(driver, 'table-frame');
    // devExpressExample.findRowByTimestamp('14:30:45');
    // devExpressExample.findRowsByDate('2024-01-15');
    
    // Example 3: Nexus components with Playwright
    // console.log('\n=== Example 3: Playwright Nexus ===');
    // const nexusExample = new PlaywrightNexusExample(page, 'content-frame');
    // await nexusExample.findComponentById('12345');
    // await nexusExample.findGridRow('row-12345');
    
    // Example 4: Complex multi-frame workflow
    // console.log('\n=== Example 4: Complex Workflow ===');
    // const complexExample = new ComplexMultiFrameExample(page);
    // await complexExample.processOrderWorkflow('12345');
    // await complexExample.processMultipleOrders(['12345', '67890', '11111']);
    
    // Example 5: Robust wait strategies
    // console.log('\n=== Example 5: Robust Wait ===');
    // const waitExample = new RobustWaitExample(page);
    // await waitExample.waitForNumericValueWithLogging('data-frame', '12345');
    // await waitExample.trackNumericValueChange('data-frame', '12345');
}
