// Define the available models with their characteristics
interface ModelConfig {
  name: string;
  displayName: string;
  speed: number; // tokens per second
  use: string; // primary use case
  dailyLimit: number; // daily request limit
  color: string; // UI color for display
}

// Define the 4 models with their strengths
export const MODELS: Record<string, ModelConfig> = {
  quick: {
    name: "llama-3.1-8b-instant",
    displayName: "Quick Response",
    speed: 560,
    use: "Simple questions, greetings, quick facts",
    dailyLimit: 14400,
    color: "bg-blue-500"
  },
  general: {
    name: "llama-3.3-70b-versatile",
    displayName: "General Chat",
    speed: 280,
    use: "General conversation, explanations, summaries",
    dailyLimit: 2000,
    color: "bg-orange-500"
  },
  clinical: {
    name: "openai/gpt-oss-120b",
    displayName: "Clinical Expert",
    speed: 300,
    use: "Complex diagnosis, treatment plans, clinical reasoning",
    dailyLimit: 1000,
    color: "bg-green-500"
  },
  reasoning: {
    name: "openai/gpt-oss-120b",
    displayName: "Advanced Reasoning",
    speed: 300,
    use: "Deep medical reasoning, research analysis, case studies",
    dailyLimit: 1000,
    color: "bg-purple-500"
  },
};

// Function to automatically classify question type and suggest appropriate model
export const classifyQuestion = (question: string): string => {
  const lowerQuestion = question.toLowerCase();
  
  // Clinical questions
  if (lowerQuestion.includes('treatment') || 
      lowerQuestion.includes('diagnosis') || 
      lowerQuestion.includes('symptom') || 
      lowerQuestion.includes('pain') ||
      lowerQuestion.includes('injury') ||
      lowerQuestion.includes('rehabilitation') ||
      lowerQuestion.includes('therapy') ||
      lowerQuestion.includes('exercise')) {
    return 'clinical';
  }
  
  // Advanced reasoning and research questions (consolidated)
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
      lowerQuestion.includes('relationship') ||
      lowerQuestion.includes('differential') ||
      lowerQuestion.includes('mechanism')) {
    return 'reasoning';
  }
  
  // General conversation and explanations
  if (lowerQuestion.includes('what is') || 
      lowerQuestion.includes('tell me') || 
      lowerQuestion.includes('describe') ||
      lowerQuestion.includes('summarize') ||
      lowerQuestion.includes('difference between') ||
      lowerQuestion.includes('hello') ||
      lowerQuestion.includes('hi ') ||
      lowerQuestion.includes('help me') ||
      lowerQuestion.includes('can you')) {
    return 'general';
  }
  
  // Default to quick for simple questions
  return 'quick';
};

// Function to get model by name
export const getModelByName = (modelName: string): string | undefined => {
  for (const [key, model] of Object.entries(MODELS)) {
    if (model.name === modelName) {
      return key;
    }
  }
  return undefined;
};

// Function to get model display info
export const getModelInfo = (modelKey: string): ModelConfig | undefined => {
  return MODELS[modelKey];
};