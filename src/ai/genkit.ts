import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const defaultModel = process.env.GEMINI_MODEL || 'googleai/gemini-2.0-flash';

export const ai = genkit({
  plugins: [googleAI()],
  model: defaultModel,
});
