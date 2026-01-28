# XPath Numeric Locators - Quick Reference Cheat Sheet

## 🎯 Quick Copy-Paste XPath Patterns

### Exact Matches
```xpath
# Exact numeric match
//*[text() = '12345']
//*[normalize-space(text()) = '12345']

# Exact date
//*[text() = '2024-01-15']

# Exact time
//*[text() = '14:30:45']
```

### Starts With
```xpath
# Starts with year 2024
//*[starts-with(text(), '2024')]

# Starts with any digit
//*[starts-with(text(), '0') or starts-with(text(), '1') ... or starts-with(text(), '9')]
```

### Ends With
```xpath
# Ends with year 2024
//*[substring(text(), string-length(text()) - 3) = '2024']

# Ends with specific number
//*[ends-with(text(), '999')]
```

### Contains
```xpath
# Contains numeric substring
//*[contains(text(), '12345')]

# Contains date
//*[contains(text(), '2024-01-')]

# Contains time
//*[contains(text(), ':')]
```

### Pattern Matching
```xpath
# Date YYYY-MM-DD
//*[matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]

# Time HH:MM:SS
//*[matches(text(), '[0-2][0-9]:[0-5][0-9]:[0-5][0-9]')]

# Currency $X,XXX.XX
//*[matches(text(), '\$[0-9,]+\.[0-9]{2}')]

# Percentage XX.XX%
//*[matches(text(), '[0-9]{1,3}(\.[0-9]{1,2})?%')]

# 4+ digit number
//*[matches(text(), '[0-9]{4,}')]
```

---

## 🏢 Component-Specific Patterns

### ag-Grid (Role-based)
```xpath
# Exact cell value
//div[@role='row']//div[@role='gridcell'][text() = '12345']

# Cell containing value
//div[@role='row']//div[@role='gridcell'][contains(text(), '12345')]

# Entire row containing value
//div[@role='row'][.//div[@role='gridcell'][contains(text(), '12345')]]

# Get date column in row with ID
//div[@role='row'][.//div[@role='gridcell'][text() = '12345']]//div[@role='gridcell'][matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]
```

### DevExpress (Table-based)
```xpath
# Find row with numeric value
//table[@class='dx-datagrid-table']//tr[.//td[text() = '12345']]

# Find cell with value
//table[@class='dx-datagrid-table']//td[contains(text(), '12345')]

# Get specific row by data-key
//table[@class='dx-datagrid-table']//tr[@data-key='12345']
```

### Nexus (data-component-id)
```xpath
# Component with numeric ID
//*[@data-component-id][contains(@data-component-id, '12345')]

# Grid row by ID
//*[@data-component-id][contains(@data-component-id, 'row-12345')]

# Component with matching numeric attribute
//*[@data-component-id='row-12345']
```

---

## 🖼️ iFrame XPath

### Single iFrame
```xpath
# Find element inside iframe by context
//iframe[@id='main-frame']//span[text() = '12345']

# Any iframe containing numeric value
//iframe//div[contains(text(), '12345')]
```

### Nested iFrames
```xpath
# Outer iframe → Inner iframe → Element
//iframe[@id='outer']//iframe[@id='inner']//span[contains(text(), '12345')]
```

---

## 📝 Common Numeric Patterns

### Date Patterns
```xpath
# Any date YYYY-MM-DD
//*[matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]

# Date in January 2024
//*[starts-with(text(), '2024-01-')]

# Specific date
//*[text() = '2024-01-15']
```

### Time Patterns
```xpath
# Any valid time HH:MM:SS
//*[matches(text(), '[0-2][0-9]:[0-5][0-9]:[0-5][0-9]')]

# Any time HH:MM
//*[matches(text(), '[0-2][0-9]:[0-5][0-9]')]

# Contains colon (basic time check)
//*[contains(text(), ':')]
```

