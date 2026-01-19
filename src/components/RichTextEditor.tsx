'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { Editor } from '@tiptap/core';
import { useEffect, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { motion } from 'framer-motion';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
}

export default function RichTextEditor({ content, onChange, onImageUpload }: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Bold.configure(),
      Italic.configure(),
      Underline.configure(),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      BulletList.configure(),
      OrderedList.configure(),
      ListItem.configure(),
      Link.configure({
        openOnClick: false,
      }),
      Image.configure(),
      Table.configure({
        resizable: true,
      }),
      TableRow.configure(),
      TableHeader.configure(),
      TableCell.configure(),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none focus:outline-none min-h-[300px]',
      },
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImageUpload) {
      const url = await onImageUpload(file);
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  };

  if (!mounted) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        Loading editor...
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        Editor failed to load
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1">
        <div className="flex flex-wrap gap-1">
          {/* Formatting buttons */}
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <strong>B</strong>
          </ToolbarButton>
          
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <em>I</em>
          </ToolbarButton>
          
          <ToolbarButton
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <u>U</u>
          </ToolbarButton>
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          
          {/* Headings */}
          {[1, 2, 3].map((level) => (
            <ToolbarButton
              key={level}
              active={editor.isActive('heading', { level })}
              onClick={() => editor.chain().focus().toggleHeading({ level: level as any }).run()}
              title={`Heading ${level}`}
            >
              H{level}
            </ToolbarButton>
          ))}
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          
          {/* Lists */}
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            • List
          </ToolbarButton>
          
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered List"
          >
            1. List
          </ToolbarButton>
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          
          {/* Links */}
          <ToolbarButton
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            title="Insert Link"
          >
            🔗
          </ToolbarButton>
          
          {/* Images */}
          <label className="cursor-pointer">
            <ToolbarButton
              as="span"
              title="Insert Image"
            >
              🖼️
            </ToolbarButton>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
          
          {/* Tables */}
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            title="Insert Table"
          >
            📊
          </ToolbarButton>
        </div>
      </div>
      
      {/* Editor content */}
      <EditorContent 
        editor={editor} 
        className="min-h-[300px] prose max-w-none p-4 focus:outline-none"
      />
    </div>
  );
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
  as?: 'button' | 'span';
}

function ToolbarButton({ 
  active = false, 
  onClick, 
  title, 
  children, 
  as = 'button' 
}: ToolbarButtonProps) {
  const Component = as;
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Component
        type={as === 'button' ? 'button' : undefined}
        onClick={onClick}
        title={title}
        className={`
          px-3 py-1 text-sm rounded transition-colors
          ${active 
            ? 'bg-primary text-white' 
            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }
        `}
      >
        {children}
      </Component>
    </motion.div>
  );
}