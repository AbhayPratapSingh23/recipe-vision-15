import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, ChefHat, LogOut, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface Recipe {
  id?: string;
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
  image_url?: string;
  created_at?: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [currentServings, setCurrentServings] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadSavedRecipes();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        if (event === "SIGNED_IN") {
          loadSavedRecipes();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadSavedRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Map database structure to Recipe interface
        const mappedRecipes: Recipe[] = data.map((r) => ({
          id: r.id,
          title: r.title,
          servingSize: r.serving_size,
          ingredients: r.ingredients as string[],
          instructions: r.instructions as string[],
          substitutes: r.substitutes as Record<string, string[]> | undefined,
          nutritionalValues: r.nutritional_values as {
            calories: string;
            protein: string;
            carbs: string;
            fat: string;
            fiber: string;
          },
          image_url: r.image_url || undefined,
          created_at: r.created_at,
        }));
        setSavedRecipes(mappedRecipes);
      }
    } catch (error) {
      console.error("Error loading recipes:", error);
    }
  };

  const saveRecipe = async (recipeData: Recipe) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("recipes").insert({
        user_id: user.id,
        title: recipeData.title,
        serving_size: recipeData.servingSize,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        substitutes: recipeData.substitutes || null,
        nutritional_values: recipeData.nutritionalValues,
        image_url: selectedImage || null,
      });

      if (error) throw error;

      toast({
        title: "Recipe saved!",
        description: "Added to your recipe collection",
      });

      loadSavedRecipes();
    } catch (error: any) {
      console.error("Error saving recipe:", error);
      toast({
        title: "Error",
        description: "Failed to save recipe",
        variant: "destructive",
      });
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase
        .from("recipes")
        .delete()
        .eq("id", recipeId);

      if (error) throw error;

      toast({
        title: "Recipe deleted",
        description: "Removed from your collection",
      });

      loadSavedRecipes();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast({
        title: "Error",
        description: "Failed to delete recipe",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const loadSavedRecipe = (savedRecipe: Recipe) => {
    setRecipe({
      title: savedRecipe.title,
      ingredients: savedRecipe.ingredients,
      instructions: savedRecipe.instructions,
      servingSize: savedRecipe.servingSize,
      substitutes: savedRecipe.substitutes,
      nutritionalValues: savedRecipe.nutritionalValues,
      id: savedRecipe.id,
    });
    setCurrentServings(savedRecipe.servingSize);
    setSelectedImage(savedRecipe.image_url || null);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        body: { image: selectedImage, language: i18n.language },
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
      
      // Auto-save the recipe
      await saveRecipe(data.recipe);
      
      toast({
        title: "Recipe generated!",
        description: "Your recipe is ready and saved to your collection",
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1"></div>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 flex justify-end gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="w-4 h-4 mr-2" />
              Recipe History
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          AI Recipe Generator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transform Food Photos into Delicious Recipes
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
                          <p className="text-lg font-semibold mb-1">Upload Food Image</p>
                          <p className="text-sm text-muted-foreground">
                            Click to upload an image
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
                        Generating Recipe...
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

          {/* Recipe History */}
          {showHistory && savedRecipes.length > 0 && (
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-primary mb-6">Your Saved Recipes</h2>
                <div className="grid gap-4">
                  {savedRecipes.map((savedRecipe) => (
                    <Card
                      key={savedRecipe.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {savedRecipe.image_url && (
                            <img
                              src={savedRecipe.image_url}
                              alt={savedRecipe.title}
                              className="w-24 h-24 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold mb-2">{savedRecipe.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {savedRecipe.ingredients.length} ingredients • {savedRecipe.instructions.length} steps • Servings: {savedRecipe.servingSize}
                            </p>
                            {savedRecipe.created_at && (
                              <p className="text-xs text-muted-foreground">
                                Created {new Date(savedRecipe.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadSavedRecipe(savedRecipe)}
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => savedRecipe.id && deleteRecipe(savedRecipe.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {showHistory && savedRecipes.length === 0 && (
            <Card className="shadow-xl">
              <CardContent className="p-8 text-center">
                <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Recipes Yet</h3>
                <p className="text-muted-foreground">
                  No saved recipes yet. Generate and save your first recipe!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
