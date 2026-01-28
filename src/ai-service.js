/**
 * AI Service for Playwright Locator Inspector
 * Handles interaction with OpenAI API
 */
const AIService = {
    async generateLocators(elementData, apiKey) {
        const prompt = `
        You are a Playwright automation expert. Analyze this HTML element and suggest 3 high-quality Playwright locators.
        
        Element HTML: ${elementData.outerHTML}
        Tag: ${elementData.tag}
        Current ID: ${elementData.id}
        
        Respond ONLY with a valid JSON array of objects (no markdown formatting). Each object must have:
        - "name": a semantic variable name
        - "locator": the full Playwright locator code (e.g., page.getByRole(...))
        - "reason": brief explanation of why this strategy is stable/robust
        
        Focus on stability, accessibility (ARIA), and resilience to changes.
        `;

        const url = 'https://api.openai.com/v1/chat/completions';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a Playwright automation expert.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'OpenAI API request failed');
            }

            const result = await response.json();
            const textResponse = result.choices[0].message.content;

            // Clean up markdown code blocks if present (just in case, though json_object mode usually handles it)
            const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            const json = JSON.parse(cleanJson);
            // Handle both array wrapper or direct array
            return Array.isArray(json) ? json : (json.recommendations || json.locators || Object.values(json)[0]);
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw error;
        }
    }
};

// Expose globally
window.AIService = AIService;
