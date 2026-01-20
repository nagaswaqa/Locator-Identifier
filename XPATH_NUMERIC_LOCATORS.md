# XPath Locators for Numeric Values in Complex Components

## Overview

This guide provides XPath patterns for reliably identifying elements containing numeric values (IDs, codes, timestamps, dates) in Angular/React applications with ag-Grid, Nexus, and DevExpress components, including those inside iframes.

**Key Focus**:
- Unique non-dynamic numeric values
- Numeric substrings in text nodes
- XPath functions: `starts-with()`, `contains()`, `ends-with()`
- Resilient to dynamic attributes
- Iframe handling strategies

---

## Table of Contents

1. [Basic XPath Patterns](#basic-xpath-patterns)
2. [Numeric Matching Strategies](#numeric-matching-strategies)
3. [Component-Specific Patterns](#component-specific-patterns)
4. [iFrame Context Switching](#iframe-context-switching)
5. [Code Examples](#code-examples)
6. [Testing Patterns](#testing-patterns)

---

## Basic XPath Patterns

### 1. Exact Numeric Match

```xpath
# Find element with exact text content
//*[text() = '12345']

# Find element where text contains ONLY the number
//*[normalize-space() = '12345']

# Case-insensitive numeric match
//*[translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz') = '12345']
```

**Example HTML**:
```html
<div id="order-id">12345</div>
<span class="code">12345</span>
```

**XPath**:
```xpath
//div[text() = '12345']
//*[@id='order-id'][text() = '12345']
//span[@class='code'][text() = '12345']
```

---

### 2. Text Starting with Number

```xpath
# Element text starts with specific number
//*[starts-with(text(), '2024')]

# Any element starting with digit
//*[starts-with(text(), '0') or starts-with(text(), '1') or ... starts-with(text(), '9')]

# Simplified: text starting with any digit
//*[matches(text(), '^[0-9]')]  # XPath 2.0+
```

**Example HTML**:
```html
<div class="timestamp">2024-01-15 14:30</div>
<p>2024 Annual Report</p>
```

**XPath**:
```xpath
//div[@class='timestamp'][starts-with(text(), '2024')]
//*[starts-with(text(), '2024')]
```

---

### 3. Text Ending with Number

```xpath
# Element text ends with specific number
//*[ends-with(text(), '2024')]

# Text ending with 4-digit year
//*[ends-with(text(), '2024')]

# Using substring to simulate ends-with (XPath 1.0)
//*[substring(text(), string-length(text()) - 3) = '2024']
```

**Example HTML**:
```html
<div class="report">Annual Report 2024</div>
<span>Fiscal Year: 2024</span>
```

**XPath**:
```xpath
//div[@class='report'][ends-with(text(), '2024')]
//*[substring(text(), string-length(text()) - 3) = '2024']
```

---

### 4. Text Containing Numeric Substring

```xpath
# Element containing a number anywhere in text
//*[contains(text(), '12345')]

# Case-insensitive contains
//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '12345')]

# Contains digit anywhere in text
//*[contains(text(), '0') or contains(text(), '1') or ... contains(text(), '9')]
```

**Example HTML**:
```html
<div class="id-field">Order: #12345 - Active</div>
<p>Code: 67890 (Standard)</p>
```

**XPath**:
```xpath
//*[contains(text(), '12345')]
//div[@class='id-field'][contains(text(), '#12345')]
//*[contains(text(), '67890')]
```

---

## Numeric Matching Strategies

### Pattern 1: Timestamp Matching (HH:MM:SS)

```xpath
# Exact timestamp format HH:MM:SS
//*[matches(text(), '[0-2][0-9]:[0-5][0-9]:[0-5][0-9]')]  # XPath 2.0+

# Simplified: contains time separator
//*[contains(text(), ':') and contains(text(), '0') or contains(text(), '1') or ... contains(text(), '9')]

# Contains HH:MM pattern (14:30)
//*[matches(text(), '[0-2][0-9]:[0-5][0-9]')]

# Using normalize-space to handle whitespace
//*[matches(normalize-space(text()), '[0-2][0-9]:[0-5][0-9]')]
```

**Example HTML**:
```html
<span class="time">14:30:45</span>
<div>Last updated: 14:30</div>
<p>  09:15  </p>
```

**XPath**:
```xpath
//span[@class='time'][contains(text(), ':')]
//*[contains(text(), '14:30')]
//*[contains(normalize-space(text()), '09:15')]
```

---

### Pattern 2: Date Matching (YYYY-MM-DD)

```xpath
# ISO date format YYYY-MM-DD
//*[matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]  # XPath 2.0+

# Simplified: contains date separators
//*[contains(text(), '-') and string-length(text()) >= 10]

# Specific year range
//*[contains(text(), '2024-') and contains(text(), '-0')]

# Date starting with specific year
//*[starts-with(text(), '2024-')]
```

**Example HTML**:
```html
<div class="date">2024-01-15</div>
<span>Created: 2024-01-15 14:30</span>
<p>2024-12-31</p>
```

**XPath**:
```xpath
//div[@class='date'][contains(text(), '2024-')]
//span[contains(text(), '2024-01-15')]
//*[starts-with(text(), '2024-')]
```

---

### Pattern 3: Numeric ID with Prefix/Suffix

```xpath
# ID with prefix "ID-" followed by numbers
//*[matches(text(), 'ID-[0-9]+')]  # XPath 2.0+

# Simplified: starts with prefix, contains digits
//*[starts-with(text(), 'ID-') and contains(text(), '0') or contains(text(), '1') or ... contains(text(), '9')]

# Numeric code format like "ORD-2024-12345"
//*[matches(text(), '[A-Z]+-[0-9]+-[0-9]+')]

# Simple: contains multiple digits
//*[contains(text(), '-') and string-length(translate(text(), '0123456789-', '')) > 0]
```

**Example HTML**:
```html
<div class="order-id">ID-12345</div>
<span class="code">ORD-2024-12345</span>
<p>INVOICE-001-2024</p>
```

**XPath**:
```xpath
//*[starts-with(text(), 'ID-')]
//*[contains(text(), 'ORD-2024-')]
//p[contains(text(), 'INVOICE-')]
```

---

### Pattern 4: Large Numbers (>1000)

```xpath
# Number >= 1000 (4+ digits)
//*[string-length(translate(text(), '0123456789', '')) = string-length(text()) - 4]

# Simplified: contains 4+ consecutive digits
//*[matches(text(), '[0-9]{4,}')]  # XPath 2.0+

# Contains number between 1000-9999
//*[contains(text(), '1000') or contains(text(), '2000') or ... contains(text(), '9999')]
```

**Example HTML**:
```html
<div class="amount">$1,234.56</div>
<span class="count">15000 items</span>
<p>Total: 9999</p>
```

**XPath**:
```xpath
//*[contains(text(), '1234') or contains(text(), '1,234')]
//span[@class='count'][contains(text(), '15000')]
//*[contains(text(), '9999')]
```

---

### Pattern 5: Percentage or Decimal Numbers

```xpath
# Percentage format (0-100% with decimal)
//*[matches(text(), '[0-9]{1,3}(\.[0-9]{1,2})?%')]  # XPath 2.0+

# Simplified: contains percent sign and digit
//*[contains(text(), '%') and (contains(text(), '0') or contains(text(), '1') or ... contains(text(), '9'))]

# Decimal format (e.g., 99.99)
//*[matches(text(), '[0-9]+\.[0-9]{2}')]

# Currency format $1,234.56
//*[contains(text(), '$') and matches(text(), '[0-9,]+\.[0-9]{2}')]
```

**Example HTML**:
```html
<span class="percentage">87.50%</span>
<div class="price">$1,299.99</div>
<p>Discount: 25%</p>
```

**XPath**:
```xpath
//span[@class='percentage'][contains(text(), '%')]
//div[@class='price'][contains(text(), '$')]
//*[contains(text(), '.') and contains(text(), '%')]
```

---

## Component-Specific Patterns

### ag-Grid Row/Cell with Numeric ID

```xpath
# ag-Grid row containing specific ID in first cell
//div[@role='row']//div[@role='gridcell'][contains(text(), '12345')]

# ag-Grid row by data-row-index
//div[@role='row'][@data-row-index='5']

# Specific cell in row with numeric header
//div[@col-id='orderID']//div[contains(text(), '12345')]

# ag-Grid container with row data
//*[contains(@class, 'ag-row')]//span[text() = '12345']

# Find row, then get specific column
//div[@role='row'][.//div[@role='gridcell'][contains(text(), '12345')]]//div[@col-id='amount']
```

**Example HTML**:
```html
<div role="row" data-row-index="5">
  <div role="gridcell" col-id="orderID">12345</div>
  <div role="gridcell" col-id="date">2024-01-15</div>
  <div role="gridcell" col-id="amount">1,299.99</div>
</div>
```

**XPath**:
```xpath
//div[@role='row']//div[@role='gridcell'][text() = '12345']
//div[@role='row'][.//div[@role='gridcell'][text() = '12345']]
//*[contains(@class, 'ag-row')][.//span[text() = '12345']]
```

---

### DevExpress dx-DataGrid

```xpath
# DevExpress table row by cell content
//tr[@data-key='12345']

# dx-DataGrid cell with numeric content
//table[@class='dx-datagrid-table']//td[contains(text(), '12345')]

# Get entire row containing numeric ID
//table[@class='dx-datagrid-table']//tr[.//td[text() = '12345']]

# Specific column in DevExpress grid
//table[@class='dx-datagrid-table']//tr[.//td[text() = '12345']]//td[@data-col='2']

# DevExpress form field with value
//*[contains(@class, 'dx-textbox')]//input[@value='12345']
```

**Example HTML**:
```html
<table class="dx-datagrid-table">
  <tr data-key="12345">
    <td>12345</td>
    <td>2024-01-15</td>
    <td>Active</td>
  </tr>
</table>
```

**XPath**:
```xpath
//table[@class='dx-datagrid-table']//tr[@data-key='12345']
//table[@class='dx-datagrid-table']//td[text() = '12345']
```

---

### Nexus Component with data-component-id

```xpath
# Nexus component with numeric ID in data attribute
//*[@data-component-id='12345']

# Nexus button containing numeric code
//button[@data-component-id][contains(text(), '12345')]

# Nexus table cell with numeric value
//*[@data-component-id='table-row-12345']

# Nexus modal/dialog with numeric title
//*[@data-component-id='modal'][contains(@data-title, '2024')]

# Find element, then get by data-component-id pattern
//*[contains(@data-component-id, '12345')]
```

**Example HTML**:
```html
<div data-component-id="row-12345" class="nexus-row">
  <span data-component-id="cell-order-id">12345</span>
  <span data-component-id="cell-date">2024-01-15</span>
</div>

<button data-component-id="btn-approve-12345">Approve Order 12345</button>
```

**XPath**:
```xpath
//*[@data-component-id='row-12345']
//*[contains(@data-component-id, '12345')]
//button[@data-component-id][contains(text(), '12345')]
```

---

## iFrame Context Switching

### Approach 1: Direct Iframe XPath (Single Level)

```xpath
# Find element inside iframe by direct path
//iframe[@id='main-frame']//div[@class='content']//span[text() = '12345']

# Any iframe containing element with numeric value
//iframe//div[contains(text(), '12345')]

# Nested iframe path
//iframe[@id='outer']//iframe[@id='inner']//span[text() = '12345']
```

**Example HTML**:
```html
<iframe id="main-frame" src="content.html"></iframe>
```

**iFrame Content**:
```html
<div class="content">
  <span>Order: 12345</span>
  <div class="date">2024-01-15</div>
</div>
```

**XPath** (in context of main document):
```xpath
//iframe[@id='main-frame']//span[contains(text(), '12345')]
```

---

### Approach 2: Selenium/Playwright - Context Switching

```java
// Selenium (Java)
WebDriver driver = new ChromeDriver();
driver.switchTo().frame("main-frame");
WebElement element = driver.findElement(By.xpath("//span[text() = '12345']"));
driver.switchTo().defaultContent(); // Return to main document
```

```typescript
// Playwright (TypeScript)
const page = await browser.newPage();
await page.goto('https://example.com');

// Get iframe
const frameHandle = await page.$('iframe#main-frame');
const frame = await frameHandle.contentFrame();

// Find element in iframe context
const element = await frame.$('xpath=//span[text() = "12345"]');
const text = await element.textContent();
```

---

## Code Examples

### Selenium (Java)

#### Example 1: Find Order ID in ag-Grid inside iFrame

```java
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;

public class NumericLocatorTest {
    
    public static void main(String[] args) {
        WebDriver driver = new ChromeDriver();
        driver.get("https://example.com");
        
        // Switch to iframe
        driver.switchTo().frame("data-frame");
        
        // Find ag-Grid row with numeric order ID
        String orderXPath = "//div[@role='row']//div[@role='gridcell'][text() = '12345']";
        WebElement orderCell = driver.findElement(By.xpath(orderXPath));
        System.out.println("Order ID: " + orderCell.getText());
        
        // Get parent row to access other columns
        WebElement row = orderCell.findElement(By.xpath("ancestor::div[@role='row']"));
        
        // Find date in same row (starts with 2024)
        String dateXPath = ".//div[@role='gridcell'][starts-with(text(), '2024')]";
        WebElement dateCell = row.findElement(By.xpath(dateXPath));
        System.out.println("Date: " + dateCell.getText());
        
        // Find amount (contains decimal)
        String amountXPath = ".//div[@role='gridcell'][contains(text(), '.')]";
        WebElement amountCell = row.findElement(By.xpath(amountXPath));
        System.out.println("Amount: " + amountCell.getText());
        
        driver.switchTo().defaultContent();
    }
}
```

#### Example 2: Find DevExpress Component with Timestamp

```java
public class DevExpressNumericTest {
    
    WebDriver driver;
    
    public void findByTimestamp() {
        driver.switchTo().frame("details-frame");
        
        // Find cell containing timestamp HH:MM:SS
        String timestampXPath = "//table[@class='dx-datagrid-table']//td[contains(text(), ':')]";
        WebElement timeCell = driver.findElement(By.xpath(timestampXPath));
        
        // Verify it contains valid time format
        String text = timeCell.getText();
        if (text.matches(".*[0-2][0-9]:[0-5][0-9]:[0-5][0-9].*")) {
            System.out.println("Valid timestamp: " + text);
        }
        
        driver.switchTo().defaultContent();
    }
    
    public WebElement findByNumericCodePattern() {
        driver.switchTo().frame("form-frame");
        
        // Find Nexus component with code format "CODE-YYYY-NNNNN"
        String codeXPath = "//*[@data-component-id][contains(text(), '-2024-')]";
        WebElement element = driver.findElement(By.xpath(codeXPath));
        
        driver.switchTo().defaultContent();
        return element;
    }
}
```

#### Example 3: Extract Numeric Values from Complex Row

```java
public class RowDataExtractor {
    
    public Map<String, String> extractRowByNumericId(
        WebDriver driver, 
        String frameId, 
        String numericId
    ) {
        driver.switchTo().frame(frameId);
        Map<String, String> rowData = new HashMap<>();
        
        // Find row containing numeric ID
        String rowXPath = String.format(
            "//div[@role='row'][.//div[@role='gridcell'][text() = '%s']]",
            numericId
        );
        WebElement row = driver.findElement(By.xpath(rowXPath));
        
        // Extract all cells in row
        String cellsXPath = ".//div[@role='gridcell']";
        List<WebElement> cells = row.findElements(By.xpath(cellsXPath));
        
        for (int i = 0; i < cells.size(); i++) {
            String cellValue = cells.get(i).getText();
            
            // Classify cell by content type
            if (cellValue.matches("\\d+")) {
                rowData.put("numeric_col_" + i, cellValue);
            } else if (cellValue.matches("\\d{4}-\\d{2}-\\d{2}.*")) {
                rowData.put("date_col_" + i, cellValue);
            } else if (cellValue.contains(".")) {
                rowData.put("decimal_col_" + i, cellValue);
            } else {
                rowData.put("text_col_" + i, cellValue);
            }
        }
        
        driver.switchTo().defaultContent();
        return rowData;
    }
}
```

---

### Playwright (TypeScript)

#### Example 1: Find Numeric Values with Timestamp

```typescript
import { Browser, BrowserContext, Page, Frame } from 'playwright';

export class NumericLocatorTest {
    
    async findOrderWithTimestamp(page: Page, orderId: string) {
        // Switch to iframe
        const frameHandle = await page.$('iframe#data-frame');
        const frame = await frameHandle.contentFrame();
        
        // Find row with numeric order ID
        const orderXPath = `//div[@role='row']//div[@role='gridcell'][text() = '${orderId}']`;
        const orderCell = await frame.$(orderXPath);
        
        if (orderCell) {
            const orderText = await orderCell.textContent();
            console.log('Order ID:', orderText);
            
            // Find timestamp in row (HH:MM:SS format)
            const row = await orderCell.$('ancestor::div[@role="row"]');
            const timestampXPath = `.//div[@role='gridcell'][contains(text(), ':')]`;
            const timestampCell = await row.$(timestampXPath);
            
            const timestamp = await timestampCell.textContent();
            console.log('Timestamp:', timestamp);
            
            // Verify timestamp format
            if (/\d{2}:\d{2}:\d{2}/.test(timestamp)) {
                console.log('Valid timestamp format');
                return { orderId, timestamp };
            }
        }
        
        return null;
    }
    
    async findByDateRange(page: Page, startDate: string, endDate: string) {
        const frameHandle = await page.$('iframe#reports-frame');
        const frame = await frameHandle.contentFrame();
        
        // Find rows with dates in range (YYYY-MM-DD format)
        const dateXPath = `//div[@role='row']//div[@role='gridcell'][starts-with(text(), '${startDate.substring(0, 4)}')]`;
        const rows = await frame.$$(dateXPath);
        
        const results = [];
        for (const row of rows) {
            const dateCell = await row.$('xpath=.//div[@role="gridcell"][contains(text(), "-")]');
            const dateText = await dateCell.textContent();
            
            // Parse and filter by range
            if (dateText >= startDate && dateText <= endDate) {
                results.push(dateText);
            }
        }
        
        return results;
    }
}
```

#### Example 2: Extract Grid Data with Numeric Classification

```typescript
export class GridDataExtractor {
    
    async extractRowData(
        page: Page,
        frameId: string,
        numericId: string
    ): Promise<Record<string, string>> {
        // Switch to iframe
        const frameHandle = await page.$(`iframe#${frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find row by numeric ID
        const rowXPath = `//div[@role='row'][.//div[@role='gridcell'][text() = '${numericId}']]`;
        const row = await frame.$(rowXPath);
        
        if (!row) return {};
        
        // Extract all cells
        const cells = await row.$$('.div[@role="gridcell"]');
        const rowData: Record<string, string> = {};
        
        for (let i = 0; i < cells.length; i++) {
            const cellText = await cells[i].textContent();
            const normalizedText = cellText.trim();
            
            // Classify by pattern
            if (/^\d+$/.test(normalizedText)) {
                rowData[`numeric_${i}`] = normalizedText;
            } else if (/\d{4}-\d{2}-\d{2}/.test(normalizedText)) {
                rowData[`date_${i}`] = normalizedText;
            } else if (/\d+\.\d{2}/.test(normalizedText)) {
                rowData[`currency_${i}`] = normalizedText;
            } else if (/\d{2}:\d{2}:\d{2}/.test(normalizedText)) {
                rowData[`time_${i}`] = normalizedText;
            } else {
                rowData[`text_${i}`] = normalizedText;
            }
        }
        
        return rowData;
    }
    
    async waitForNumericValue(
        page: Page,
        frameId: string,
        numericValue: string,
        timeoutMs: number = 5000
    ): Promise<boolean> {
        const frameHandle = await page.$(`iframe#${frameId}`);
        const frame = await frameHandle.contentFrame();
        
        const xpathLocator = `//*[contains(text(), '${numericValue}')]`;
        
        try {
            await frame.waitForSelector(`xpath=${xpathLocator}`, { timeout: timeoutMs });
            return true;
        } catch (error) {
            console.log(`Numeric value ${numericValue} not found within timeout`);
            return false;
        }
    }
}
```

#### Example 3: Nexus Component with Numeric Attributes

```typescript
export class NexusComponentFinder {
    
    async findNexusComponentByNumericId(
        page: Page,
        frameId: string,
        componentId: string
    ) {
        const frameHandle = await page.$(`iframe#${frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find Nexus component by data-component-id containing numeric value
        const xpathLocator = `//*[@data-component-id][contains(@data-component-id, '${componentId}')]`;
        const element = await frame.$(xpathLocator);
        
        if (element) {
            const tagName = await element.evaluate((el) => el.tagName);
            const text = await element.textContent();
            const componentId = await element.evaluate((el) => el.getAttribute('data-component-id'));
            
            return {
                tagName,
                text: text.trim(),
                componentId,
                found: true
            };
        }
        
        return { found: false };
    }
    
    async findNexusGridRow(
        page: Page,
        frameId: string,
        rowNumericId: string
    ) {
        const frameHandle = await page.$(`iframe#${frameId}`);
        const frame = await frameHandle.contentFrame();
        
        // Find Nexus row by numeric ID pattern
        const rowXPath = `//*[@data-component-id][contains(@data-component-id, 'row-${rowNumericId}')]`;
        const row = await frame.$(rowXPath);
        
        if (!row) return null;
        
        // Get all cells in row
        const cellsXPath = `./*[@data-component-id][contains(@data-component-id, 'cell-')]`;
        const cells = await row.$$(cellsXPath);
        
        const cellData = [];
        for (const cell of cells) {
            const id = await cell.evaluate((el) => el.getAttribute('data-component-id'));
            const text = await cell.textContent();
            cellData.push({ id, text: text.trim() });
        }
        
        return {
            rowId: rowNumericId,
            cells: cellData
        };
    }
}
```

---

### Cypress (JavaScript)

#### Example 1: Find and Interact with Numeric Elements

```javascript
describe('Numeric Locator Tests', () => {
    
    it('should find order by numeric ID in ag-Grid', () => {
        cy.visit('https://example.com');
        
        // Get iframe
        cy.get('iframe#data-frame')
            .then(($iframe) => {
                const $body = $iframe.contents().find('body');
                
                // Find cell with numeric order ID
                const orderId = '12345';
                const orderXPath = `//div[@role='row']//div[@role='gridcell'][text() = '${orderId}']`;
                
                cy.wrap($body).find(orderXPath).then(($cell) => {
                    cy.wrap($cell).should('contain', orderId);
                    
                    // Get parent row
                    cy.wrap($cell).closest('[role="row"]').then(($row) => {
                        // Find date in same row
                        cy.wrap($row).find('[role="gridcell"]')
                            .contains(/\d{4}-\d{2}-\d{2}/)
                            .should('be.visible');
                    });
                });
            });
    });
    
    it('should filter by timestamp pattern', () => {
        cy.visit('https://example.com');
        
        cy.get('iframe#logs-frame').then(($iframe) => {
            const $body = $iframe.contents().find('body');
            
            // Find all elements containing timestamp (HH:MM:SS)
            const timeXPath = "//*[contains(text(), ':')]";
            cy.wrap($body).find(timeXPath).each(($el) => {
                const text = cy.wrap($el).text();
                // Verify timestamp format
                expect(text).to.match(/\d{2}:\d{2}:\d{2}/);
            });
        });
    });
    
    it('should find DevExpress cell by numeric content', () => {
        cy.visit('https://example.com');
        
        // Find table containing data grid
        cy.get('table.dx-datagrid-table').within(() => {
            // Find cell with exact numeric value
            cy.contains('td', '12345').should('exist');
            
            // Find cell containing partial numeric value
            cy.contains('td', /12345/).should('be.visible');
            
            // Find cell with date format
            cy.contains('td', /\d{4}-\d{2}-\d{2}/).should('exist');
        });
    });
});
```

#### Example 2: Advanced Numeric Assertions

```javascript
describe('Advanced Numeric Locators', () => {
    
    it('should validate numeric format and extract data', () => {
        cy.visit('https://example.com');
        
        cy.get('iframe[name="content"]').then(($iframe) => {
            const $body = $iframe.contents().find('body');
            
            // Find all rows in grid
            cy.wrap($body).find('[role="row"]').each(($row) => {
                // Extract numeric ID from first cell
                cy.wrap($row).find('[role="gridcell"]').first().then(($idCell) => {
                    const numericId = $idCell.text().trim();
                    
                    if (/^\d+$/.test(numericId)) {
                        // Find row by this numeric ID
                        const xpath = `//*[contains(text(), '${numericId}')]`;
                        cy.wrap($body).find(xpath).should('exist');
                    }
                });
                
                // Extract and validate date
                cy.wrap($row).find('[role="gridcell"]')
                    .contains(/\d{4}-\d{2}-\d{2}/)
                    .then(($dateCell) => {
                        const dateStr = $dateCell.text().trim();
                        const date = new Date(dateStr);
                        expect(date).to.be.instanceof(Date);
                        expect(date.getFullYear()).to.equal(2024);
                    });
            });
        });
    });
    
    it('should find by partial numeric match', () => {
        cy.visit('https://example.com');
        
        cy.get('iframe#data-frame').then(($iframe) => {
            const $body = $iframe.contents().find('body');
            
            // Find elements starting with specific year
            cy.wrap($body).find('*').then(($elements) => {
                const elementsWithYear2024 = [];
                
                $elements.each((index, el) => {
                    const text = $(el).text();
                    if (text.startsWith('2024')) {
                        elementsWithYear2024.push(el);
                    }
                });
                
                expect(elementsWithYear2024.length).to.be.greaterThan(0);
            });
        });
    });
});
```

---

## Testing Patterns

### Pattern 1: Assertion Framework with Numeric Validation

```typescript
// Custom matcher for numeric pattern
export class NumericMatchers {
    
    static isValidNumericId(value: string): boolean {
        return /^\d+$/.test(value) && value.length > 0;
    }
    
    static isValidDate(value: string): boolean {
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
    }
    
    static isValidTimestamp(value: string): boolean {
        return /^\d{2}:\d{2}:\d{2}$/.test(value);
    }
    
    static isValidCurrency(value: string): boolean {
        return /^\$?[\d,]+\.\d{2}$/.test(value);
    }
    
    static isValidPercentage(value: string): boolean {
        return /^\d{1,3}(\.\d{1,2})?%$/.test(value);
    }
}

// Usage in tests
describe('Numeric Validation', () => {
    it('should validate extracted numeric data', async () => {
        const rowData = await extractor.extractRowData(page, 'frame-id', '12345');
        
        for (const [key, value] of Object.entries(rowData)) {
            if (key.includes('numeric')) {
                expect(NumericMatchers.isValidNumericId(value)).toBe(true);
            } else if (key.includes('date')) {
                expect(NumericMatchers.isValidDate(value)).toBe(true);
            } else if (key.includes('time')) {
                expect(NumericMatchers.isValidTimestamp(value)).toBe(true);
            } else if (key.includes('currency')) {
                expect(NumericMatchers.isValidCurrency(value)).toBe(true);
            }
        }
    });
});
```

### Pattern 2: Retry with Numeric Validation

```typescript
export class RobustNumericFinder {
    
    async findWithRetry(
        page: Page,
        frameId: string,
        numericValue: string,
        maxRetries: number = 3
    ): Promise<Element | null> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const frameHandle = await page.$(`iframe#${frameId}`);
                const frame = await frameHandle.contentFrame();
                
                const xpath = `//*[contains(text(), '${numericValue}')]`;
                const element = await frame.$(xpath);
                
                if (element) {
                    const text = await element.textContent();
                    if (text.includes(numericValue)) {
                        console.log(`Found on attempt ${attempt}`);
                        return element;
                    }
                }
            } catch (error) {
                console.log(`Attempt ${attempt} failed, retrying...`);
                
                if (attempt < maxRetries) {
                    await page.waitForTimeout(500);
                }
            }
        }
        
        console.log(`Failed to find ${numericValue} after ${maxRetries} attempts`);
        return null;
    }
    
    async waitForNumericValueChange(
        page: Page,
        frameId: string,
        previousValue: string,
        timeoutMs: number = 10000
    ): Promise<string | null> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            const frameHandle = await page.$(`iframe#${frameId}`);
            const frame = await frameHandle.contentFrame();
            
            // Find any numeric value different from previous
            const xpath = `//*[contains(text(), '-') or matches(text(), '^[0-9]+$')]`;
            const elements = await frame.$$(xpath);
            
            for (const element of elements) {
                const text = await element.textContent();
                if (text !== previousValue && /\d+/.test(text)) {
                    return text.trim();
                }
            }
            
            await page.waitForTimeout(250);
        }
        
        return null;
    }
}
```

### Pattern 3: Data-Driven Testing with Numeric Patterns

```typescript
const testCases = [
    {
        name: 'Find by numeric ID',
        xpath: `//div[@role='row']//div[@role='gridcell'][text() = '12345']`,
        expected: '12345',
        frameId: 'data-frame'
    },
    {
        name: 'Find by date range',
        xpath: `//span[starts-with(text(), '2024-01-')]`,
        expected: /2024-01-\d{2}/,
        frameId: 'reports-frame'
    },
    {
        name: 'Find by timestamp',
        xpath: `//div[matches(text(), '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$')]`,
        expected: /\d{2}:\d{2}:\d{2}/,
        frameId: 'logs-frame'
    },
    {
        name: 'Find by currency format',
        xpath: `//td[contains(text(), '$') and contains(text(), '.')]`,
        expected: /\$[\d,]+\.\d{2}/,
        frameId: 'table-frame'
    }
];

describe.each(testCases)('Numeric XPath Tests', (testCase) => {
    it(`should ${testCase.name}`, async () => {
        const frameHandle = await page.$(`iframe#${testCase.frameId}`);
        const frame = await frameHandle.contentFrame();
        
        const element = await frame.$(testCase.xpath);
        expect(element).toBeTruthy();
        
        const text = await element.textContent();
        
        if (typeof testCase.expected === 'string') {
            expect(text).toContain(testCase.expected);
        } else {
            expect(text).toMatch(testCase.expected);
        }
    });
});
```

---

## Best Practices

### 1. ✅ Use Specific Numeric Patterns
```xpath
// Good: Specific pattern matching
//span[matches(text(), '^\d{5}$')]  // Exactly 5 digits

// Avoid: Too generic
//*[contains(text(), '1')]  // Too broad
```

### 2. ✅ Combine with Attribute Matching
```xpath
// Good: Use both element context and numeric pattern
//div[@class='order-id'][@role='cell'][text() = '12345']

// Avoid: Pure text matching without context
//*[text() = '12345']  // Could match anywhere
```

### 3. ✅ Normalize Whitespace for Text Matching
```xpath
// Good: Handle whitespace variations
//*[normalize-space(text()) = '12345']

// Avoid: Exact text with potential whitespace issues
//*[text() = '12345']
```

### 4. ✅ Use Contains for Flexible Matching
```xpath
// Good: For large result sets or partial matches
//td[contains(text(), '2024')]  // Works with "2024-01-15 14:30"

// Specific when exact match needed:
//td[text() = '2024-01-15']
```

### 5. ✅ Frame Context Strategy
```typescript
// Good: Explicit frame switching with cleanup
const frame = await page.frameLocator('iframe#data').frameLocator('iframe#nested');
const element = await frame.locator(`xpath=//*[text()='12345']`).first();

// Avoid: Leaving frame context unexpectedly
// Always return to main context after frame operations
```

---

## Common Pitfalls & Solutions

| Problem | XPath | Solution |
|---------|-------|----------|
| **Dynamic IDs change frequently** | `//div[@id='order-123456']` | Use `contains()` on stable numeric patterns: `//div[contains(text(), '123456')]` |
| **Whitespace breaks exact matches** | `//span[text() = ' 12345 ']` | Use `normalize-space()`: `//span[normalize-space() = '12345']` |
| **Case sensitivity in numbers** | May vary | Numbers are case-insensitive, but use `translate()` for text parts |
| **Frame context lost** | XPath fails silently | Always verify frame before XPath execution |
| **Partial numeric match too broad** | `//td[contains(text(), '234')]` | Add context: `//table//tr[.//td[text()='12345']]//td[contains(text(), '234')]` |
| **Special characters in format** | `//td[text() = '$1,234.56']` | Escape special chars or use `contains()`: `//td[contains(text(), '1234')]` |

---

## Summary: XPath Patterns Quick Reference

```xpath
# Exact numeric match
//*[text() = '12345']
//*[normalize-space() = '12345']

# Starts with numeric
//*[starts-with(text(), '2024')]
//*[starts-with(text(), '0') or starts-with(text(), '1') ... or starts-with(text(), '9')]

# Ends with numeric
//*[ends-with(text(), '2024')]
//*[substring(text(), string-length(text()) - 3) = '2024']

# Contains numeric substring
//*[contains(text(), '12345')]
//*[contains(text(), '2024-')]
//*[contains(text(), ':')]

# Complex patterns
//*[matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]  # Date YYYY-MM-DD
//*[matches(text(), '[0-2][0-9]:[0-5][0-9]:[0-5][0-9]')]  # Time HH:MM:SS
//*[matches(text(), '^[A-Z]+-[0-9]+-[0-9]+$')]  # Code pattern

# Component-specific
//div[@role='row']//div[@role='gridcell'][text() = '12345']  # ag-Grid
//table[@class='dx-datagrid-table']//td[text() = '12345']  # DevExpress
//*[@data-component-id][contains(@data-component-id, '12345')]  # Nexus

# With iframe context
//iframe[@id='frame-id']//div[contains(text(), '12345')]
```

---

## References

- [XPath 2.0 Specification](https://www.w3.org/TR/xpath20/)
- [Selenium XPath Documentation](https://www.selenium.dev/documentation/webdriver/locating_elements/)
- [Playwright Locators](https://playwright.dev/docs/locators)
- [ag-Grid API Reference](https://www.ag-grid.com/javascript-data-grid/api/)
- [DevExpress Documentation](https://js.devexpress.com/)

---

**Last Updated**: 2024  
**Version**: 1.0  
**Compatibility**: Selenium 3+, Playwright 1.40+, Cypress 12+
