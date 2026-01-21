# AI Engine for Medical Science & Physiotherapy

This AI engine integrates LLaMA models via the Grok API to provide intelligent assistance for medical science and physiotherapy content.

## Features

- **Medical Content Analysis**: Analyze medical and physiotherapy content with specialized knowledge
- **Physiotherapy Advice Generation**: Provide evidence-based physiotherapy recommendations
- **Blog Question Answering**: Answer questions based on blog content
- **General Medical Assistance**: Help with various medical science and physiotherapy topics

## API Endpoints

- `POST /api/ai/chat`: General AI chat functionality
- `POST /api/ai/blog-questions`: Answer questions about specific blog content

## Setup

1. Obtain your Grok API key from xAI
2. Add the key to your environment variables as `GROK_API_KEY`
3. The AI engine will automatically use the configured API

## Environment Variables

```
GROK_API_KEY=your_grok_api_key_here
```

## Usage

The AI engine is integrated into the blog pages:
- On individual blog posts, the AI chatbot can answer questions about the specific content
- On the main blog page, the AI chatbot provides general medical science and physiotherapy assistance