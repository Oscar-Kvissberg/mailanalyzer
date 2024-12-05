import OpenAI from 'openai';

export const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true // OBS: I produktion bör API-anrop göras från servern
}); 