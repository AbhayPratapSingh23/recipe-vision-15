import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, ChefHat, LogOut, History, Trash2, Camera, SwitchCamera, ZoomIn, ZoomOut, ExternalLink, ShoppingCart, Search, ArrowLeft, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import IngredientEditor from "@/components/IngredientEditor";
import RecipeCards from "@/components/RecipeCards";
import CookingMode from "@/components/CookingMode";
import SmartModifications from "@/components/SmartModifications";
import RecipeSearch from "@/components/RecipeSearch";
import logoBlinkit from "@/assets/logo-blinkit.png";
import logoZepto from "@/assets/logo-zepto.png";
import logoSwiggy from "@/assets/logo-swiggy.png";
import logoBigbasket from "@/assets/logo-bigbasket.png";
import logoJiomart from "@/assets/logo-jiomart.png";

interface IngredientLabel {
  name: string;
  x: number;
  y: number;
}

interface Recipe {
  id?: string;
  title: string;
  description?: string;
  tag?: string;
  ingredients: string[];
  instructions: string[];
  servingSize: number;
  substitutes?: Record<string, string[]>;
  healthRating?: number;
  healthRatingReason?: string;
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

// Flow stages
type Stage = "upload" | "editIngredients" | "viewRecipe";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeOptions, setRecipeOptions] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [currentServings, setCurrentServings] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [activeModification, setActiveModification] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [zoom, setZoom] = useState<number>(1);
  const [ingredientLabels, setIngredientLabels] = useState<IngredientLabel[]>([]);
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [stage, setStage] = useState<Stage>("upload");
  const [showCookingMode, setShowCookingMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { i18n } = useTranslation();

  const sampleImages = [
    { id: 1, url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400", name: "Butter Chicken" },
    { id: 2, url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400", name: "South Indian Thali" },
    { id: 3, url: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400", name: "Biryani" },
    { id: 4, url: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400", name: "Pav Bhaji" },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadSavedRecipes();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        if (event === "SIGNED_IN") loadSavedRecipes();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadSavedRecipes = async () => {
    try {
      const { data, error } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        const mappedRecipes: Recipe[] = data.map((r) => ({
          id: r.id,
          title: r.title,
          servingSize: r.serving_size,
          ingredients: r.ingredients as string[],
          instructions: r.instructions as string[],
          substitutes: r.substitutes as Record<string, string[]> | undefined,
          nutritionalValues: r.nutritional_values as { calories: string; protein: string; carbs: string; fat: string; fiber: string; },
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
        image_url: recipeData.image_url || selectedImage || null,
      });
      if (error) throw error;
      toast({ title: "Recipe saved!", description: "Added to your recipe collection" });
      loadSavedRecipes();
    } catch (error: any) {
      console.error("Error saving recipe:", error);
      toast({ title: "Error", description: "Failed to save recipe", variant: "destructive" });
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
      if (error) throw error;
      toast({ title: "Recipe deleted", description: "Removed from your collection" });
      loadSavedRecipes();
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast({ title: "Error", description: "Failed to delete recipe", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const loadSavedRecipe = (savedRecipe: Recipe) => {
    setRecipe(savedRecipe);
    setCurrentServings(savedRecipe.servingSize);
    setSelectedImage(savedRecipe.image_url || null);
    setStage("viewRecipe");
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please upload an image smaller than 5MB", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setRecipe(null);
        setRecipeOptions([]);
        setIngredientLabels([]);
        setDetectedIngredients([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSampleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setRecipe(null);
    setRecipeOptions([]);
    setIngredientLabels([]);
    setDetectedIngredients([]);
    toast({ title: "Sample image selected", description: "Click Generate Recipe to continue" });
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } } });
      setStream(mediaStream);
      setIsCameraActive(true);
      setTimeout(() => {
        const video = document.getElementById("camera-preview") as HTMLVideoElement;
        if (video) {
          video.srcObject = mediaStream;
          video.setAttribute('playsinline', 'true');
          video.play().catch(console.error);
        }
      }, 100);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({ title: "Camera access denied", description: "Please allow camera access", variant: "destructive" });
    }
  };

  const flipCamera = async () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    await startCamera(newMode);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities() as any;
    if (!capabilities.zoom) { toast({ title: "Zoom not supported", variant: "destructive" }); return; }
    const settings = videoTrack.getSettings() as any;
    const currentZoom = settings.zoom || 1;
    let newZoom = direction === 'in' ? Math.min(currentZoom + 0.5, capabilities.zoom.max) : Math.max(currentZoom - 0.5, capabilities.zoom.min);
    videoTrack.applyConstraints({ advanced: [{ zoom: newZoom } as any] }).then(() => setZoom(newZoom)).catch(() => toast({ title: "Zoom failed", variant: "destructive" }));
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById("camera-preview") as HTMLVideoElement;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg");
      setSelectedImage(imageData);
      setRecipe(null);
      setRecipeOptions([]);
      stopCamera();
      toast({ title: "Photo captured", description: "Click Generate Recipe to continue" });
    }
  };

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [stream]);

  // Step 1: Analyze image to detect ingredients, then go to edit step
  const analyzeAndEditIngredients = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setStage("upload"); // stay on upload while analyzing
    setLoadingProgress(0);

    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => prev >= 90 ? (clearInterval(progressInterval), 90) : prev + Math.random() * 15);
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-ingredients", {
        body: { image: selectedImage },
      });
      if (error) throw error;
      if (data?.labels) {
        setIngredientLabels(data.labels);
        setDetectedIngredients(data.labels.map((l: IngredientLabel) => l.name));
      }
      setLoadingProgress(100);
      setStage("editIngredients");
    } catch (error) {
      console.error("Error analyzing ingredients:", error);
      toast({ title: "Analysis failed", description: "Could not detect ingredients", variant: "destructive" });
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setLoadingProgress(0);
    }
  };

  // Step 2: Generate a single recipe from ingredients
  const generateRecipeFromIngredients = async (ingredients: string[]) => {
    setIsLoading(true);
    setLoadingProgress(0);
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => prev >= 90 ? (clearInterval(progressInterval), 90) : prev + Math.random() * 12);
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke("generate-recipes", {
        body: { ingredients, language: i18n.language },
      });
      if (error) throw error;
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setLoadingProgress(100);
      const recipes = data.recipes || [];
      if (recipes.length > 0) {
        const selected = recipes[0];
        setRecipe(selected);
        setCurrentServings(selected.servingSize || 1);
        setStage("viewRecipe");
        await saveRecipe(selected);
        toast({ title: "Recipe generated!", description: "Your recipe is ready" });
      }
    } catch (error) {
      console.error("Error generating recipe:", error);
      toast({ title: "Error", description: "Failed to generate recipe", variant: "destructive" });
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  // Step 3: Select a recipe
  const selectRecipe = async (selected: Recipe) => {
    setRecipe(selected);
    setCurrentServings(selected.servingSize || 1);
    setStage("viewRecipe");
    await saveRecipe(selected);
    toast({ title: "Recipe selected!", description: "Your recipe is ready and saved" });
  };

  // Search recipe by name
  const searchRecipe = async (query: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-recipe", {
        body: { query, language: i18n.language },
      });
      if (error) throw error;
      if (data.error) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }

      const recipeWithImage: Recipe = { ...data.recipe };

      try {
        const wikiResponse = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(`${recipeWithImage.title} dish food`)}&gsrlimit=1&prop=pageimages|info&piprop=original&pithumbsize=1200&inprop=url&origin=*`
        );

        if (wikiResponse.ok) {
          const wikiData = await wikiResponse.json();
          const pages = (wikiData?.query?.pages ?? {}) as Record<string, { original?: { source?: string }; thumbnail?: { source?: string } }>;
          const firstPage = Object.values(pages)[0];
          recipeWithImage.image_url = firstPage?.original?.source || firstPage?.thumbnail?.source;
        }

        if (!recipeWithImage.image_url) {
          const mealResponse = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(recipeWithImage.title)}`);
          if (mealResponse.ok) {
            const mealData = await mealResponse.json();
            recipeWithImage.image_url = mealData?.meals?.[0]?.strMealThumb || undefined;
          }
        }
      } catch (imageError) {
        console.error("Error fetching dish image:", imageError);
      }

      setRecipe(recipeWithImage);
      setCurrentServings(recipeWithImage.servingSize || 1);
      setSelectedImage(null);
      setIngredientLabels([]);
      setStage("viewRecipe");
      await saveRecipe(recipeWithImage);
      toast({ title: "Recipe found!", description: `${recipeWithImage.title} is ready` });
    } catch (error) {
      console.error("Error searching recipe:", error);
      toast({ title: "Error", description: "Failed to search recipe", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // Smart modification
  const modifyRecipe = async (modification: string) => {
    if (!recipe) return;
    setIsModifying(true);
    setActiveModification(modification);
    try {
      const { data, error } = await supabase.functions.invoke("modify-recipe", {
        body: { recipe, modification, language: i18n.language },
      });
      if (error) throw error;
      if (data.error) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      setRecipe(data.recipe);
      setCurrentServings(data.recipe.servingSize || 1);
      toast({ title: "Recipe modified!", description: `Applied: ${modification.split(",")[0]}` });
    } catch (error) {
      console.error("Error modifying recipe:", error);
      toast({ title: "Error", description: "Failed to modify recipe", variant: "destructive" });
    } finally {
      setIsModifying(false);
      setActiveModification(null);
    }
  };

  const resetToUpload = () => {
    setStage("upload");
    setRecipe(null);
    setRecipeOptions([]);
    setSelectedImage(null);
    setIngredientLabels([]);
    setDetectedIngredients([]);
  };

  const scaleIngredient = (ingredient: string): string => {
    if (!recipe) return ingredient;
    const scale = currentServings / recipe.servingSize;
    if (scale === 1) return ingredient;
    return ingredient.replace(/(\d+(?:\.\d+)?)\s*([½¼¾⅓⅔⅛⅜⅝⅞])?/g, (match, num, fraction) => {
      let value = parseFloat(num);
      if (fraction) {
        const fractionMap: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
        value += fractionMap[fraction] || 0;
      }
      return (value * scale).toFixed(2).replace(/\.?0+$/, '');
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

  // Cooking mode
  if (showCookingMode && recipe) {
    return <CookingMode title={recipe.title} instructions={recipe.instructions} onClose={() => setShowCookingMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 relative overflow-hidden">
      {/* Header */}
      <header className="container mx-auto px-4 py-8 md:py-16 text-center relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex-1 hidden md:block"></div>
          <div className="flex-1 flex justify-center gap-2">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              AI Recipe Generator
            </h1>
          </div>
          <div className="flex-1 flex justify-center md:justify-end gap-2 flex-wrap">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="transition-all hover:border-primary">
              <History className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Recipe History</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="transition-all hover:border-destructive">
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Transform Food Photos into Delicious Recipes
        </p>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16 relative z-10">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          {/* Search Bar - always visible on upload stage */}
          {stage === "upload" && (
            <Card className="border-2 border-primary/20 shadow-lg backdrop-blur-sm bg-card/95">
              <CardContent className="p-4 md:p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Search for a Recipe
                </h3>
                <RecipeSearch onSearch={searchRecipe} isLoading={isSearching} />
              </CardContent>
            </Card>
          )}

          {/* Back button when not on upload */}
          {stage !== "upload" && (
            <Button variant="outline" onClick={resetToUpload} className="transition-all hover:border-primary" disabled={isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Start Over
            </Button>
          )}

          {/* STAGE: UPLOAD */}
          {stage === "upload" && !isAnalyzing && (
            <>
              {/* Upload Section */}
              <Card className="border-2 border-dashed hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl backdrop-blur-sm bg-card/95">
                <CardContent className="p-6 md:p-8">
                  <div className="text-center">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-4">
                        {selectedImage ? (
                          <div className="relative w-full max-w-md mx-auto">
                            <img src={selectedImage} alt="Selected food" className="rounded-lg w-full h-auto object-cover shadow-md" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <p className="text-white font-medium">Click to change image</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-16 h-16 text-primary" />
                            <div>
                              <p className="text-lg md:text-xl font-semibold mb-1">Upload Food Image</p>
                              <p className="text-sm md:text-base text-muted-foreground">Click to upload or drag & drop</p>
                            </div>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  {selectedImage && (
                    <div className="mt-6 flex justify-center">
                      <Button onClick={analyzeAndEditIngredients} disabled={isAnalyzing} size="lg" className="bg-gradient-to-r from-primary via-accent to-primary transition-all duration-300 shadow-lg hover:shadow-xl">
                        <ChefHat className="mr-2 h-5 w-5" /> Detect Ingredients & Generate
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Camera Section */}
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl backdrop-blur-sm bg-card/95">
                <CardContent className="p-6 md:p-8">
                  <div className="text-center">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2">Capture with Camera</h3>
                    <p className="text-sm md:text-base text-muted-foreground mb-6">Take a photo of your food directly</p>
                    {!isCameraActive ? (
                      <Button onClick={() => startCamera()} size="lg" variant="outline" className="hover:bg-gradient-to-r hover:from-primary hover:to-accent hover:text-white transition-all duration-300 hover:shadow-lg border-2">
                        <Camera className="mr-2 h-5 w-5" /> Open Camera
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative max-w-md mx-auto rounded-lg overflow-hidden bg-black">
                          <video id="camera-preview" autoPlay playsInline muted className="w-full h-auto min-h-[300px] bg-black" style={{ objectFit: 'cover' }} />
                          <Button onClick={flipCamera} size="icon" variant="secondary" className="absolute top-4 right-4 rounded-full"><SwitchCamera className="h-5 w-5" /></Button>
                          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                            <Button onClick={() => handleZoom('in')} size="icon" variant="secondary" className="rounded-full"><ZoomIn className="h-5 w-5" /></Button>
                            <Button onClick={() => handleZoom('out')} size="icon" variant="secondary" className="rounded-full"><ZoomOut className="h-5 w-5" /></Button>
                          </div>
                        </div>
                        <div className="flex gap-3 justify-center flex-wrap">
                          <Button onClick={capturePhoto} size="lg" className="bg-gradient-to-r from-primary via-accent to-primary transition-all duration-300 shadow-lg"><Camera className="mr-2 h-5 w-5" /> Capture Photo</Button>
                          <Button onClick={stopCamera} size="lg" variant="outline" className="hover:border-destructive hover:text-destructive transition-all">Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sample Images */}
              <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl backdrop-blur-sm bg-card/95">
                <CardContent className="p-6 md:p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl md:text-2xl font-semibold mb-2">Choose from Sample Images</h3>
                    <p className="text-sm md:text-base text-muted-foreground">Try our AI with these delicious samples</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {sampleImages.map((sample) => (
                      <div key={sample.id} onClick={() => handleSampleImageSelect(sample.url)} className="cursor-pointer group relative overflow-hidden rounded-xl border-2 border-border hover:border-primary transition-all duration-300 shadow-md hover:shadow-xl">
                        <img src={sample.url} alt={sample.name} className="w-full h-28 md:h-32 object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Analyzing progress */}
          {isAnalyzing && (
            <Card className="shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <h3 className="text-xl font-semibold">Detecting Ingredients...</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Analyzing your food image with AI</p>
                    <Progress value={loadingProgress} className="h-3 max-w-md mx-auto" />
                    <p className="text-xs text-muted-foreground">{Math.round(loadingProgress)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAGE: EDIT INGREDIENTS */}
          {stage === "editIngredients" && (
            <>
              {/* Show image with labels */}
              {selectedImage && (
                <div className="relative inline-block w-full max-w-lg mx-auto rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg">
                  <img src={selectedImage} alt="Analyzed dish" className="w-full h-auto block" />
                  {ingredientLabels.map((label, index) => (
                    <div key={index} className="absolute" style={{ left: `${label.x}%`, top: `${label.y}%`, transform: 'translate(-50%, -50%)' }}>
                      <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-lg" />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap bg-primary/90 text-primary-foreground text-xs font-semibold px-2 py-1 rounded-md shadow-lg backdrop-blur-sm">
                        {label.name}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[6px] border-r-primary/90" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <IngredientEditor ingredients={detectedIngredients} onGenerate={generateRecipeFromIngredients} isLoading={isLoading} />
            </>
          )}

          {/* Loading for recipe generation */}
          {isLoading && stage === "editIngredients" && (
            <Card className="shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <CardContent className="p-8">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <h3 className="text-xl font-semibold">Generating Recipe Options...</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {loadingProgress < 30 ? "Analyzing ingredients..." : loadingProgress < 60 ? "Crafting recipes..." : loadingProgress < 85 ? "Adding nutritional info..." : "Almost done!"}
                  </p>
                  <Progress value={loadingProgress} className="h-3 max-w-md mx-auto" />
                  <p className="text-xs text-muted-foreground">{Math.round(loadingProgress)}%</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAGE: VIEW RECIPE */}
          {stage === "viewRecipe" && recipe && (
            <Card className="shadow-2xl backdrop-blur-sm bg-card/95 border-2 border-primary/20">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{recipe.title}</h2>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => setShowCookingMode(true)} size="sm" className="bg-gradient-to-r from-primary to-accent gap-1">
                      <Play className="w-4 h-4" /> Cooking Mode
                    </Button>
                    <Button onClick={downloadIngredients} variant="outline" size="sm">Download Ingredients</Button>
                    <Button onClick={downloadRecipe} variant="outline" size="sm">Download Recipe</Button>
                  </div>
                </div>

                {/* Ingredient Detection on Image */}
                {(selectedImage || recipe.image_url) && (
                  <div className="mb-6">
                    <h3 className="text-lg md:text-xl font-semibold flex items-center gap-2 mb-3">
                      <Search className="w-5 h-5 text-primary" /> {ingredientLabels.length > 0 ? "Ingredient Detection" : "Dish Image"}
                    </h3>
                    <div className="relative inline-block w-full max-w-lg mx-auto rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg">
                      <img src={selectedImage || recipe.image_url || undefined} alt={recipe.title} className="w-full h-auto block" />
                      {ingredientLabels.map((label, index) => (
                        <div key={index} className="absolute" style={{ left: `${label.x}%`, top: `${label.y}%`, transform: 'translate(-50%, -50%)' }}>
                          <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow-lg" />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap bg-primary/90 text-primary-foreground text-xs font-semibold px-2 py-1 rounded-md shadow-lg backdrop-blur-sm">
                            {label.name}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[6px] border-r-primary/90" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Serving Size */}
                <div className="bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 rounded-xl p-4 md:p-6 mb-6 border border-primary/20 shadow-lg">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-md mx-auto">
                    <span className="text-sm md:text-base font-medium text-foreground">Servings:</span>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => setCurrentServings(Math.max(1, currentServings - 1))} disabled={currentServings <= 1} className="transition-all hover:bg-primary hover:text-white">-</Button>
                      <span className="text-xl md:text-2xl font-bold w-12 text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{currentServings}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentServings(currentServings + 1)} className="transition-all hover:bg-primary hover:text-white">+</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Health Rating */}
                  {recipe.healthRating !== undefined && recipe.healthRating > 0 && (
                    <div className="bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 rounded-xl p-4 md:p-6 border border-primary/20 shadow-lg">
                      <h3 className="text-lg md:text-xl font-semibold mb-3">Health Rating</h3>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg key={star} className={`w-7 h-7 md:w-8 md:h-8 ${star <= recipe.healthRating! ? 'text-warning fill-warning' : 'text-muted-foreground/30 fill-muted-foreground/30'}`} viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-xl md:text-2xl font-bold text-primary">{recipe.healthRating}/5</span>
                        </div>
                        {recipe.healthRatingReason && (
                          <p className="text-sm text-muted-foreground italic max-w-[60%] text-right">{recipe.healthRatingReason}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Nutritional Values */}
                  <div className="bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 rounded-xl p-4 md:p-6 border border-primary/20 shadow-lg">
                    <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">Nutritional Values ({currentServings} serving{currentServings > 1 ? 's' : ''})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4">
                      {(["calories", "protein", "carbs", "fat", "fiber"] as const).map((key) => {
                        const raw = recipe.nutritionalValues[key];
                        const num = parseFloat(raw);
                        const unit = raw.replace(/[\d.]+\s*/, '');
                        const scaled = !isNaN(num) ? Math.round(num * (currentServings / (recipe.servingSize || 1))) : null;
                        return (
                          <div key={key} className="text-center p-3 bg-card/50 rounded-lg">
                            <p className="text-xs md:text-sm text-muted-foreground mb-1 capitalize">{key}</p>
                            <p className="text-base md:text-lg font-bold text-primary">{scaled !== null ? `${scaled} ${unit}` : raw}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ingredients & Instructions Tabs */}
                  <Tabs defaultValue="ingredients" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="ingredients">Ingredients ({recipe.ingredients.length})</TabsTrigger>
                      <TabsTrigger value="instructions">Instructions ({recipe.instructions.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ingredients" className="mt-3">
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 md:p-4 border border-primary/20 max-h-72 overflow-y-auto">
                        <ul className="space-y-1">
                          {recipe.ingredients.map((ingredient, index) => (
                            <li key={index} className="flex flex-col gap-0.5 p-1.5 rounded hover:bg-card/50 transition-all">
                              <div className="flex items-start gap-2">
                                <span className="text-primary text-sm mt-0.5">•</span>
                                <span className="text-foreground text-sm">{scaleIngredient(ingredient)}</span>
                              </div>
                              {recipe.substitutes && recipe.substitutes[ingredient] && (
                                <div className="ml-5 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                                  <span className="italic">Alt: {recipe.substitutes[ingredient].join(", ")}</span>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TabsContent>
                    <TabsContent value="instructions" className="mt-3">
                      <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-3 md:p-4 border border-accent/20 max-h-72 overflow-y-auto">
                        <ol className="space-y-2">
                          {recipe.instructions.map((instruction, index) => (
                            <li key={index} className="flex items-start gap-2 p-1.5 rounded hover:bg-card/50 transition-all">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-glow text-white flex items-center justify-center text-xs font-bold shadow">{index + 1}</span>
                              <span className="text-foreground text-sm pt-0.5">{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Smart Modifications */}
                  <SmartModifications onModify={modifyRecipe} isLoading={isModifying} activeModification={activeModification} />

                  {/* YouTube Video */}
                  <div className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-xl p-4 md:p-6 border border-primary/20 shadow-lg">
                    <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">Watch Recipe Video</h3>
                    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.title + ' recipe')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border hover:border-primary hover:shadow-md transition-all group">
                      <div className="w-20 h-14 md:w-28 md:h-20 rounded-xl overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform shadow-md relative">
                        {recipe.image_url || selectedImage ? (
                          <>
                            <img src={recipe.image_url || selectedImage || undefined} alt={recipe.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground fill-current drop-shadow-lg">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full relative">
                            <div className="w-full h-full bg-gradient-to-br from-primary to-accent" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground fill-current drop-shadow-lg"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base md:text-lg text-foreground group-hover:text-primary transition-colors">{recipe.title} - Recipe Video</p>
                        <p className="text-sm text-muted-foreground mt-1">Watch step-by-step cooking tutorials on YouTube</p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                    </a>
                  </div>

                  {/* Quick Commerce */}
                  <div className="bg-gradient-to-br from-accent/10 to-primary/5 rounded-xl p-4 md:p-6 border border-primary/20 shadow-lg">
                    <h3 className="text-lg md:text-xl font-semibold mb-2 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" /> Buy Ingredients
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">Order ingredients from your favorite platform</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {[
                        { name: "Blinkit", url: "https://blinkit.com/s/?q=", logo: logoBlinkit },
                        { name: "Zepto", url: "https://www.zeptonow.com/search?query=", logo: logoZepto },
                        { name: "Swiggy", url: "https://www.swiggy.com/instamart/search?query=", logo: logoSwiggy },
                        { name: "BigBasket", url: "https://www.bigbasket.com/ps/?q=", logo: logoBigbasket },
                        { name: "JioMart", url: "https://www.jiomart.com/search/", logo: logoJiomart },
                      ].map((platform) => (
                        <a key={platform.name} href={`${platform.url}${encodeURIComponent(recipe.title + ' ingredients')}`} target="_blank" rel="noopener noreferrer" className="relative overflow-hidden rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all group aspect-square bg-card flex items-center justify-center">
                          <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; t.nextElementSibling?.classList.remove('hidden'); }} />
                          <div className="hidden w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-2xl">{platform.name.charAt(0)}</div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent px-2 py-1.5 text-center">
                            <span className="text-xs font-semibold">{platform.name}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Recipe History */}
          {showHistory && savedRecipes.length > 0 && (
            <Card className="shadow-2xl backdrop-blur-sm bg-card/95 border-2 border-primary/20">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-6">Your Saved Recipes</h2>
                <div className="grid gap-4">
                  {savedRecipes.map((savedRecipe) => (
                    <Card key={savedRecipe.id} className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-primary/50">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          {savedRecipe.image_url && (
                            <img src={savedRecipe.image_url} alt={savedRecipe.title} className="w-full sm:w-24 h-32 sm:h-24 rounded-lg object-cover shadow-md" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg md:text-xl font-semibold mb-2 text-primary">{savedRecipe.title}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground mb-2">{savedRecipe.ingredients.length} ingredients • {savedRecipe.instructions.length} steps • {savedRecipe.servingSize} servings</p>
                            {savedRecipe.created_at && <p className="text-xs text-muted-foreground">Created {new Date(savedRecipe.created_at).toLocaleDateString()}</p>}
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={() => loadSavedRecipe(savedRecipe)} className="flex-1 sm:flex-none transition-all hover:bg-primary hover:text-white">View</Button>
                            <Button variant="outline" size="sm" onClick={() => savedRecipe.id && deleteRecipe(savedRecipe.id)} className="transition-all hover:bg-destructive hover:text-white"><Trash2 className="w-4 h-4" /></Button>
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
                <p className="text-muted-foreground">No saved recipes yet. Generate and save your first recipe!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
