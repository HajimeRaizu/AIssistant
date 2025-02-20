import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

const apiToken = process.env.HUGGINGFACE_API_TOKEN;
const client = new HfInference(apiToken);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export { client, deepseek };