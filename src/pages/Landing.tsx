import { Link } from "react-router-dom";
import { ChefHat, Sparkles, Camera, Search, ShoppingCart, Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import heroImage from "@/assets/landing-hero.jpg";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Recipe Vision
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[var(--radial-gradient)] pointer-events-none" />
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center relative">
          <div className="space-y-6 animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Snap a Photo.
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Cook the Magic.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
              Transform any food photo into a complete, step-by-step recipe with ingredients, nutrition, video tutorials, and instant ingredient delivery.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg gap-2">
                  Start Cooking Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div><span className="font-bold text-foreground text-lg">10K+</span> Recipes</div>
              <div><span className="font-bold text-foreground text-lg">50+</span> Cuisines</div>
              <div><span className="font-bold text-foreground text-lg">4.9★</span> Rated</div>
            </div>
          </div>

          <div className="relative animate-scale-in">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-accent/30 rounded-3xl blur-2xl opacity-60 animate-pulse-glow" />
            <img
              src={heroImage}
              alt="Delicious global cuisine spread with curries, biryani, and naan"
              width={1920}
              height={1080}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="relative rounded-3xl shadow-2xl w-full h-auto object-cover animate-float"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to cook</h2>
            <p className="text-muted-foreground text-lg">From identifying ingredients to ordering them — all in one place.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Camera, title: "Snap & Detect", desc: "Upload a food photo and our AI detects every ingredient." },
              { icon: Search, title: "Search Recipes", desc: "Search any dish by name and get from-scratch recipes." },
              { icon: Play, title: "Video Tutorials", desc: "Watch step-by-step cooking videos for every recipe." },
              { icon: ShoppingCart, title: "Buy Ingredients", desc: "Order ingredients from Blinkit, Zepto, Swiggy & more." },
            ].map((f, i) => (
              <div
                key={f.title}
                style={{ animationDelay: `${i * 100}ms` }}
                className="group p-6 rounded-2xl bg-card/80 backdrop-blur-sm border border-border hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-md">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-accent p-10 md:p-16 text-center shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
                Ready to cook something amazing?
              </h2>
              <p className="text-primary-foreground/90 text-lg mb-8">
                Join thousands of home chefs turning photos into delicious meals.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="gap-2 shadow-lg">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 Recipe Vision. Crafted with love for food lovers.
      </footer>
    </div>
  );
};

export default Landing;
