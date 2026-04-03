import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, ChefHat, LogOut, History, Trash2, Camera, SwitchCamera, ZoomIn, ZoomOut, ExternalLink, ShoppingCart, Search, ArrowLeft, Star, Clock, Users, Flame, Download, ImageIcon, Sparkles } from "lucide-react";
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

interface IngredientLabel {
  name: string;
  x: number;
  y: number;
}

interface Recipe {
  id?: string;
  title: string;
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

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [currentServings, setCurrentServings] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [zoom, setZoom] = useState<number>(1);
  const [ingredientLabels, setIngredientLabels] = useState<IngredientLabel[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
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
      if (!session) navigate("/auth");
      else { setUser(session.user); loadSavedRecipes(); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/auth");
      else { setUser(session.user); if (event === "SIGNED_IN") loadSavedRecipes(); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const prevLangRef = useRef(i18n.language);
  useEffect(() => {
    if (prevLangRef.current !== i18n.language) {
      prevLangRef.current = i18n.language;
      if (recipe && selectedImage) generateRecipe();
    }
  }, [i18n.language]);

  const loadSavedRecipes = async () => {
    try {
      const { data, error } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setSavedRecipes(data.map((r) => ({
          id: r.id, title: r.title, servingSize: r.serving_size,
          ingredients: r.ingredients as string[], instructions: r.instructions as string[],
          substitutes: r.substitutes as Record<string, string[]> | undefined,
          nutritionalValues: r.nutritional_values as any,
          image_url: r.image_url || undefined, created_at: r.created_at,
        })));
      }
    } catch (error) { console.error("Error loading recipes:", error); }
  };

  const saveRecipe = async (recipeData: Recipe) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("recipes").insert({
        user_id: user.id, title: recipeData.title, serving_size: recipeData.servingSize,
        ingredients: recipeData.ingredients, instructions: recipeData.instructions,
        substitutes: recipeData.substitutes || null, nutritional_values: recipeData.nutritionalValues,
        image_url: selectedImage || null,
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

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  const loadSavedRecipe = (savedRecipe: Recipe) => {
    setRecipe({ ...savedRecipe });
    setCurrentServings(savedRecipe.servingSize);
    setSelectedImage(savedRecipe.image_url || null);
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
      reader.onload = (e) => { setSelectedImage(e.target?.result as string); setRecipe(null); setIngredientLabels([]); };
      reader.readAsDataURL(file);
    }
  };

  const handleSampleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl); setRecipe(null); setIngredientLabels([]);
    toast({ title: "Sample image selected", description: "Click Generate Recipe to continue" });
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } } });
      setStream(mediaStream); setIsCameraActive(true);
      setTimeout(() => {
        const video = document.getElementById("camera-preview") as HTMLVideoElement;
        if (video) { video.srcObject = mediaStream; video.setAttribute('playsinline', 'true'); video.play().catch(console.error); }
      }, 100);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({ title: "Camera access denied", description: "Please allow camera access", variant: "destructive" });
    }
  };

  const flipCamera = async () => { const newMode = facingMode === "environment" ? "user" : "environment"; setFacingMode(newMode); await startCamera(newMode); };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities() as any;
    if (!capabilities.zoom) { toast({ title: "Zoom not supported", variant: "destructive" }); return; }
    const settings = videoTrack.getSettings() as any;
    const currentZoom = settings.zoom || 1;
    const step = 0.5;
    const newZoom = direction === 'in' ? Math.min(currentZoom + step, capabilities.zoom.max) : Math.max(currentZoom - step, capabilities.zoom.min);
    videoTrack.applyConstraints({ advanced: [{ zoom: newZoom } as any] }).then(() => setZoom(newZoom)).catch(() => toast({ title: "Zoom failed", variant: "destructive" }));
  };

  const stopCamera = () => { if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); } setIsCameraActive(false); };

  const capturePhoto = () => {
    const video = document.getElementById("camera-preview") as HTMLVideoElement;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) { ctx.drawImage(video, 0, 0); setSelectedImage(canvas.toDataURL("image/jpeg")); setRecipe(null); stopCamera(); toast({ title: "Photo captured", description: "Click Generate Recipe to continue" }); }
  };

  useEffect(() => { return () => { if (stream) stream.getTracks().forEach(track => track.stop()); }; }, [stream]);

  const generateRecipe = async () => {
    if (!selectedImage) return;
    setIsLoading(true); setLoadingProgress(0);
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => { if (prev >= 90) { clearInterval(progressInterval); return 90; } return prev + Math.random() * 15; });
    }, 500);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe", { body: { image: selectedImage, language: i18n.language } });
      if (error) throw error;
      if (data.error) { toast({ title: "Invalid Image", description: data.error, variant: "destructive" }); setIsLoading(false); setLoadingProgress(0); clearInterval(progressInterval); return; }
      setLoadingProgress(100);
      setRecipe(data.recipe); setCurrentServings(data.recipe.servingSize || 1);
      await saveRecipe(data.recipe);
      analyzeIngredients();
      toast({ title: "Recipe generated!", description: "Your recipe is ready" });
    } catch (error) {
      console.error("Error generating recipe:", error);
      toast({ title: "Error", description: "Failed to generate recipe. Please try again.", variant: "destructive" });
    } finally { clearInterval(progressInterval); setIsLoading(false); setLoadingProgress(0); }
  };

  const analyzeIngredients = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true); setIngredientLabels([]);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-ingredients", { body: { image: selectedImage } });
      if (error) throw error;
      if (data?.labels) setIngredientLabels(data.labels);
    } catch (error) {
      console.error("Error analyzing ingredients:", error);
    } finally { setIsAnalyzing(false); }
  };

  const scaleIngredient = (ingredient: string): string => {
    if (!recipe) return ingredient;
    const scale = currentServings / recipe.servingSize;
    if (scale === 1) return ingredient;
    return ingredient.replace(/(\d+(?:\.\d+)?)\s*([½¼¾⅓⅔⅛⅜⅝⅞])?/g, (match, num, fraction) => {
      let value = parseFloat(num);
      if (fraction) { const fm: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 }; value += fm[fraction] || 0; }
      return (value * scale).toFixed(2).replace(/\.?0+$/, '');
    });
  };

  const downloadRecipe = () => {
    if (!recipe) return;
    const scaledIngredients = recipe.ingredients.map(i => scaleIngredient(i));
    const content = `${recipe.title}\n\nServing Size: ${currentServings}\n\nIngredients:\n${scaledIngredients.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nInstructions:\n${recipe.instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nNutritional Values (per serving):\nCalories: ${recipe.nutritionalValues.calories}\nProtein: ${recipe.nutritionalValues.protein}\nCarbs: ${recipe.nutritionalValues.carbs}\nFat: ${recipe.nutritionalValues.fat}\nFiber: ${recipe.nutritionalValues.fiber}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${recipe.title.replace(/\s+/g, '_')}_recipe.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const downloadIngredients = () => {
    if (!recipe) return;
    const scaledIngredients = recipe.ingredients.map(i => scaleIngredient(i));
    const content = `Ingredients for ${recipe.title}\n\nServing Size: ${currentServings}\n\n${scaledIngredients.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${recipe.title.replace(/\s+/g, '_')}_ingredients.txt`; a.click(); URL.revokeObjectURL(url);
  };

  const resetState = () => { setRecipe(null); setSelectedImage(null); setIngredientLabels([]); };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">RecipeAI</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-muted-foreground hover:text-foreground">
              <History className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">

          {/* Hero Section - only when no recipe */}
          {!recipe && !isLoading && (
            <div className="mb-12">
              <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                    <Sparkles className="w-4 h-4" />
                    AI-Powered Recipe Generation
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-4">
                    Turn Food Images<br />into <span className="text-primary">Recipes</span>
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
                    Upload a photo of any dish and our AI will instantly generate a complete recipe with ingredients, instructions, and nutritional info.
                  </p>
                </div>
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80"
                      alt="Delicious food"
                      className="rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
                    />
                    <div className="absolute -bottom-4 -left-4 bg-card rounded-2xl shadow-xl p-3 flex items-center gap-2 border border-border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Health Score</p>
                        <p className="text-xs text-muted-foreground">AI-rated nutrition</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Back / Generate Another - sticky */}
          {(recipe || isLoading) && (
            <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-lg py-3 -mx-4 px-4 mb-6 border-b border-border">
              <Button onClick={resetState} disabled={isLoading} className="bg-primary hover:bg-secondary text-primary-foreground rounded-xl h-11 px-6 text-base font-semibold shadow-md">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Generate Another Recipe
              </Button>
            </div>
          )}

          {/* Upload, Camera, Samples - hidden during loading/recipe */}
          {!isLoading && !recipe && (
            <div className="space-y-8 mb-12">
              {/* Upload */}
              <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-all duration-300 rounded-2xl shadow-sm hover:shadow-lg group">
                <CardContent className="p-8">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
                  <label htmlFor="image-upload" className="cursor-pointer block">
                    {selectedImage ? (
                      <div className="relative max-w-md mx-auto">
                        <img src={selectedImage} alt="Selected food" className="rounded-2xl w-full h-auto object-cover shadow-md" />
                        <div className="absolute inset-0 bg-foreground/40 opacity-0 hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                          <p className="text-primary-foreground font-medium text-lg">Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Upload className="w-10 h-10 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-semibold text-foreground mb-1">Upload Food Image</p>
                          <p className="text-muted-foreground">Click to upload or drag & drop (max 5MB)</p>
                        </div>
                      </div>
                    )}
                  </label>
                  {selectedImage && (
                    <div className="mt-6 flex justify-center">
                      <Button onClick={generateRecipe} disabled={isLoading} size="lg" className="rounded-xl h-12 px-8 text-base font-semibold bg-primary hover:bg-secondary shadow-lg hover:shadow-xl transition-all">
                        <ChefHat className="mr-2 h-5 w-5" />
                        Generate Recipe
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Camera */}
              <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all border border-border">
                <CardContent className="p-8 text-center">
                  <h3 className="text-xl font-semibold text-foreground mb-1">Capture with Camera</h3>
                  <p className="text-muted-foreground mb-6 text-sm">Take a photo of your food directly</p>
                  {!isCameraActive ? (
                    <Button onClick={() => startCamera()} size="lg" variant="outline" className="rounded-xl h-12 px-8 border-2 hover:bg-primary hover:text-primary-foreground transition-all">
                      <Camera className="mr-2 h-5 w-5" /> Open Camera
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative max-w-md mx-auto rounded-2xl overflow-hidden bg-foreground">
                        <video id="camera-preview" autoPlay playsInline muted className="w-full h-auto min-h-[300px]" style={{ objectFit: 'cover' }} />
                        <Button onClick={flipCamera} size="icon" variant="secondary" className="absolute top-4 right-4 rounded-full"><SwitchCamera className="h-5 w-5" /></Button>
                        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                          <Button onClick={() => handleZoom('in')} size="icon" variant="secondary" className="rounded-full"><ZoomIn className="h-5 w-5" /></Button>
                          <Button onClick={() => handleZoom('out')} size="icon" variant="secondary" className="rounded-full"><ZoomOut className="h-5 w-5" /></Button>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-center">
                        <Button onClick={capturePhoto} size="lg" className="rounded-xl bg-primary hover:bg-secondary"><Camera className="mr-2 h-5 w-5" /> Capture</Button>
                        <Button onClick={stopCamera} size="lg" variant="outline" className="rounded-xl hover:border-destructive hover:text-destructive">Cancel</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sample Images */}
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-1 text-center">Or try a sample</h3>
                <p className="text-muted-foreground text-center text-sm mb-6">Click any dish to get started</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {sampleImages.map((sample) => (
                    <div key={sample.id} onClick={() => handleSampleImageSelect(sample.url)}
                      className="cursor-pointer group relative overflow-hidden rounded-2xl border border-border hover:border-primary shadow-sm hover:shadow-xl transition-all duration-300">
                      <img src={sample.url} alt={sample.name} className="w-full h-36 md:h-44 object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* How it Works */}
              <div className="py-8">
                <h3 className="text-2xl font-bold text-foreground text-center mb-8">How it works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: ImageIcon, title: "Upload Image", desc: "Take a photo or upload an image of any dish" },
                    { icon: Sparkles, title: "AI Analyzes", desc: "Our AI identifies ingredients and cooking methods" },
                    { icon: ChefHat, title: "Get Recipe", desc: "Receive a complete recipe with nutrition info" },
                  ].map((step, i) => (
                    <Card key={i} className="rounded-2xl border border-border shadow-sm text-center hover:shadow-lg transition-all">
                      <CardContent className="p-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <step.icon className="w-7 h-7 text-primary" />
                        </div>
                        <div className="text-sm font-bold text-primary mb-1">Step {i + 1}</div>
                        <h4 className="text-lg font-semibold text-foreground mb-2">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <Card className="rounded-2xl shadow-xl border border-border animate-fade-in">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <h3 className="text-xl font-semibold text-foreground">Generating Your Recipe...</h3>
                    <p className="text-sm text-muted-foreground">
                      {loadingProgress < 30 ? "Analyzing your food image..." : loadingProgress < 60 ? "Identifying ingredients..." : loadingProgress < 85 ? "Crafting your recipe..." : "Almost done!"}
                    </p>
                    <Progress value={loadingProgress} className="h-2 max-w-sm mx-auto" />
                    <p className="text-xs text-muted-foreground">{Math.round(loadingProgress)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recipe Display */}
          {recipe && !isLoading && (
            <div className="space-y-6 animate-fade-in">
              {/* Image with overlay title */}
              {selectedImage && (
                <div className="relative rounded-2xl overflow-hidden shadow-xl group">
                  <img src={selectedImage} alt={recipe.title} className="w-full h-64 md:h-80 object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground drop-shadow-lg">{recipe.title}</h2>
                  </div>
                </div>
              )}

              {/* Quick Info Bar */}
              <Card className="rounded-2xl border border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
                    {recipe.healthRating !== undefined && recipe.healthRating > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-accent fill-accent" />
                        <span className="text-sm font-semibold text-foreground">{recipe.healthRating}/5</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full" onClick={() => setCurrentServings(Math.max(1, currentServings - 1))} disabled={currentServings <= 1}>-</Button>
                        <span className="text-sm font-semibold text-foreground w-4 text-center">{currentServings}</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full" onClick={() => setCurrentServings(currentServings + 1)}>+</Button>
                        <span className="text-xs text-muted-foreground">servings</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-destructive" />
                      <span className="text-sm font-semibold text-foreground">{recipe.nutritionalValues.calories}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Health Rating Reason */}
              {recipe.healthRating !== undefined && recipe.healthRating > 0 && (
                <Card className="rounded-2xl border border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-5 h-5 ${s <= recipe.healthRating! ? 'text-accent fill-accent' : 'text-border'}`} />
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Health Rating: {recipe.healthRating}/5</p>
                        {recipe.healthRatingReason && <p className="text-sm text-muted-foreground mt-1">{recipe.healthRatingReason}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ingredient Detection */}
              {selectedImage && (
                <Card className="rounded-2xl border border-border shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                      <Search className="w-4 h-4 text-primary" /> Ingredient Detection
                    </h3>
                    <div className="relative inline-block w-full max-w-lg mx-auto rounded-xl overflow-hidden border border-border">
                      <img src={selectedImage} alt="Analyzed dish" className="w-full h-auto block" />
                      {ingredientLabels.map((label, index) => (
                        <div key={index} className="absolute" style={{ left: `${label.x}%`, top: `${label.y}%`, transform: 'translate(-50%, -50%)' }}>
                          <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary-foreground shadow-lg" />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-lg">
                            {label.name}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-primary" />
                          </div>
                        </div>
                      ))}
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center rounded-xl">
                          <Loader2 className="w-8 h-8 animate-spin text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ingredients & Instructions Tabs */}
              <Card className="rounded-2xl border border-border shadow-sm">
                <CardContent className="p-5">
                  <Tabs defaultValue="ingredients" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted rounded-xl h-11">
                      <TabsTrigger value="ingredients" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">Ingredients ({recipe.ingredients.length})</TabsTrigger>
                      <TabsTrigger value="instructions" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">Instructions ({recipe.instructions.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="ingredients" className="mt-4">
                      <div className="max-h-72 overflow-y-auto pr-2 space-y-1">
                        {recipe.ingredients.map((ingredient, index) => (
                          <div key={index} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                            <div className="w-5 h-5 rounded-md border-2 border-primary flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="text-sm text-foreground">{scaleIngredient(ingredient)}</span>
                              {recipe.substitutes && recipe.substitutes[ingredient] && (
                                <p className="text-xs text-muted-foreground mt-0.5 italic">Alt: {recipe.substitutes[ingredient].join(", ")}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="instructions" className="mt-4">
                      <div className="max-h-72 overflow-y-auto pr-2 space-y-2">
                        {recipe.instructions.map((instruction, index) => (
                          <div key={index} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{index + 1}</span>
                            <span className="text-sm text-foreground pt-0.5">{instruction}</span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Nutrition */}
              <Card className="rounded-2xl border border-border shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-base font-semibold text-foreground mb-4">Nutritional Values <span className="text-muted-foreground font-normal text-sm">(per serving)</span></h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { label: "Calories", value: recipe.nutritionalValues.calories, icon: Flame },
                      { label: "Protein", value: recipe.nutritionalValues.protein, icon: null },
                      { label: "Carbs", value: recipe.nutritionalValues.carbs, icon: null },
                      { label: "Fat", value: recipe.nutritionalValues.fat, icon: null },
                      { label: "Fiber", value: recipe.nutritionalValues.fiber, icon: null },
                    ].map((item, i) => (
                      <div key={i} className="text-center p-3 bg-muted/30 rounded-xl border border-border">
                        <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                        <p className="text-base font-bold text-primary">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* YouTube */}
              <Card className="rounded-2xl border border-border shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-base font-semibold text-foreground mb-3">Watch Recipe Video</h3>
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.title + ' recipe')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border hover:border-primary hover:shadow-md transition-all group">
                    <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {selectedImage ? (
                        <>
                          <img src={selectedImage} alt={recipe.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary-foreground fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-destructive flex items-center justify-center rounded-xl">
                          <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary-foreground fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{recipe.title} - Recipe Video</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Watch on YouTube</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </a>
                </CardContent>
              </Card>

              {/* Buy Ingredients */}
              <Card className="rounded-2xl border border-border shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-1">
                    <ShoppingCart className="w-4 h-4 text-primary" /> Buy Ingredients
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">Order from your favorite platform</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {[
                      { name: "Blinkit", url: "https://blinkit.com/s/?q=", logo: "https://www.google.com/s2/favicons?domain=blinkit.com&sz=64" },
                      { name: "Zepto", url: "https://www.zeptonow.com/search?query=", logo: "https://www.google.com/s2/favicons?domain=zeptonow.com&sz=64" },
                      { name: "Swiggy", url: "https://www.swiggy.com/instamart/search?query=", logo: "https://www.google.com/s2/favicons?domain=swiggy.com&sz=64" },
                      { name: "BigBasket", url: "https://www.bigbasket.com/ps/?q=", logo: "https://www.google.com/s2/favicons?domain=bigbasket.com&sz=64" },
                      { name: "JioMart", url: "https://www.jiomart.com/search/", logo: "https://www.google.com/s2/favicons?domain=jiomart.com&sz=64" },
                    ].map((platform) => (
                      <a key={platform.name} href={`${platform.url}${encodeURIComponent(recipe.title + ' ingredients')}`} target="_blank" rel="noopener noreferrer"
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border hover:border-primary hover:shadow-md transition-all group">
                        <img src={platform.logo} alt={platform.name} className="w-8 h-8 rounded-full object-cover group-hover:scale-110 transition-transform"
                          onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; t.nextElementSibling?.classList.remove('hidden'); }} />
                        <div className="hidden w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">{platform.name.charAt(0)}</div>
                        <span className="text-xs font-medium text-foreground">{platform.name}</span>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Download Buttons */}
              <div className="flex gap-3 justify-center">
                <Button variant="outline" size="sm" onClick={downloadIngredients} className="rounded-xl">
                  <Download className="mr-1.5 h-4 w-4" /> Ingredients
                </Button>
                <Button variant="outline" size="sm" onClick={downloadRecipe} className="rounded-xl">
                  <Download className="mr-1.5 h-4 w-4" /> Full Recipe
                </Button>
              </div>
            </div>
          )}

          {/* Recipe History */}
          {showHistory && savedRecipes.length > 0 && (
            <Card className="rounded-2xl border border-border shadow-sm mt-8">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">Your Saved Recipes</h2>
                <div className="grid gap-3">
                  {savedRecipes.map((savedRecipe) => (
                    <div key={savedRecipe.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer"
                      onClick={() => loadSavedRecipe(savedRecipe)}>
                      {savedRecipe.image_url && <img src={savedRecipe.image_url} alt={savedRecipe.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">{savedRecipe.title}</h3>
                        <p className="text-xs text-muted-foreground">{savedRecipe.ingredients.length} ingredients · {savedRecipe.instructions.length} steps</p>
                        {savedRecipe.created_at && <p className="text-xs text-muted-foreground">{new Date(savedRecipe.created_at).toLocaleDateString()}</p>}
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); savedRecipe.id && deleteRecipe(savedRecipe.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {showHistory && savedRecipes.length === 0 && (
            <Card className="rounded-2xl border border-border shadow-sm mt-8">
              <CardContent className="p-8 text-center">
                <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No Recipes Yet</h3>
                <p className="text-sm text-muted-foreground">Generate your first recipe to get started!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
