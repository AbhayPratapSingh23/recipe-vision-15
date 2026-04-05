import { Flame, Heart, TrendingDown, Leaf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SmartModificationsProps {
  onModify: (modification: string) => void;
  isLoading: boolean;
  activeModification: string | null;
}

const modifications = [
  { label: "Spicy", value: "Make it spicier with more heat and chili", icon: <Flame className="w-5 h-5" />, color: "hover:border-destructive hover:bg-destructive/5 hover:text-destructive" },
  { label: "Healthy", value: "Make it healthier with lower fat and more nutrients", icon: <Heart className="w-5 h-5" />, color: "hover:border-success hover:bg-success/5 hover:text-success" },
  { label: "Low Cal", value: "Reduce calories while keeping the flavor", icon: <TrendingDown className="w-5 h-5" />, color: "hover:border-primary hover:bg-primary/5 hover:text-primary" },
  { label: "Veg", value: "Make it fully vegetarian, replacing all non-veg ingredients", icon: <Leaf className="w-5 h-5" />, color: "hover:border-success hover:bg-success/5 hover:text-success" },
];

const SmartModifications = ({ onModify, isLoading, activeModification }: SmartModificationsProps) => {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Modify Recipe</h3>
      <div className="grid grid-cols-4 gap-2">
        {modifications.map((mod) => (
          <Button
            key={mod.value}
            variant="outline"
            size="sm"
            onClick={() => onModify(mod.value)}
            disabled={isLoading}
            className={`gap-1.5 h-auto py-2.5 flex-col transition-all ${mod.color}`}
          >
            {isLoading && activeModification === mod.value ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              mod.icon
            )}
            <span className="text-[10px] font-medium">{mod.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SmartModifications;
