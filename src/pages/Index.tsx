import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, ChefHat, LogOut, History, Trash2, Camera, SwitchCamera, ZoomIn, ZoomOut, ExternalLink, ShoppingCart, Search, ArrowLeft, Play, Clock, DollarSign, RefreshCw, AlertTriangle } from "lucide-react";
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
import CookingMode from "@/components/CookingMode";
import SmartModifications from "@/components/SmartModifications";
import RecipeSearch from "@/components/RecipeSearch";

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
  cookingTime?: string;
  estimatedCost?: string;
  dishImage?: string;
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

type Stage = "upload" | "editIngredients" | "viewRecipe";

const loadingSteps = [
  { label: "Analyzing image…", icon: "🔍", range: [0, 25] },
  { label: "Detecting ingredients…", icon: "🥕", range: [25, 50] },
  { label: "Generating recipe…", icon: "👨‍🍳", range: [50, 80] },
  { label: "Finalizing…", icon: "✨", range: [80, 100] },
];

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  const [stage, setStage] = useState<Stage>("upload");
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
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
      loadSavedRecipes();
    } catch (error) { console.error("Error saving recipe:", error); }
  };

  const deleteRecipe = async (recipeId: string) => {
    try {
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
      if (error) throw error;
      toast({ title: "Recipe deleted" });
      loadSavedRecipes();
    } catch (error) { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  const loadSavedRecipe = (savedRecipe: Recipe) => {
    setRecipe(savedRecipe); setCurrentServings(savedRecipe.servingSize);
    setSelectedImage(savedRecipe.image_url || null); setStage("viewRecipe");
    setShowHistory(false); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Auto-trigger analysis after image selection
  const processImage = useCallback(async (imageData: string) => {
    setSelectedImage(imageData);
    setRecipe(null); setIngredientLabels([]); setDetectedIngredients([]);
    setAnalysisError(null); setIsLoading(true); setLoadingProgress(0); setLoadingStep(0);

    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const newVal = prev + Math.random() * 8;
        if (newVal >= 25 && prev < 25) setLoadingStep(1);
        if (newVal >= 50 && prev < 50) setLoadingStep(2);
        if (newVal >= 80 && prev < 80) setLoadingStep(3);
        return Math.min(newVal, 92);
      });
    }, 400);

    try {
      // Step 1: Analyze ingredients
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-ingredients", { body: { image: imageData } });
      if (analysisError) throw new Error("Image analysis failed. Please try again.");
      if (!analysisData?.labels?.length) throw new Error("Could not detect any ingredients in this image. Try a clearer photo.");

      setIngredientLabels(analysisData.labels);
      setDetectedIngredients(analysisData.labels.map((l: IngredientLabel) => l.name));
      setLoadingProgress(50); setLoadingStep(2);
      setStage("editIngredients");

      // Step 2: Auto-generate recipe
      const { data: recipeData, error: recipeError } = await supabase.functions.invoke("generate-recipes", {
        body: { ingredients: analysisData.labels.map((l: IngredientLabel) => l.name), language: i18n.language },
      });
      if (recipeError) throw recipeError;
      if (recipeData.error) throw new Error(recipeData.error);

      setLoadingProgress(100);
      // Pick the first (best) recipe directly
      const best = recipeData.recipes?.[0];
      if (best) {
        setRecipe(best); setCurrentServings(best.servingSize || 1);
        setStage("viewRecipe");
        await saveRecipe(best);
      }
    } catch (error: any) {
      console.error("Error:", error);
      setAnalysisError(error.message || "Something went wrong. Please try again.");
      setStage("upload");
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false); setLoadingProgress(0); setLoadingStep(0);
    }
  }, [i18n.language]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 5MB", variant: "destructive" }); return;
      }
      const reader = new FileReader();
      reader.onload = (e) => processImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSampleImageSelect = (imageUrl: string) => processImage(imageUrl);

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } } });
      setStream(mediaStream); setIsCameraActive(true);
      setTimeout(() => {
        const video = document.getElementById("camera-preview") as HTMLVideoElement;
        if (video) { video.srcObject = mediaStream; video.setAttribute('playsinline', 'true'); video.play().catch(console.error); }
      }, 100);
    } catch { toast({ title: "Camera access denied", variant: "destructive" }); }
  };

  const flipCamera = async () => { const m = facingMode === "environment" ? "user" : "environment"; setFacingMode(m); await startCamera(m); };
  const handleZoom = (direction: 'in' | 'out') => {
    if (!stream) return;
    const vt = stream.getVideoTracks()[0]; const c = vt.getCapabilities() as any;
    if (!c.zoom) return;
    const s = vt.getSettings() as any; const cur = s.zoom || 1;
    const nz = direction === 'in' ? Math.min(cur + 0.5, c.zoom.max) : Math.max(cur - 0.5, c.zoom.min);
    vt.applyConstraints({ advanced: [{ zoom: nz } as any] }).then(() => setZoom(nz)).catch(() => {});
  };
  const stopCamera = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); } setIsCameraActive(false); };
  const capturePhoto = () => {
    const video = document.getElementById("camera-preview") as HTMLVideoElement;
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) { ctx.drawImage(video, 0, 0); stopCamera(); processImage(canvas.toDataURL("image/jpeg")); }
  };

  useEffect(() => { return () => { if (stream) stream.getTracks().forEach(t => t.stop()); }; }, [stream]);

  // Search recipe
  const searchRecipe = async (query: string) => {
    setIsSearching(true); setAnalysisError(null); setLoadingProgress(0); setLoadingStep(2);
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + Math.random() * 10, 92));
    }, 400);
    try {
      const { data, error } = await supabase.functions.invoke("search-recipe", { body: { query, language: i18n.language } });
      if (error) throw error;
      if (data.error) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      setRecipe(data.recipe); setCurrentServings(data.recipe.servingSize || 1);
      setSelectedImage(null); setStage("viewRecipe");
      await saveRecipe(data.recipe);
    } catch (error) {
      toast({ title: "Error", description: "Failed to search recipe", variant: "destructive" });
    } finally {
      clearInterval(progressInterval);
      setIsSearching(false); setLoadingProgress(0); setLoadingStep(0);
    }
  };

  // Regenerate from edited ingredients
  const regenerateFromIngredients = async (ingredients: string[]) => {
    setIsLoading(true); setLoadingProgress(0); setLoadingStep(2);
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + Math.random() * 10, 92));
    }, 400);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipes", {
        body: { ingredients, language: i18n.language },
      });
      if (error) throw error;
      if (data.error) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      setLoadingProgress(100);
      const best = data.recipes?.[0];
      if (best) { setRecipe(best); setCurrentServings(best.servingSize || 1); setStage("viewRecipe"); await saveRecipe(best); }
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate recipe", variant: "destructive" });
    } finally {
      clearInterval(progressInterval); setIsLoading(false); setLoadingProgress(0); setLoadingStep(0);
    }
  };

  const modifyRecipe = async (modification: string) => {
    if (!recipe) return;
    setIsModifying(true); setActiveModification(modification);
    try {
      const { data, error } = await supabase.functions.invoke("modify-recipe", { body: { recipe, modification, language: i18n.language } });
      if (error) throw error;
      if (data.error) { toast({ title: "Error", description: data.error, variant: "destructive" }); return; }
      setRecipe(data.recipe); setCurrentServings(data.recipe.servingSize || 1);
      toast({ title: "Recipe modified!" });
    } catch { toast({ title: "Error", description: "Failed to modify", variant: "destructive" }); }
    finally { setIsModifying(false); setActiveModification(null); }
  };

  const resetToUpload = () => {
    setStage("upload"); setRecipe(null); setSelectedImage(null);
    setIngredientLabels([]); setDetectedIngredients([]); setAnalysisError(null);
  };

  const scaleIngredient = (ingredient: string): string => {
    if (!recipe) return ingredient;
    const scale = currentServings / recipe.servingSize;
    if (scale === 1) return ingredient;
    return ingredient.replace(/(\d+(?:\.\d+)?)/g, (match) => {
      return (parseFloat(match) * scale).toFixed(2).replace(/\.?0+$/, '');
    });
  };

  const downloadRecipe = () => {
    if (!recipe) return;
    const content = `${recipe.title}\n\nServings: ${currentServings}\n${recipe.cookingTime ? `Time: ${recipe.cookingTime}\n` : ''}${recipe.estimatedCost ? `Cost: ${recipe.estimatedCost}\n` : ''}\n\nIngredients:\n${recipe.ingredients.map((i, idx) => `${idx + 1}. ${scaleIngredient(i)}`).join('\n')}\n\nInstructions:\n${recipe.instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${recipe.title.replace(/\s+/g, '_')}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const currentLoadingStep = loadingSteps[loadingStep] || loadingSteps[0];

  if (showCookingMode && recipe) {
    return <CookingMode title={recipe.title} instructions={recipe.instructions} onClose={() => setShowCookingMode(false)} />;
  }

  const isProcessing = isLoading || isSearching;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-7 h-7 text-primary" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">RecipeAI</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)} className="relative">
              <History className="w-4 h-4" />
              {savedRecipes.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">{savedRecipes.length}</span>}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-4">

          {/* Search Bar - always visible on upload */}
          {stage === "upload" && !isProcessing && (
            <RecipeSearch onSearch={searchRecipe} isLoading={isSearching} />
          )}

          {/* Back button */}
          {stage !== "upload" && !isProcessing && (
            <Button variant="ghost" size="sm" onClick={resetToUpload} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> New Recipe
            </Button>
          )}

          {/* LOADING STATE */}
          {isProcessing && (
            <Card className="border-primary/20 shadow-xl overflow-hidden">
              <CardContent className="p-8">
                <div className="space-y-6 text-center">
                  <div className="text-4xl animate-bounce">{currentLoadingStep.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{currentLoadingStep.label}</h3>
                    <p className="text-sm text-muted-foreground">Please wait while our AI works its magic</p>
                  </div>
                  <div className="max-w-sm mx-auto space-y-2">
                    <Progress value={loadingProgress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {loadingSteps.map((s, i) => (
                        <span key={i} className={i <= loadingStep ? "text-primary font-medium" : ""}>{s.icon}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ERROR STATE */}
          {analysisError && !isProcessing && stage === "upload" && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-destructive mb-1">Detection Failed</p>
                  <p className="text-sm text-muted-foreground mb-3">{analysisError}</p>
                  <Button size="sm" variant="outline" onClick={() => { setAnalysisError(null); if (selectedImage) processImage(selectedImage); }} className="gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* UPLOAD STAGE */}
          {stage === "upload" && !isProcessing && (
            <>
              {/* Upload */}
              <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-all">
                <CardContent className="p-6">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload" />
                  <label htmlFor="image-upload" className="cursor-pointer block text-center">
                    <Upload className="w-12 h-12 mx-auto mb-3 text-primary/60" />
                    <p className="font-semibold mb-1">Upload Food Image</p>
                    <p className="text-sm text-muted-foreground">Auto-generates recipe instantly</p>
                  </label>
                </CardContent>
              </Card>

              {/* Camera */}
              {!isCameraActive ? (
                <Button onClick={() => startCamera()} variant="outline" className="w-full gap-2 h-12 border-2">
                  <Camera className="w-5 h-5" /> Open Camera
                </Button>
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="relative rounded-lg overflow-hidden bg-black">
                      <video id="camera-preview" autoPlay playsInline muted className="w-full h-auto min-h-[240px]" style={{ objectFit: 'cover' }} />
                      <Button onClick={flipCamera} size="icon" variant="secondary" className="absolute top-3 right-3 rounded-full h-8 w-8"><SwitchCamera className="h-4 w-4" /></Button>
                      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
                        <Button onClick={() => handleZoom('in')} size="icon" variant="secondary" className="rounded-full h-8 w-8"><ZoomIn className="h-4 w-4" /></Button>
                        <Button onClick={() => handleZoom('out')} size="icon" variant="secondary" className="rounded-full h-8 w-8"><ZoomOut className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={capturePhoto} className="flex-1 bg-gradient-to-r from-primary to-accent gap-1.5"><Camera className="w-4 h-4" /> Capture</Button>
                      <Button onClick={stopCamera} variant="outline">Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sample Images */}
              <div>
                <p className="text-sm text-muted-foreground mb-2 text-center">Or try a sample</p>
                <div className="grid grid-cols-4 gap-2">
                  {sampleImages.map((s) => (
                    <button key={s.id} onClick={() => handleSampleImageSelect(s.url)} className="rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all aspect-square">
                      <img src={s.url} alt={s.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* EDIT INGREDIENTS STAGE */}
          {stage === "editIngredients" && !isProcessing && (
            <>
              {selectedImage && (
                <div className="relative rounded-xl overflow-hidden border border-primary/20 max-w-md mx-auto">
                  <img src={selectedImage} alt="Analyzed" className="w-full h-auto block" />
                  {ingredientLabels.map((label, i) => (
                    <div key={i} className="absolute" style={{ left: `${label.x}%`, top: `${label.y}%`, transform: 'translate(-50%, -50%)' }}>
                      <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary-foreground shadow-lg" />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 whitespace-nowrap bg-primary/90 text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-lg">
                        {label.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <IngredientEditor ingredients={detectedIngredients} onGenerate={regenerateFromIngredients} isLoading={isLoading} />
            </>
          )}

          {/* VIEW RECIPE */}
          {stage === "viewRecipe" && recipe && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
              {/* Title & Actions */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{recipe.title}</h2>
                  {recipe.description && <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button onClick={() => setShowCookingMode(true)} size="sm" className="bg-gradient-to-r from-primary to-accent gap-1">
                    <Play className="w-3.5 h-3.5" /> Cook
                  </Button>
                  <Button onClick={downloadRecipe} variant="outline" size="sm">Download</Button>
                </div>
              </div>

              {/* HD Dish Image */}
              {recipe.dishImage && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src={recipe.dishImage} alt={recipe.title} className="w-full h-48 md:h-64 object-cover" />
                </div>
              )}

              {/* Quick Info Bar: Time, Cost, Health */}
              <div className="grid grid-cols-3 gap-2">
                {recipe.cookingTime && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</p>
                      <p className="text-sm font-semibold">{recipe.cookingTime}</p>
                    </div>
                  </div>
                )}
                {recipe.estimatedCost && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-success/5 border border-success/10">
                    <DollarSign className="w-4 h-4 text-success flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cost</p>
                      <p className="text-sm font-semibold">{recipe.estimatedCost}</p>
                    </div>
                  </div>
                )}
                {recipe.healthRating !== undefined && recipe.healthRating > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/5 border border-warning/10">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} className={`w-3.5 h-3.5 ${s <= recipe.healthRating! ? 'text-warning fill-warning' : 'text-muted-foreground/20 fill-muted-foreground/20'}`} viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Health</p>
                      <p className="text-sm font-semibold">{recipe.healthRating}/5</p>
                    </div>
                  </div>
                )}
              </div>
              {recipe.healthRatingReason && (
                <p className="text-xs text-muted-foreground italic px-1">Health: {recipe.healthRatingReason}</p>
              )}

              {/* Servings */}
              <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3 border border-border">
                <span className="text-sm font-medium">Servings</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentServings(Math.max(1, currentServings - 1))} disabled={currentServings <= 1}>-</Button>
                  <span className="text-lg font-bold w-8 text-center text-primary">{currentServings}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentServings(currentServings + 1)}>+</Button>
                </div>
              </div>

              {/* Nutrition */}
              <div className="grid grid-cols-5 gap-1.5">
                {(["calories", "protein", "carbs", "fat", "fiber"] as const).map((key) => (
                  <div key={key} className="text-center p-2 rounded-lg bg-success/5 border border-success/10">
                    <p className="text-[10px] text-muted-foreground capitalize">{key}</p>
                    <p className="text-xs font-bold text-success">{recipe.nutritionalValues[key]}</p>
                  </div>
                ))}
              </div>

              {/* Ingredients & Instructions */}
              <Tabs defaultValue="ingredients" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="ingredients" className="text-xs">Ingredients ({recipe.ingredients.length})</TabsTrigger>
                  <TabsTrigger value="instructions" className="text-xs">Steps ({recipe.instructions.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="ingredients" className="mt-2">
                  <div className="rounded-xl border border-border p-3 max-h-60 overflow-y-auto space-y-1">
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-start gap-2 py-1">
                        <span className="text-primary text-xs mt-0.5">•</span>
                        <div>
                          <span className="text-sm">{scaleIngredient(ing)}</span>
                          {recipe.substitutes?.[ing] && (
                            <p className="text-[10px] text-muted-foreground italic">Alt: {recipe.substitutes[ing].join(", ")}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="instructions" className="mt-2">
                  <div className="rounded-xl border border-border p-3 max-h-60 overflow-y-auto space-y-2">
                    {recipe.instructions.map((inst, i) => (
                      <div key={i} className="flex items-start gap-2 py-1">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                        <span className="text-sm">{inst}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Smart Modifications */}
              <SmartModifications onModify={modifyRecipe} isLoading={isModifying} activeModification={activeModification} />

              {/* YouTube */}
              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.title + ' recipe')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-destructive/50 transition-all group">
                <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-destructive/10 flex items-center justify-center relative">
                  {selectedImage ? (
                    <img src={selectedImage} alt="" className="w-full h-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-primary-foreground fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm group-hover:text-destructive transition-colors truncate">{recipe.title} — Video</p>
                  <p className="text-xs text-muted-foreground">Watch on YouTube</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </a>

              {/* Buy Ingredients */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><ShoppingCart className="w-4 h-4 text-primary" /> Buy Ingredients</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { name: "Blinkit", url: "https://blinkit.com/s/?q=", color: "bg-[#f8e71c]/10 border-[#f8e71c]/20", logo: "https://logo.clearbit.com/blinkit.com" },
                    { name: "Zepto", url: "https://www.zeptonow.com/search?query=", color: "bg-[#7b2ff7]/10 border-[#7b2ff7]/20", logo: "https://logo.clearbit.com/zeptonow.com" },
                    { name: "Swiggy", url: "https://www.swiggy.com/instamart/search?query=", color: "bg-[#fc8019]/10 border-[#fc8019]/20", logo: "https://logo.clearbit.com/swiggy.com" },
                    { name: "BigBasket", url: "https://www.bigbasket.com/ps/?q=", color: "bg-[#a5cd39]/10 border-[#a5cd39]/20", logo: "https://logo.clearbit.com/bigbasket.com" },
                    { name: "JioMart", url: "https://www.jiomart.com/search/", color: "bg-[#0078ad]/10 border-[#0078ad]/20", logo: "https://logo.clearbit.com/jiomart.com" },
                    { name: "Amazon Fresh", url: "https://www.amazon.in/s?k=", color: "bg-[#ff9900]/10 border-[#ff9900]/20", logo: "https://logo.clearbit.com/amazon.in" },
                  ].map((p) => (
                    <a key={p.name} href={`${p.url}${encodeURIComponent(recipe.title + ' ingredients')}`} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-xl border ${p.color} hover:shadow-md transition-all group`}>
                      <img src={p.logo} alt={p.name} className="w-8 h-8 rounded-lg object-contain" onError={(e) => { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${new URL(p.url).hostname}&sz=64`; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">Order now</p>
                      </div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>

              <Button variant="outline" onClick={resetToUpload} className="w-full mt-2">Generate Another Recipe</Button>
            </div>
          )}

          {/* Recipe History */}
          {showHistory && (
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <h2 className="text-lg font-bold mb-3">Saved Recipes</h2>
                {savedRecipes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No saved recipes yet</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {savedRecipes.map((sr) => (
                      <div key={sr.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/30 transition-all">
                        {sr.image_url && <img src={sr.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sr.title}</p>
                          <p className="text-[10px] text-muted-foreground">{sr.ingredients.length} ingredients</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => loadSavedRecipe(sr)}><Search className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => sr.id && deleteRecipe(sr.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
