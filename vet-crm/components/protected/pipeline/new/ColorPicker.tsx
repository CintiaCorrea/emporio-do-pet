import { ColorOption } from '@/types/board-form';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  isLoading: boolean;
}

export default function ColorPicker({ selectedColor, onColorChange, isLoading }: ColorPickerProps) {
  const colorOptions: ColorOption[] = [
    { name: 'Azul', value: 'bg-blue-500' },
    { name: 'Verde', value: 'bg-green-500' },
    { name: 'Roxo', value: 'bg-purple-500' },
    { name: 'Laranja', value: 'bg-orange-500' },
    { name: 'Rosa', value: 'bg-pink-500' },
    { name: 'Ciano', value: 'bg-cyan-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span style={{fontSize:"14px"}}>🎨</span>
        <label className="block text-lg font-semibold text-gray-900">
          Cor do Board
        </label>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {colorOptions.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onColorChange(color.value)}
            disabled={isLoading}
            className={`group flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              selectedColor === color.value
                ? 'border-blue-500 bg-blue-50/50 shadow-md'
                : 'border-gray-200/80 bg-white/50 hover:border-gray-300 hover:bg-white'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`w-12 h-12 rounded-2xl ${color.value} shadow-inner group-hover:shadow-md transition-shadow`}></div>
            <span className={`text-sm font-medium transition-colors ${
              selectedColor === color.value ? 'text-blue-700' : 'text-gray-700'
            }`}>
              {color.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
