import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CookingModeProps {
  title: string;
  instructions: string[];
  onClose: () => void;
}

const CookingMode = ({ title, instructions, onClose }: CookingModeProps) => {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold truncate">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center space-y-6">
          <div className="text-sm text-muted-foreground">
            Step {step + 1} of {instructions.length}
          </div>
          <p className="text-2xl md:text-4xl font-medium leading-relaxed">
            {instructions[step]}
          </p>
          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-4">
            {instructions.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === step ? 'bg-primary scale-125' : i < step ? 'bg-primary/50' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-6 border-t border-border">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-5 h-5" /> Previous
        </Button>
        <span className="text-muted-foreground font-medium">
          {step + 1} / {instructions.length}
        </span>
        {step < instructions.length - 1 ? (
          <Button
            size="lg"
            onClick={() => setStep(step + 1)}
            className="gap-2 bg-gradient-to-r from-primary to-accent"
          >
            Next <ChevronRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button size="lg" onClick={onClose} className="gap-2 bg-gradient-to-r from-primary to-accent">
            Done
          </Button>
        )}
      </div>
    </div>
  );
};

export default CookingMode;
