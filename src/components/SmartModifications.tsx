import { Flame, Heart, TrendingDown, Leaf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SmartModificationsProps {
  onModify: (modification: string) => void;
  isLoading: boolean;
  activeModification: string | null;
}

const modifications = [
  { label: "Make it Spicy", value: "Make it spicier with more heat and chili", icon: <Flame className="w-4 h-4" /> },
  { label: "Make it Healthy", value: "Make it healthier with lower fat and more nutrients", icon: <Heart className="w-4 h-4" /> },
  { label: "Reduce Calories", value: "Reduce calories while keeping the flavor", icon: <TrendingDown className="w-4 h-4" /> },
  { label: "Make it Vegetarian", value: "Make it fully vegetarian, replacing all non-veg ingredients", icon: <Leaf className="w-4 h-4" /> },
];

const SmartModifications = ({ onModify, isLoading, activeModification }: SmartModificationsProps) => {
  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-4 md:p-6 border border-primary/20 shadow-lg">
      <h3 className="text-lg font-semibold mb-3">Smart Modifications</h3>
      <p className="text-sm text-muted-foreground mb-4">Customize this recipe with AI</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {modifications.map((mod) => (
          <Button
            key={mod.value}
            variant="outline"
            size="sm"
            onClick={() => onModify(mod.value)}
            disabled={isLoading}
            className="gap-2 h-auto py-3 flex-col hover:border-primary hover:bg-primary/5 transition-all"
          >
            {isLoading && activeModification === mod.value ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              mod.icon
            )}
            <span className="text-xs">{mod.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SmartModifications;