### Currency Patterns
```xpath
# Dollar amount $X,XXX.XX
//*[matches(text(), '\$[0-9,]+\.[0-9]{2}')]

# Any decimal with comma separator
//*[contains(text(), ',') and contains(text(), '.')]

# Contains $ symbol
//*[contains(text(), '$')]
```

### ID/Code Patterns
```xpath
# Pure numeric ID
//*[matches(text(), '^[0-9]+$')]

# Code format CODE-YYYY-NNNNN
//*[matches(text(), '[A-Z]+-[0-9]+-[0-9]+')]

# Any numeric prefix (ORD-12345)
//*[matches(text(), '[A-Z]+-[0-9]+')]
```

---

## 💻 Framework Integration

### Selenium (Java)
```java
// Find element
WebElement element = driver.findElement(By.xpath("//span[text() = '12345']"));

// In frame
driver.switchTo().frame("frame-id");
WebElement element = driver.findElement(By.xpath("//div[contains(text(), '2024-01-')]"));
driver.switchTo().defaultContent();
```

### Playwright (TypeScript)
```typescript
// Find element
const element = await page.$('xpath=//span[text() = "12345"]');

// In frame
const frameHandle = await page.$('iframe#frame-id');
const frame = await frameHandle.contentFrame();
const element = await frame.$('xpath=//div[contains(text(), "2024-01-")]');
```

### Cypress (JavaScript)
```javascript
// Find element in iframe
cy.get('iframe#frame-id').then(($iframe) => {
    const $body = $iframe.contents().find('body');
    cy.wrap($body).find('xpath=//span[text() = "12345"]');
});
```

---

## ✅ Quick Test Checklist

### Pattern Validation
- [ ] **Exact Match**: `//*[text() = 'VALUE']` - Works? ✓
- [ ] **Contains**: `//*[contains(text(), 'VALUE')]` - Works? ✓
- [ ] **Starts With**: `//*[starts-with(text(), 'VALUE')]` - Works? ✓
- [ ] **Date Pattern**: `//*[matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]` - Works? ✓
- [ ] **Time Pattern**: `//*[matches(text(), '[0-2][0-9]:[0-5][0-9]')]` - Works? ✓
- [ ] **In Frame**: `//iframe[@id='X']//span[text() = 'Y']` - Works? ✓

### Component Validation
- [ ] **ag-Grid Cell**: `//div[@role='gridcell'][text() = 'VALUE']` - Works? ✓
- [ ] **DevExpress Row**: `//table[@class='dx-datagrid-table']//tr[.//td[text() = 'VALUE']]` - Works? ✓
- [ ] **Nexus Component**: `//*[@data-component-id][contains(@data-component-id, 'VALUE')]` - Works? ✓

---

## 🐛 Troubleshooting Quick Guide

| Problem | Solution | XPath |
|---------|----------|-------|
| **Whitespace breaks match** | Use normalize-space | `//*[normalize-space(text()) = 'VALUE']` |
| **Exact match fails** | Use contains | `//*[contains(text(), 'VALUE')]` |
| **Case sensitivity issue** | Use translate | `//*[translate(text(), 'ABC', 'abc') = 'value']` |
| **Dynamic content** | Use starts-with | `//*[starts-with(text(), 'PREFIX')]` |
| **Frame not found** | Verify iframe ID | `//iframe[@id='CORRECT-ID']` |
| **Multiple matches** | Add more context | `//div[@class='X']//span[text() = 'VALUE']` |
| **Pattern not matching** | Check regex syntax | `//*[matches(text(), 'PATTERN')]` (XPath 2.0+) |

---

## 📊 Performance Tips

### ✅ Fast XPath
```xpath
# Specific and fast
//table[@id='orders']//td[text() = '12345']

# Using attributes
//*[@data-id='12345']

# Combining conditions
//div[@class='grid']//span[@class='id'][text() = '12345']
```

### ❌ Slow XPath
```xpath
# Generic - searches entire DOM
//*[contains(text(), '12345')]

# Multiple or conditions
//*[text() = '123' or text() = '456' or text() = '789']

# Deeply nested
//*/*/*/*/*[@class='X']//*//*//span[text() = 'Y']
```

