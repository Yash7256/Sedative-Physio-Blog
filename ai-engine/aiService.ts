// Define the Message interface directly in this file
interface Message {
  role: string;
  content: string;
}

class AIService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GROK_API_KEY || '';
    // Using the correct Groq API endpoint for LLaMA models
    this.baseUrl = "https://api.groq.com/openai/v1";
    
    if (!this.apiKey) {
      throw new Error('GROK_API_KEY environment variable is required');
    }
  }

  async chatCompletion(
    messages: Message[],
    model: string = "llama-3.1-8b-instant"  // Updated to the new model
  ): Promise<any> {
    try {
      // Since we can't use external libraries directly without installing them,
      // we'll use the native fetch API
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          model,
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API request failed: ${data.error?.message || 'Unknown error'}`);
      }

      return {
        success: true,
        data: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage,
      };
    } catch (error) {
      console.error('Error in AI chat completion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async analyzeMedicalContent(content: string, model: string = "llama-3.1-8b-instant"): Promise<any> {  // Updated default model
    const systemPrompt = `You are a helpful assistant specialized in medical science and physiotherapy. 
    Provide evidence-based, accurate information related to physiotherapy, rehabilitation medicine, 
    movement science, and musculoskeletal health. Be professional, clear, and cite when possible.`;

    const userMessage = `Analyze the following content related to medical science and physiotherapy:\n\n${content}`;

    return this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], model);  // Pass model parameter
  }

  async generatePhysiotherapyAdvice(condition: string, model: string = "llama-3.3-70b-versatile"): Promise<any> {  // Clinical model as default for advice
    const systemPrompt = `You are a specialized assistant for physiotherapy and rehabilitation. 
    Provide evidence-based advice related to physiotherapy, exercise recommendations, 
    and rehabilitation techniques. Always emphasize the importance of consulting with 
    healthcare professionals for personalized treatment.`;

    const userMessage = `Provide physiotherapy advice for: ${condition}. 
    Include general exercises, precautions, and recovery tips.`;

    return this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], model);  // Pass model parameter
  }

  async answerBlogQuestions(question: string, blogContent: string, model: string = "llama-3.1-8b-instant"): Promise<any> {  // Updated default model
    const systemPrompt = `You are an AI assistant for a medical science and physiotherapy blog. 
    Your purpose is to answer questions about the blog content provided. 
    Base your answers strictly on the blog content given, and if the information isn't available, 
    politely say you don't have that information.`;

    const userMessage = `Blog Content: ${blogContent}

Question: ${question}

Please provide a detailed answer based on the blog content.`;

    return this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], model);  // Pass model parameter
  }
  
  // Method to classify question type and suggest appropriate model
  classifyQuestion(question: string): string {
    const lowerQuestion = question.toLowerCase();
    
    // Clinical questions
    if (lowerQuestion.includes('treatment') || 
        lowerQuestion.includes('diagnosis') || 
        lowerQuestion.includes('symptom') || 
        lowerQuestion.includes('pain') ||
        lowerQuestion.includes('injury') ||
        lowerQuestion.includes('rehabilitation')) {
      return 'clinical';
    }
    
    // Advanced reasoning/research questions (consolidated)
    if (lowerQuestion.includes('latest') || 
        lowerQuestion.includes('recent') || 
        lowerQuestion.includes('study') || 
        lowerQuestion.includes('research') ||
        lowerQuestion.includes('evidence') ||
        lowerQuestion.includes('findings') ||
        lowerQuestion.includes('literature') ||
        lowerQuestion.includes('systematic review') ||
        lowerQuestion.includes('meta-analysis') ||
        lowerQuestion.includes('clinical trial') ||
        lowerQuestion.includes('why') || 
        lowerQuestion.includes('how does') || 
        lowerQuestion.includes('explain') || 
        lowerQuestion.includes('analyze') ||
        lowerQuestion.includes('compare') ||
        lowerQuestion.includes('relationship')) {
      return 'reasoning';
    }
    
    // Default to quick for simple questions
    return 'quick';
  }
}

export default AIService;