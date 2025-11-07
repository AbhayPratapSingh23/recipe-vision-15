import { useState } from "react";
import { Upload, Loader2, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  servingSize: number;
  substitutes?: Record<string, string[]>;
  nutritionalValues: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    fiber: string;
  };
}

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentServings, setCurrentServings] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setRecipe(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateRecipe = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe", {
        body: { image: selectedImage },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Invalid Image",
          description: data.error,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setRecipe(data.recipe);
      setCurrentServings(data.recipe.servingSize || 1);
      toast({
        title: "Recipe generated!",
        description: "Your recipe is ready to view",
      });
    } catch (error) {
      console.error("Error generating recipe:", error);
      toast({
        title: "Error",
        description: "Failed to generate recipe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scaleIngredient = (ingredient: string): string => {
    if (!recipe) return ingredient;
    const scale = currentServings / recipe.servingSize;
    if (scale === 1) return ingredient;
    
    // Extract numbers and scale them
    return ingredient.replace(/(\d+(?:\.\d+)?)\s*([½¼¾⅓⅔⅛⅜⅝⅞])?/g, (match, num, fraction) => {
      let value = parseFloat(num);
      if (fraction) {
        const fractionMap: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
        value += fractionMap[fraction] || 0;
      }
      const scaled = (value * scale).toFixed(2).replace(/\.?0+$/, '');
      return scaled;
    });
  };

  const downloadRecipe = () => {
    if (!recipe) return;

    const scaledIngredients = recipe.ingredients.map(i => scaleIngredient(i));
    const content = `${recipe.title}\n\nServing Size: ${currentServings}\n\nIngredients:\n${scaledIngredients.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nInstructions:\n${recipe.instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nNutritional Values (per serving):\nCalories: ${recipe.nutritionalValues.calories}\nProtein: ${recipe.nutritionalValues.protein}\nCarbs: ${recipe.nutritionalValues.carbs}\nFat: ${recipe.nutritionalValues.fat}\nFiber: ${recipe.nutritionalValues.fiber}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.title.replace(/\s+/g, '_')}_recipe.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadIngredients = () => {
    if (!recipe) return;

    const scaledIngredients = recipe.ingredients.map(i => scaleIngredient(i));
    const content = `Ingredients for ${recipe.title}\n\nServing Size: ${currentServings}\n\n${scaledIngredients.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.title.replace(/\s+/g, '_')}_ingredients.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <ChefHat className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          AI Recipe Generator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transform any food photo into a complete recipe with ingredients and step-by-step instructions
        </p>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Section */}
          <Card className="border-2 border-dashed hover:border-primary/50 transition-all duration-300 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-4">
                    {selectedImage ? (
                      <div className="relative w-full max-w-md mx-auto">
                        <img
                          src={selectedImage}
                          alt="Selected food"
                          className="rounded-lg w-full h-auto object-cover shadow-md"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <p className="text-white font-medium">Click to change image</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                          <Upload className="w-12 h-12 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold mb-1">Upload a food image</p>
                          <p className="text-sm text-muted-foreground">
                            Click to browse or drag and drop (Max 5MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {selectedImage && (
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={generateRecipe}
                    disabled={isLoading}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing your dish...
                      </>
                    ) : (
                      <>
                        <ChefHat className="mr-2 h-5 w-5" />
                        Generate Recipe
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loading Skeleton */}
          {isLoading && (
            <Card className="shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <CardContent className="p-8">
                <div className="space-y-6">
                  {/* Title Skeleton */}
                  <div className="h-8 bg-secondary/30 rounded animate-pulse w-2/3"></div>
                  
                  {/* Nutritional Values Skeleton */}
                  <div className="bg-secondary/30 rounded-lg p-4">
                    <div className="h-6 bg-secondary/50 rounded animate-pulse w-1/3 mb-3"></div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="text-center space-y-2">
                          <div className="h-4 bg-secondary/50 rounded animate-pulse w-16 mx-auto"></div>
                          <div className="h-6 bg-secondary/50 rounded animate-pulse w-12 mx-auto"></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ingredients Skeleton */}
                  <div>
                    <div className="h-6 bg-secondary/30 rounded animate-pulse w-1/4 mb-3"></div>
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-secondary/50 animate-pulse"></div>
                          <div className="h-4 bg-secondary/30 rounded animate-pulse flex-1"></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions Skeleton */}
                  <div>
                    <div className="h-6 bg-secondary/30 rounded animate-pulse w-1/4 mb-3"></div>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="h-6 w-6 rounded-full bg-secondary/50 animate-pulse flex-shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-secondary/30 rounded animate-pulse"></div>
                            <div className="h-4 bg-secondary/30 rounded animate-pulse w-5/6"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recipe Display */}
          {recipe && !isLoading && (
            <Card className="shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                  <h2 className="text-3xl font-bold text-primary">{recipe.title}</h2>
                  <div className="flex gap-2">
                    <Button onClick={downloadIngredients} variant="outline" size="sm">
                      Download Ingredients
                    </Button>
                    <Button onClick={downloadRecipe} variant="outline" size="sm">
                      Download Recipe
                    </Button>
                  </div>
                </div>

                {/* Serving Size Adjuster */}
                <div className="bg-accent/10 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between max-w-xs mx-auto">
                    <span className="text-sm font-medium text-muted-foreground">Servings:</span>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentServings(Math.max(1, currentServings - 1))}
                        disabled={currentServings <= 1}
                      >
                        -
                      </Button>
                      <span className="text-lg font-bold w-12 text-center">{currentServings}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentServings(currentServings + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Nutritional Values */}
                  <div className="bg-secondary/30 rounded-lg p-4">
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent"></span>
                      Nutritional Values (per serving)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Calories</p>
                        <p className="text-lg font-semibold">{recipe.nutritionalValues.calories}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Protein</p>
                        <p className="text-lg font-semibold">{recipe.nutritionalValues.protein}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Carbs</p>
                        <p className="text-lg font-semibold">{recipe.nutritionalValues.carbs}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Fat</p>
                        <p className="text-lg font-semibold">{recipe.nutritionalValues.fat}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Fiber</p>
                        <p className="text-lg font-semibold">{recipe.nutritionalValues.fiber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Ingredients
                    </h3>
                    <ul className="space-y-3 ml-4">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex flex-col gap-1">
                          <div className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-foreground">{scaleIngredient(ingredient)}</span>
                          </div>
                          {recipe.substitutes && recipe.substitutes[ingredient] && (
                            <div className="ml-5 text-sm text-muted-foreground">
                              <span className="italic">Substitutes: {recipe.substitutes[ingredient].join(", ")}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent"></span>
                      Instructions
                    </h3>
                    <ol className="space-y-3 ml-4">
                      {recipe.instructions.map((instruction, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </span>
                          <span className="text-foreground pt-0.5">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedImage(null);
                      setRecipe(null);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Generate Another Recipe
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
