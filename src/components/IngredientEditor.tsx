import { useState } from "react";
import { X, Plus, ChefHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IngredientEditorProps {
  ingredients: string[];
  onGenerate: (ingredients: string[]) => void;
  isLoading: boolean;
}

const IngredientEditor = ({ ingredients: initialIngredients, onGenerate, isLoading }: IngredientEditorProps) => {
  const [ingredients, setIngredients] = useState<string[]>(initialIngredients);
  const [newIngredient, setNewIngredient] = useState("");

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients(prev => [...prev, trimmed]);
      setNewIngredient("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient();
    }
  };

  return (
    <Card className="shadow-xl border-2 border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Detected Ingredients
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Review and edit the detected ingredients before generating recipes
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {ingredients.map((ing, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-sm py-1.5 px-3 gap-1.5 hover:bg-destructive/10 transition-colors"
            >
              {ing}
              <button onClick={() => removeIngredient(index)} className="hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Add an ingredient..."
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={addIngredient} disabled={!newIngredient.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <Button
          onClick={() => onGenerate(ingredients)}
          disabled={ingredients.length === 0 || isLoading}
          className="w-full bg-gradient-to-r from-primary via-accent to-primary transition-all shadow-lg hover:shadow-xl"
          size="lg"
        >
          {isLoading ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Recipes...</>
          ) : (
            <><ChefHat className="mr-2 h-5 w-5" /> Generate Recipes ({ingredients.length} ingredients)</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default IngredientEditor;
