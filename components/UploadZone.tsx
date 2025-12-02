import React, { useCallback } from 'react';
import { Upload, Camera, FileText } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, isProcessing }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  }, [onFileSelect, isProcessing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`relative w-full h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group
        ${isProcessing ? 'border-slate-300 bg-slate-50 cursor-wait' : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/50 cursor-pointer'}
      `}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={isProcessing}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      
      <div className="flex flex-col items-center gap-4 text-slate-500 group-hover:text-indigo-600 transition-colors">
        <div className="p-4 bg-white rounded-full shadow-sm ring-1 ring-slate-100 group-hover:shadow-md transition-shadow">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">
            {isProcessing ? 'Processing Receipt...' : 'Drop receipt or click to upload'}
          </p>
          <p className="text-sm text-slate-400 mt-1">Supports JPG, PNG, WEBP</p>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
