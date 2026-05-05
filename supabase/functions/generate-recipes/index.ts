import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, language = "en" } = await req.json();

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No ingredients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const langName = language === "hi" ? "Hindi" : language === "ta" ? "Tamil" : language === "te" ? "Telugu" : language === "bn" ? "Bengali" : language === "mr" ? "Marathi" : "English";

    console.log("Generating multiple recipes for ingredients:", ingredients);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `You are a professional chef. Given a list of raw ingredients detected from a food image, generate a COMPLETE FROM-SCRATCH recipe to make the dish these ingredients belong to. The ingredients represent components of a dish — your job is to figure out what dish they make and provide the full recipe with step-by-step cooking instructions from scratch. Do NOT treat the ingredients as already-cooked items. For example, if ingredients are "puri shells, tamarind water, potato, chickpeas, onion, sev, green chutney", generate a full Pani Puri recipe explaining how to make the puris, the filling, the pani (spiced water), etc. Suggest 4 different recipe variations. Always respond with valid JSON in this exact format: {"recipes": [{"title": "Recipe Name", "description": "Short 5-8 word description like quick, healthy, rich and creamy etc.", "tag": "quick|healthy|comfort|fusion", "servingSize": 4, "healthRating": 4, "healthRatingReason": "Brief reason", "ingredients": ["ingredient 1 with measurement"], "instructions": ["step 1", "step 2"], "substitutes": {"ingredient": ["sub1", "sub2"]}, "nutritionalValues": {"calories": "X kcal", "protein": "X g", "carbs": "X g", "fat": "X g", "fiber": "X g"}, "costBreakdown": [{"item": "ingredient name with quantity", "cost": 25}], "totalCost": 150}]}. Cost values must be integers in Indian Rupees (INR) based on typical Indian retail/quick-commerce prices for the quantity used in the recipe. totalCost is the sum of all item costs. Always include costBreakdown with one entry per main ingredient. Generate in ${langName} language. Use USDA/IFCT reference values for nutrition.`,
            },
            {
              role: "user",
              content: `Here are the ingredients: ${ingredients.join(", ")}. Generate 4 different recipe options with varied cooking styles. Return only valid JSON.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits depleted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) throw new Error("No content in AI response");

    let result;
    try {
      let clean = aiResponse.trim();
      const jsonMatch = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) clean = jsonMatch[1].trim();
      const jsonStart = clean.indexOf('{');
      const jsonEnd = clean.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) clean = clean.substring(jsonStart, jsonEnd + 1);
      
      try {
        result = JSON.parse(clean);
      } catch {
        let fixed = clean
          .replace(/\]\s*\n\s*"/g, '],\n"')
          .replace(/"\s*\n\s*\[/g, '",\n[')
          .replace(/\}\s*\n\s*"/g, '},\n"')
          .replace(/"\s*\n\s*\{/g, '",\n{');
        let openBrackets = 0, openBraces = 0;
        for (const ch of fixed) {
          if (ch === '[') openBrackets++;
          if (ch === ']') openBrackets--;
          if (ch === '{') openBraces++;
          if (ch === '}') openBraces--;
        }
        while (openBrackets > 0) { fixed = fixed.replace(/,?\s*$/, '') + ']'; openBrackets--; }
        while (openBraces > 0) { fixed = fixed.replace(/,?\s*$/, '') + '}'; openBraces--; }
        result = JSON.parse(fixed);
      }
    } catch (parseError) {
      console.error("Failed to parse:", aiResponse);
      throw new Error("Failed to parse recipes from AI response");
    }

    if (!result.recipes || !Array.isArray(result.recipes)) {
      throw new Error("Invalid response format");
    }

    // Validate each recipe
    result.recipes = result.recipes.map((r: any) => {
      const costBreakdown = Array.isArray(r.costBreakdown)
        ? r.costBreakdown
            .filter((c: any) => c && (c.item || c.name) && (c.cost !== undefined && c.cost !== null))
            .map((c: any) => ({ item: String(c.item || c.name), cost: Number(c.cost) || 0 }))
        : [];
      const totalCost = typeof r.totalCost === "number"
        ? r.totalCost
        : costBreakdown.reduce((s: number, c: any) => s + (c.cost || 0), 0);
      return {
        title: r.title || "Untitled Recipe",
        description: r.description || "",
        tag: r.tag || "comfort",
        servingSize: r.servingSize || 4,
        healthRating: r.healthRating || 3,
        healthRatingReason: r.healthRatingReason || "",
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        instructions: Array.isArray(r.instructions) ? r.instructions : [],
        substitutes: r.substitutes || {},
        nutritionalValues: r.nutritionalValues || { calories: "N/A", protein: "N/A", carbs: "N/A", fat: "N/A", fiber: "N/A" },
        costBreakdown,
        totalCost,
      };
    });

    console.log("Generated", result.recipes.length, "recipes");

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate recipes" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
