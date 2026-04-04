import { ChefHat, Heart, Zap, Flame, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RecipeOption {
  title: string;
  description: string;
  tag: string;
  servingSize: number;
  healthRating: number;
  healthRatingReason: string;
  ingredients: string[];
  instructions: string[];
  substitutes?: Record<string, string[]>;
  nutritionalValues: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
  };
}

interface RecipeCardsProps {
  recipes: RecipeOption[];
  onSelect: (recipe: RecipeOption) => void;
}

const tagConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  quick: { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-warning/20 text-warning border-warning/30" },
  healthy: { icon: <Heart className="w-3.5 h-3.5" />, color: "bg-success/20 text-success border-success/30" },
  comfort: { icon: <Flame className="w-3.5 h-3.5" />, color: "bg-destructive/20 text-destructive border-destructive/30" },
  fusion: { icon: <Globe className="w-3.5 h-3.5" />, color: "bg-primary/20 text-primary border-primary/30" },
};

const RecipeCards = ({ recipes, onSelect }: RecipeCardsProps) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl md:text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Choose a Recipe
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Select one of these recipe options to view in detail
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recipes.map((recipe, index) => {
          const tag = tagConfig[recipe.tag] || tagConfig.comfort;
          return (
            <Card
              key={index}
              onClick={() => onSelect(recipe)}
              className="cursor-pointer border-2 hover:border-primary/50 hover:shadow-xl transition-all duration-300 group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                    {recipe.title}
                  </h4>
                  <Badge variant="outline" className={`flex-shrink-0 gap-1 ${tag.color}`}>
                    {tag.icon} {recipe.tag}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{recipe.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{recipe.ingredients.length} ingredients • {recipe.instructions.length} steps</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className={`w-3.5 h-3.5 ${star <= recipe.healthRating ? 'text-warning fill-warning' : 'text-muted-foreground/30 fill-muted-foreground/30'}`} viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center text-xs">
                  <div><span className="text-muted-foreground">Cal</span><br /><span className="font-semibold">{recipe.nutritionalValues.calories}</span></div>
                  <div><span className="text-muted-foreground">Protein</span><br /><span className="font-semibold">{recipe.nutritionalValues.protein}</span></div>
                  <div><span className="text-muted-foreground">Carbs</span><br /><span className="font-semibold">{recipe.nutritionalValues.carbs}</span></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RecipeCards;
