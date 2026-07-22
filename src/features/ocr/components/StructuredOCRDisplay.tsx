// src/features/ocr/components/StructuredOCRDisplay.tsx
import React from 'react';
import { DocumentStructure, LineStructure } from '../types/documentTypes';

interface StructuredOCRDisplayProps {
  structure: DocumentStructure;
  onEdit?: (text: string) => void;
  isEditing?: boolean;
  editedText?: string;
}

export const StructuredOCRDisplay: React.FC<StructuredOCRDisplayProps> = ({
  structure,
  onEdit,
  isEditing,
  editedText
}) => {
  const renderLine = (line: LineStructure, index: number) => {
    const content = line.content || ' ';

    switch (line.type) {
      case 'title':
        return (
          <div key={index} className="py-1 px-2 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded my-0.5">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">📄 {content}</span>
          </div>
        );

      case 'date':
        return (
          <div key={index} className="py-0.5 px-2 bg-green-50 dark:bg-green-900/20 rounded my-0.5">
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">📅 {content}</span>
          </div>
        );

      case 'header':
        return (
          <div key={index} className="py-0.5 px-2 bg-purple-50 dark:bg-purple-900/20 rounded my-0.5">
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">📊 {content}</span>
          </div>
        );

      case 'row':
        return (
          <div key={index} className="py-0.5 px-2 bg-yellow-50 dark:bg-yellow-900/20 rounded ml-6 my-0.5">
            <span className="text-sm font-mono text-yellow-800 dark:text-yellow-300">▶ {content}</span>
          </div>
        );

      case 'signature':
        return (
          <div key={index} className="py-0.5 px-2 bg-gray-100 dark:bg-gray-700/30 rounded border-l-2 border-gray-400 my-0.5">
            <span className="text-sm text-gray-600 dark:text-gray-400 italic">✍️ {content}</span>
          </div>
        );

      case 'note':
        return (
          <div key={index} className="py-0.5 px-2 bg-amber-50 dark:bg-amber-900/20 rounded my-0.5">
            <span className="text-sm text-amber-700 dark:text-amber-300">💡 {content}</span>
          </div>
        );

      case 'empty':
        return <div key={index} className="h-2" />;

      default:
        return (
          <div key={index} className="py-0.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded my-0.5">
            <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap m-0">
              {content}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[200px] max-h-[400px] overflow-auto">
      {isEditing ? (
        <textarea
          value={editedText || structure.rawText}
          onChange={(e) => onEdit?.(e.target.value)}
          className="w-full min-h-[180px] p-3 bg-gray-50 dark:bg-gray-900 border-2 border-blue-400 dark:border-blue-600 rounded-lg text-sm font-mono text-gray-800 dark:text-gray-200 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            fontFamily: '"Courier New", Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.8',
            tabSize: 4,
            whiteSpace: 'pre',
          }}
        />
      ) : (
        <div className="space-y-0.5">
          {structure.structuredLines.map((line, index) => renderLine(line, index))}
        </div>
      )}
    </div>
  );
};

export default StructuredOCRDisplay;