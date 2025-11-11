import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, ChefHat, LogOut, History, Trash2, Camera, Image, SwitchCamera, ZoomIn, ZoomOut } from "lucide-react";
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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [zoom, setZoom] = useState<number>(1);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { i18n } = useTranslation();

  const sampleImages = [
    { id: 1, url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400", name: "Salad" },
    { id: 2, url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", name: "Pizza" },
    { id: 3, url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400", name: "Pancakes" },
    { id: 4, url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400", name: "Asian Cuisine" },
  ];

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

  const handleSampleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setRecipe(null);
    toast({
      title: "Sample image selected",
      description: "Click Generate Recipe to continue",
    });
  };

  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      
      // Wait a bit for the DOM to update
      setTimeout(() => {
        const video = document.getElementById("camera-preview") as HTMLVideoElement;
        if (video) {
          video.srcObject = mediaStream;
          video.setAttribute('playsinline', 'true');
          video.play().catch(err => {
            console.error("Error playing video:", err);
          });
        }
      }, 100);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to use this feature",
        variant: "destructive",
      });
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
    
    if (!capabilities.zoom) {
      toast({
        title: "Zoom not supported",
        description: "Your device doesn't support camera zoom",
        variant: "destructive",
      });
      return;
    }

    const settings = videoTrack.getSettings() as any;
    const currentZoom = settings.zoom || 1;
    const step = 0.5;
    
    let newZoom = direction === 'in' 
      ? Math.min(currentZoom + step, capabilities.zoom.max)
      : Math.max(currentZoom - step, capabilities.zoom.min);
    
    videoTrack.applyConstraints({
      advanced: [{ zoom: newZoom } as any]
    }).then(() => {
      setZoom(newZoom);
    }).catch(() => {
      toast({
        title: "Zoom failed",
        description: "Could not apply zoom level",
        variant: "destructive",
      });
    });
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
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
      stopCamera();
      toast({
        title: "Photo captured",
        description: "Click Generate Recipe to continue",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
    <div className="min-h-screen bg-[image:var(--warm-gradient)] relative">
      {/* Compact Sticky Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent shadow-[var(--card-shadow)]">
                <ChefHat className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Recipe Vision
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="hover:bg-primary/10"
              >
                <History className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">History</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:bg-destructive/10">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-16">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Compact Upload Section */}
          {!selectedImage && !recipe && (
            <Card className="border border-border/50 backdrop-blur-sm bg-card/80 shadow-[var(--card-shadow)] hover:shadow-[var(--hover-shadow)] transition-all duration-300 overflow-hidden">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Upload */}
                  <label htmlFor="image-upload" className="cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <div className="h-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border hover:border-primary bg-gradient-to-br from-primary/5 to-accent/5 transition-all group-hover:scale-105">
                      <Upload className="w-8 h-8 text-primary mb-2" />
                      <p className="text-sm font-medium text-center">Upload Image</p>
                    </div>
                  </label>
                  
                  {/* Camera */}
                  <div 
                    onClick={() => !isCameraActive && startCamera()}
                    className="cursor-pointer group"
                  >
                    <div className="h-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border hover:border-primary bg-gradient-to-br from-accent/5 to-primary/5 transition-all group-hover:scale-105">
                      <Camera className="w-8 h-8 text-accent mb-2" />
                      <p className="text-sm font-medium text-center">Take Photo</p>
                    </div>
                  </div>
                  
                  {/* Samples */}
                  <div 
                    onClick={() => {
                      const samples = document.getElementById('samples-section');
                      samples?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="cursor-pointer group"
                  >
                    <div className="h-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border hover:border-primary bg-gradient-to-br from-secondary/30 to-muted/30 transition-all group-hover:scale-105">
                      <Image className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-center">Try Samples</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Image Preview with Generate Button */}
          {selectedImage && !recipe && (
            <Card className="border border-primary/30 backdrop-blur-sm bg-card/90 shadow-[var(--hover-shadow)] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative group flex-shrink-0">
                    <img
                      src={selectedImage}
                      alt="Selected food"
                      className="w-full sm:w-32 h-32 object-cover rounded-xl shadow-md"
                    />
                    <label htmlFor="image-upload" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center cursor-pointer">
                      <p className="text-white text-xs font-medium">Change</p>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
                    <Button
                      onClick={generateRecipe}
                      disabled={isLoading}
                      className="w-full sm:flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ChefHat className="mr-2 h-5 w-5" />
                          Generate Recipe
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setSelectedImage(null)}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sample Food Images Section - Compact */}
          {!recipe && (
            <div id="samples-section">
              <Card className="border border-border/50 backdrop-blur-sm bg-card/80 shadow-[var(--card-shadow)] hover:shadow-[var(--hover-shadow)] transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Image className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold">Sample Images</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {sampleImages.map((sample) => (
                      <div
                        key={sample.id}
                        onClick={() => handleSampleImageSelect(sample.url)}
                        className="cursor-pointer group relative overflow-hidden rounded-lg border border-border hover:border-primary transition-all duration-300 hover:scale-105"
                      >
                        <img
                          src={sample.url}
                          alt={sample.name}
                          className="w-full h-24 sm:h-28 object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <p className="text-white font-medium text-xs">{sample.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Camera Capture Section - Full Screen Modal Style */}
          {isCameraActive && (
            <Card className="fixed inset-4 z-40 border-2 border-primary/50 backdrop-blur-sm bg-card/95 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Camera className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-base font-semibold">Camera</h3>
                    </div>
                    <Button
                      onClick={stopCamera}
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                  </div>
                  
                  <div className="relative flex-1 rounded-xl overflow-hidden bg-black">
                    <video
                      id="camera-preview"
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <Button
                      onClick={flipCamera}
                      size="icon"
                      className="absolute top-3 right-3 rounded-full backdrop-blur-md bg-background/50 hover:bg-background/70"
                    >
                      <SwitchCamera className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-3 right-3 flex flex-col gap-2">
                      <Button
                        onClick={() => handleZoom('in')}
                        size="icon"
                        className="rounded-full backdrop-blur-md bg-background/50 hover:bg-background/70"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleZoom('out')}
                        size="icon"
                        className="rounded-full backdrop-blur-md bg-background/50 hover:bg-background/70"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={capturePhoto}
                      size="lg"
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
                    >
                      <Camera className="mr-2 h-5 w-5" />
                      Capture Photo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading Skeleton - Compact */}
          {isLoading && (
            <Card className="backdrop-blur-sm bg-card/90 shadow-[var(--hover-shadow)] animate-in fade-in slide-in-from-bottom-4 duration-700 border border-primary/30">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg animate-pulse w-2/3"></div>
                  
                  <div className="bg-gradient-to-br from-secondary/20 to-muted/20 rounded-xl p-4">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="text-center space-y-2">
                          <div className="h-3 bg-muted/50 rounded animate-pulse w-12 mx-auto"></div>
                          <div className="h-5 bg-muted/50 rounded animate-pulse w-10 mx-auto"></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary/30 animate-pulse"></div>
                        <div className="h-3 bg-muted/30 rounded animate-pulse flex-1"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recipe Display - Modern & Compact */}
          {recipe && !isLoading && (
            <Card className="backdrop-blur-sm bg-card/90 shadow-[var(--hover-shadow)] animate-in fade-in slide-in-from-bottom-4 duration-700 border border-primary/30 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">{recipe.title}</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-1 rounded-full">
                        <span className="text-muted-foreground">Servings:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentServings(Math.max(1, currentServings - 1))}
                            disabled={currentServings <= 1}
                            className="w-5 h-5 rounded-full bg-background hover:bg-primary hover:text-primary-foreground disabled:opacity-50 flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            −
                          </button>
                          <span className="font-bold text-foreground w-6 text-center">{currentServings}</span>
                          <button
                            onClick={() => setCurrentServings(currentServings + 1)}
                            className="w-5 h-5 rounded-full bg-background hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={downloadIngredients} variant="outline" size="sm" className="text-xs">
                      Ingredients
                    </Button>
                    <Button onClick={downloadRecipe} variant="outline" size="sm" className="text-xs">
                      Full Recipe
                    </Button>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Nutritional Values - Compact */}
                  <div className="bg-gradient-to-br from-secondary/20 to-muted/20 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                      Nutrition (per serving)
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {[
                        { label: "Calories", value: recipe.nutritionalValues.calories },
                        { label: "Protein", value: recipe.nutritionalValues.protein },
                        { label: "Carbs", value: recipe.nutritionalValues.carbs },
                        { label: "Fat", value: recipe.nutritionalValues.fat },
                        { label: "Fiber", value: recipe.nutritionalValues.fiber }
                      ].map((item, i) => (
                        <div key={i} className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                          <p className="text-sm font-bold text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ingredients - Compact */}
                  <div>
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Ingredients
                    </h3>
                    <ul className="space-y-2">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="text-sm">
                          <div className="flex items-start gap-2 group hover:bg-muted/30 -mx-2 px-2 py-1 rounded-lg transition-colors">
                            <span className="text-primary mt-0.5 text-xs">•</span>
                            <div className="flex-1">
                              <span className="text-foreground">{scaleIngredient(ingredient)}</span>
                              {recipe.substitutes && recipe.substitutes[ingredient] && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  <span className="italic">Alt: {recipe.substitutes[ingredient].join(", ")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions - Compact */}
                  <div>
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                      Instructions
                    </h3>
                    <ol className="space-y-3">
                      {recipe.instructions.map((instruction, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm group hover:bg-muted/30 -mx-2 px-2 py-2 rounded-lg transition-colors">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-accent to-primary text-accent-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                            {index + 1}
                          </span>
                          <span className="text-foreground pt-0.5 leading-relaxed">{instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-border/50">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedImage(null);
                      setRecipe(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    Generate Another Recipe
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recipe History - Compact Modal */}
          {showHistory && savedRecipes.length > 0 && (
            <Card className="backdrop-blur-sm bg-card/95 shadow-[var(--hover-shadow)] animate-in fade-in slide-in-from-bottom-4 duration-500 border border-primary/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Recipe History</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                    Close
                  </Button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {savedRecipes.map((savedRecipe) => (
                    <Card
                      key={savedRecipe.id}
                      className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {savedRecipe.image_url && (
                            <img
                              src={savedRecipe.image_url}
                              alt={savedRecipe.title}
                              className="w-16 h-16 rounded-lg object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold mb-1 truncate">{savedRecipe.title}</h3>
                            <p className="text-xs text-muted-foreground mb-1">
                              {savedRecipe.ingredients.length} items • {savedRecipe.instructions.length} steps
                            </p>
                            {savedRecipe.created_at && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(savedRecipe.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadSavedRecipe(savedRecipe)}
                              className="text-xs h-7"
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                savedRecipe.id && deleteRecipe(savedRecipe.id);
                              }}
                              className="text-xs h-7 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
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