---

## 🎓 Learning Resources

| Resource | Link | Purpose |
|----------|------|---------|
| Full Guide | [XPATH_NUMERIC_LOCATORS.md](XPATH_NUMERIC_LOCATORS.md) | Complete reference with examples |
| Library | [NumericLocatorLibrary.ts](NumericLocatorLibrary.ts) | Reusable TypeScript classes |
| Examples | [NumericLocatorExamples.ts](NumericLocatorExamples.ts) | Practical usage patterns |
| XPath 2.0 Spec | https://www.w3.org/TR/xpath20/ | Official specification |
| Selenium Docs | https://www.selenium.dev/documentation/ | Framework documentation |
| Playwright Docs | https://playwright.dev/docs/locators | Locator guide |

---

## 🎯 Quick Start Examples

### Find Order by ID
```xpath
//div[@role='row']//div[@role='gridcell'][text() = '12345']
```

### Find by Date Range
```xpath
//span[starts-with(text(), '2024-01-')]
```

### Find by Time
```xpath
//*[contains(text(), ':')]
```

### Find Currency Value
```xpath
//*[contains(text(), '$')]
```

### Find in ag-Grid + iFrame
```xpath
//iframe[@id='data']//div[@role='row']//div[@role='gridcell'][contains(text(), '12345')]
```

### Find in DevExpress + iFrame
```xpath
//iframe[@id='table']//table[@class='dx-datagrid-table']//td[text() = '12345']
```

### Find Nexus Component by ID
```xpath
//*[@data-component-id][contains(@data-component-id, '12345')]
```

---

## 💡 Pro Tips

1. **Always use normalize-space() for text matching**
   ```xpath
   //*[normalize-space() = '12345']  ✓ Better
   //*[text() = '12345']              ✗ May fail with whitespace
   ```

2. **Use contains() for partial matches**
   ```xpath
   //*[contains(text(), '2024-01-')]  ✓ Works with timestamps
   //*[text() = '2024-01-15']          ✗ Too strict
   ```

3. **Add context to reduce matches**
   ```xpath
   //table[@id='orders']//tr[contains(text(), '12345')]  ✓ Specific
   //*[contains(text(), '12345')]                        ✗ Too broad
   ```

4. **Frame handling before XPath**
   ```typescript
   const frame = await frameHandle.contentFrame();
   const element = await frame.$('xpath=//span[...]');  ✓ Correct
   // vs searching main document
   ```

5. **Validate numeric patterns before use**
   ```xpath
   //*[matches(text(), '[0-9]{4}')]  ✓ Checks 4-digit number
   //*[contains(text(), '1')]        ✗ Matches anywhere
   ```

---

## 📋 Copy-Ready Templates

### Template 1: Grid Cell Finder
```xpath
//div[@role='row']//div[@role='gridcell'][contains(text(), 'NUMERIC_VALUE')]
```

### Template 2: DevExpress Table
```xpath
//table[@class='dx-datagrid-table']//tr[.//td[contains(text(), 'NUMERIC_VALUE')]]
```

### Template 3: Nexus Component
```xpath
//*[@data-component-id][contains(@data-component-id, 'NUMERIC_VALUE')]
```

### Template 4: iFrame Navigation
```xpath
//iframe[@id='FRAME_ID']//div[contains(text(), 'NUMERIC_VALUE')]
```

### Template 5: Date Search
```xpath
//*[matches(text(), '[0-9]{4}-[0-9]{2}-[0-9]{2}')]
```

### Template 6: Time Search
```xpath
//*[matches(text(), '[0-2][0-9]:[0-5][0-9]:[0-5][0-9]')]
```

---

**Version**: 1.0  
**Last Updated**: 2024  
**Created**: For Playwright Locator Inspector v4.0+

For detailed explanations and more examples, see [XPATH_NUMERIC_LOCATORS.md](XPATH_NUMERIC_LOCATORS.md)
