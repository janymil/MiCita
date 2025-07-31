import { cn } from "@/lib/utils";

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
    count?: number;
  };
  onClick?: (categoryId: string) => void;
  className?: string;
}

const iconMap: Record<string, string> = {
  cut: "✂️",
  heartbeat: "❤️",
  dumbbell: "💪",
  utensils: "🍽️",
  coffee: "☕",
  car: "🚗",
  "graduation-cap": "🎓",
  home: "🏠",
  settings: "⚙️"
};

export default function CategoryCard({ category, onClick, className }: CategoryCardProps) {
  return (
    <div
      className={cn(
        "group cursor-pointer rounded-2xl p-6 text-center hover:scale-105 transition-all duration-200 shadow-lg",
        category.color,
        className
      )}
      onClick={() => onClick?.(category.id)}
    >
      <div className="text-white text-2xl mb-3">
        {iconMap[category.icon] || "📦"}
      </div>
      <div className="text-white font-semibold text-sm mb-1">
        {category.name}
      </div>
      {category.count && (
        <div className="text-white/80 text-xs">
          {category.count.toLocaleString()}
        </div>
      )}
    </div>
  );
}