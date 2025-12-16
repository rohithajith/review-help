/**
 * Test script for OpenRouter API
 * Run: node scripts/test_openrouter.js
 */

require('dotenv').config();

const OPENROUTER_URL = 'https://api.openrouter.ai/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

async function testGeneration(category, businessType = 'business') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set in .env');
    process.exit(1);
  }
  
  console.log('✓ API Key present');
  console.log(`\nTesting template generation for: "${category}" (${businessType})\n`);
  
  const isFreelancer = businessType === 'freelancer';
  const count = 5;
  
  const prompt = `You are a review writing expert. Generate ${count} authentic Google review templates for: "${category}".

CRITICAL RULES:
1. Write as REAL customers - casual, genuine, specific
2. Each review: 1-2 sentences, 15-40 words
3. NO emojis, NO hashtags, NO "I recommend"
4. VARY: tone (enthusiastic/calm), focus (service/quality/value/atmosphere), length
5. Be SPECIFIC to "${category}" - mention what matters to customers of this exact service

${isFreelancer ? 'FREELANCER FOCUS: Personal touch, individual skill, "she/he listened", booking ease, results' : 'BUSINESS FOCUS: Team/staff, atmosphere, consistency, "this place", overall experience'}

GOOD EXAMPLES (adapt style, not content):
- "Finally found someone who actually listens. The results speak for themselves."
- "Third time here and the quality never disappoints. Fair prices too."
- "Wasn't sure what to expect but they exceeded every expectation."

BAD (avoid):
- "I would highly recommend this to anyone looking for..." (cliché)
- "The service was good and the staff was nice." (generic, boring)
- "5 stars! Amazing! Best ever!" (over the top)

OUTPUT: Return ONLY a JSON array of ${count} strings. No markdown, no explanation.
["review 1", "review 2", ...]`;

  const startTime = Date.now();
  
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: count * 60
      })
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`❌ HTTP ${response.status}: ${text}`);
      return;
    }
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('❌ Empty response from model');
      console.log('Full response:', JSON.stringify(data, null, 2));
      return;
    }
    
    console.log(`✓ Response received in ${elapsed}ms\n`);
    console.log('Raw output:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));
    
    // Try to parse JSON
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error('\n❌ No JSON array found in response');
      return;
    }
    
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) {
      console.error('\n❌ Parsed result is not an array');
      return;
    }
    
    // Validate templates
    const valid = parsed
      .filter(s => typeof s === 'string' && s.length > 15 && s.length < 250)
      .map(s => s.trim());
    
    console.log(`\n✓ Parsed ${valid.length}/${count} valid templates:\n`);
    valid.forEach((t, i) => {
      console.log(`  ${i + 1}. "${t}"`);
      console.log(`     (${t.split(' ').length} words, ${t.length} chars)\n`);
    });
    
    if (valid.length >= count * 0.7) {
      console.log('✅ SUCCESS - Ready for production!');
    } else {
      console.log(`⚠️  WARNING - Only ${valid.length}/${count} valid (need 70%)`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Run tests
const args = process.argv.slice(2);
const category = args[0] || 'Restaurant';
const type = args[1] || 'business';

testGeneration(category, type);
