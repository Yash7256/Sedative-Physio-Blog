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
  clinical: {
    name: "llama-3.3-70b-versatile", 
    displayName: "Clinical Expert",
    speed: 280,
    use: "Complex diagnosis, treatment plans",
    dailyLimit: 1000,
    color: "bg-green-500"
  },
  reasoning: {
    name: "llama3-groq-70b-8192-tool-use-preview",
    displayName: "Advanced Reasoning",
    speed: 350,
    use: "Deep medical reasoning, research analysis, case studies",
    dailyLimit: 1000,
    color: "bg-purple-500"
  },
  // Research functionality now consolidated with reasoning model
  // research: { REMOVED - using reasoning model for both }
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
      lowerQuestion.includes('rehabilitation')) {
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
      lowerQuestion.includes('relationship')) {
    return 'reasoning';
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