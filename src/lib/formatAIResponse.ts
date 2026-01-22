import React from 'react';

/**
 * Utility function to format AI responses for better readability
 * Handles markdown-like formatting, lists, headers, and medical content structure
 */

export function formatAIResponse(content: string): React.JSX.Element | null {
  if (!content) {
    return null;
  }

  // Split content into paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  
  return (
    <>
      {paragraphs.map((paragraph, index) => {
        const trimmedPara = paragraph.trim();
        
        // Handle bullet points/lists
        if (trimmedPara.startsWith('- ') || trimmedPara.startsWith('* ') || trimmedPara.startsWith('• ')) {
          const listItems = trimmedPara.split('\n').filter(item => item.trim());
          return (
            <ul key={index} className="list-disc list-inside mb-3 space-y-1">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex} className="ml-2">
                  {formatInlineContent(item.replace(/^[-*•]\s*/, ''))}
                </li>
              ))}
            </ul>
          );
        }
        
        // Handle numbered lists
        if (/^\d+\.\s/.test(trimmedPara)) {
          const listItems = trimmedPara.split('\n').filter(item => item.trim());
          return (
            <ol key={index} className="list-decimal list-inside mb-3 space-y-1">
              {listItems.map((item, itemIndex) => (
                <li key={itemIndex} className="ml-2">
                  {formatInlineContent(item.replace(/^\d+\.\s*/, ''))}
                </li>
              ))}
            </ol>
          );
        }
        
        // Handle headers (markdown style)
        if (trimmedPara.startsWith('# ')) {
          return (
            <h3 key={index} className="text-lg font-semibold text-gray-900 mb-2 mt-4 first:mt-0">
              {formatInlineContent(trimmedPara.substring(2))}
            </h3>
          );
        }
        
        if (trimmedPara.startsWith('## ')) {
          return (
            <h4 key={index} className="text-base font-semibold text-gray-800 mb-2 mt-3 first:mt-0">
              {formatInlineContent(trimmedPara.substring(3))}
            </h4>
          );
        }
        
        // Handle bold text (enclosed in **)
        if (trimmedPara.includes('**')) {
          return (
            <p key={index} className="mb-3 text-gray-700 leading-relaxed">
              {formatInlineContent(trimmedPara)}
            </p>
          );
        }
        
        // Regular paragraph
        return (
          <p key={index} className="mb-3 text-gray-700 leading-relaxed">
            {formatInlineContent(trimmedPara)}
          </p>
        );
      })}
    </>
  );
}

/**
 * Helper function to format inline content with basic markdown support
 */
function formatInlineContent(text: string): React.JSX.Element {
  // Handle bold text (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

/**
 * Alternative simpler formatter for basic text enhancement
 */
export function formatSimpleResponse(content: string): string {
  if (!content) return content;
  
  return content
    // Convert markdown bold to HTML bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert markdown italic to HTML italic  
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert line breaks to HTML breaks
    .replace(/\n/g, '<br />')
    // Convert bullet points to list items
    .replace(/^[-*•]\s+(.*)$/gm, '<li>$1</li>')
    // Wrap consecutive list items in ul tags
    .replace(/(<li>.*<\/li>\s*)+/gs, '<ul class="list-disc list-inside mb-3 ml-2">$&</ul>');
}