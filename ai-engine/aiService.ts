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
  
  async generateQuizQuestion(
    syllabusContent: string,
    topicName: string,
    questionNumber: number,
    totalQuestions: number,
    previousTopics: string[]
  ): Promise<any> {
    const systemPrompt = `You are an expert medical/physiotherapy educator creating quiz questions.
Generate a high-quality multiple choice question with 4 options (A, B, C, D).
Return ONLY valid JSON in this exact format, no markdown or additional text:
{
  "id": "q${questionNumber}",
  "question": "The question text here",
  "options": [
    {"text": "Option A", "isCorrect": false},
    {"text": "Option B", "isCorrect": false},
    {"text": "Option C", "isCorrect": false},
    {"text": "Option D", "isCorrect": false}
  ],
  "correctAnswer": 0,
  "explanation": "Brief explanation of why the correct answer is correct",
  "topic": "Topic name",
  "difficulty": "medium"
}
The correctAnswer should be the index (0-3) of the correct option.
Make the question clinically relevant and challenging.`;

    const userMessage = `Generate question ${questionNumber} of ${totalQuestions}.

Topic: ${topicName}
Syllabus Content:
${syllabusContent}

Previous questions covered: ${previousTopics.length > 0 ? previousTopics.join(', ') : 'None'}
Do not repeat questions on these topics.
Ensure good variety in question types: direct recall, clinical scenarios, case studies.`;

    return this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], 'openai/gpt-oss-120b');
  }

  async generateQuizSummary(
    questions: Array<{
      question: string;
      userAnswer: number;
      correctAnswer: number;
      options: Array<{ text: string; isCorrect: boolean }>;
      explanation: string;
      topic: string;
      difficulty: string;
    }>,
    courseTitle: string,
    topics: string[]
  ): Promise<any> {
    const answeredQuestions = questions.map((q, i) => ({
      number: i + 1,
      question: q.question,
      userAnswer: q.userAnswer,
      correctAnswer: q.correctAnswer,
      options: q.options,
      explanation: q.explanation,
      topic: q.topic,
      difficulty: q.difficulty,
      isCorrect: q.userAnswer === q.correctAnswer
    }));

    const correctCount = answeredQuestions.filter(q => q.isCorrect).length;
    const totalCount = answeredQuestions.length;
    const percentage = Math.round((correctCount / totalCount) * 100);

    const systemPrompt = `You are an expert medical/physiotherapy educator providing quiz feedback.
Analyze the quiz results and create a comprehensive summary.
Return ONLY valid JSON in this exact format, no markdown:
{
  "score": ${correctCount},
  "totalQuestions": ${totalCount},
  "percentage": ${percentage},
  "grade": "Excellent/Good/Pass/Needs Improvement",
  "summary": "Brief overall summary of performance",
  "topicWiseAnalysis": [
    {
      "topic": "Topic Name",
      "correct": number,
      "total": number,
      "percentage": number
    }
  ],
  "wrongAnswersExplanation": [
    {
      "questionNumber": 1,
      "question": "Question text",
      "yourAnswer": "What user selected",
      "correctAnswer": "Correct option",
      "explanation": "Detailed explanation of why this is correct",
      "topic": "Topic name"
    }
  ],
  "recommendations": ["List of study recommendations based on weak areas"]
}`;

    const userMessage = `Quiz Results for ${courseTitle}

Topics Covered: ${topics.join(', ')}

${answeredQuestions.map(q => `
Question ${q.number}: ${q.question}
Topic: ${q.topic}
Difficulty: ${q.difficulty}
Your Answer: ${q.userAnswer !== -1 ? q.options[q.userAnswer]?.text || 'No answer' : 'Not answered'}
Correct Answer: ${q.options[q.correctAnswer]?.text || 'Unknown'}
Status: ${q.isCorrect ? '✓ Correct' : '✗ Wrong'}
Explanation: ${q.explanation}
`).join('\n')}

Provide a detailed analysis and recommendations.`;

    return this.chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], 'openai/gpt-oss-120b');
  }

  calculateTimeLimit(numQuestions: number, difficulty: 'easy' | 'medium' | 'hard'): number {
    const baseTimePerQuestion = {
      easy: 1,
      medium: 1.5,
      hard: 2
    };
    return Math.ceil(numQuestions * baseTimePerQuestion[difficulty]);
  }

  classifyQuestion(question: string): string {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('treatment') || 
        lowerQuestion.includes('diagnosis') || 
        lowerQuestion.includes('symptom') || 
        lowerQuestion.includes('pain') ||
        lowerQuestion.includes('injury') ||
        lowerQuestion.includes('rehabilitation')) {
      return 'clinical';
    }
    
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
    
    return 'quick';
  }
}

export default AIService;