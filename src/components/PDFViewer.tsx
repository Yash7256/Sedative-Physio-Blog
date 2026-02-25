"use client";

import React from 'react';

type Props = {
  url: string;
  title?: string | null;
  onClose: () => void;
};

const PDFViewer: React.FC<Props> = ({ url, title, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white w-11/12 md:w-3/4 lg:w-2/3 h-5/6 rounded-lg overflow-hidden shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-lg font-medium truncate">{title || 'PDF Preview'}</h3>
          <div className="space-x-2">
            <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1 text-sm bg-gray-100 rounded-md">Open in new tab</a>
            <button onClick={onClose} className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded-md">Close</button>
          </div>
        </div>

        <div className="flex-1">
          <iframe src={url} title={title || 'PDF Preview'} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
