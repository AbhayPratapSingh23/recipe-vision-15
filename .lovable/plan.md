## Plan

### 1. Backend Changes
- **Update `generate-recipe` edge function**: Accept ingredients list (not just image), return 3-5 recipe options with short descriptions
- **New `modify-recipe` edge function**: Accept a recipe + modification type, return modified recipe
- **New `search-recipe` edge function**: Accept a text query, return a recipe

### 2. Frontend Changes
- **Edit Ingredients flow**: After ingredient detection, show editable ingredient list before recipe generation
- **Multiple Recipe Cards**: Show 3-5 recipe cards with descriptions, let user select one for details
- **Cooking Mode**: Full-screen step-by-step view with large text and nav buttons
- **Smart Modifications**: Buttons below recipe to modify it via AI
- **Search Bar**: Text input to search for a recipe directly

### 3. Component Structure
- `IngredientEditor.tsx` - Editable ingredient list
- `RecipeCards.tsx` - Multiple recipe option cards
- `CookingMode.tsx` - Full-screen cooking view
- `SmartModifications.tsx` - Modification buttons
- `RecipeSearch.tsx` - Search input component
- Update `Index.tsx` to orchestrate the new flow

### Flow:
Upload image → Detect ingredients → Edit ingredients → Generate 3-5 recipes → Select one → View details (with cooking mode + smart modifications)
