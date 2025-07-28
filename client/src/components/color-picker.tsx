import React, { useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-12 rounded-lg border-2 theme-border shadow-sm cursor-pointer relative"
          style={{ backgroundColor: color }}
          aria-label="Open color picker"
        >
          <div className="absolute inset-0 rounded-lg ring-2 ring-offset-2 ring-transparent hover:ring-gray-300 transition-all" />
        </button>
        
        <div className="flex-1">
          <HexColorInput
            color={color}
            onChange={onChange}
            className="w-full px-3 py-2 border theme-border rounded-md theme-card theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="#000000"
          />
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-3 theme-card border theme-border rounded-lg shadow-lg z-10">
          <HexColorPicker color={color} onChange={onChange} />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full px-3 py-2 text-sm theme-card theme-text-primary border theme-border rounded-md hover:theme-nav-hover transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
