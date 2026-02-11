import Groq from 'groq-sdk';
import * as vscode from 'vscode';
import { GROQ_API_KEY } from './secrets';

export class GroqService {
    private groq: Groq | undefined;

    constructor() {
        this.init();
    }

    private init() {
        try {
            this.groq = new Groq({
                apiKey: GROQ_API_KEY
            });
        } catch (error) {
            console.error('Failed to initialize Groq:', error);
            vscode.window.showErrorMessage('EvoDoc: Failed to initialize Groq API. Please check your network connection.');
        }
    }

    public async generateContent(prompt: string): Promise<string> {
        if (!this.groq) {
            throw new Error('Groq API is not initialized. Please configure your API Key.');
        }

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                model: 'llama-3.3-70b-versatile',
            });

            return completion.choices[0]?.message?.content || '';
        } catch (error: any) {
            console.error('Groq Generation Error:', error);
            throw new Error(`Groq API Error: ${error.message || error}`);
        }
    }
}
