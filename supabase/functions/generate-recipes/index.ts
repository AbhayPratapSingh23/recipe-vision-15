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

    console.log("Generating recipes for:", ingredients);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: `You are a professional chef. Given ingredients, suggest 4 recipe options with varied styles. Return valid JSON: {"recipes": [{"title": "...", "description": "Short 5-8 word tagline", "tag": "quick|healthy|comfort|fusion", "servingSize": 4, "healthRating": 4, "healthRatingReason": "Brief reason", "cookingTime": "X mins", "estimatedCost": "₹X - ₹Y", "ingredients": ["ingredient with measurement"], "instructions": ["step"], "substitutes": {"ingredient": ["sub"]}, "nutritionalValues": {"calories": "X kcal", "protein": "X g", "carbs": "X g", "fat": "X g", "fiber": "X g"}}]}. Generate in ${langName}. Use USDA/IFCT nutrition values.`,
            },
            {
              role: "user",
              content: `Ingredients: ${ingredients.join(", ")}. Generate 4 recipes. Return only valid JSON.`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) throw new Error("No content");

    let result;
    try {
      let clean = aiResponse.trim();
      const jsonMatch = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) clean = jsonMatch[1].trim();
      const s = clean.indexOf('{');
      const e = clean.lastIndexOf('}');
      if (s !== -1 && e !== -1) clean = clean.substring(s, e + 1);
      
      try { result = JSON.parse(clean); } catch {
        let fixed = clean.replace(/\]\s*\n\s*"/g, '],\n"').replace(/\}\s*\n\s*"/g, '},\n"');
        let ob = 0, oc = 0;
        for (const ch of fixed) { if (ch === '[') ob++; if (ch === ']') ob--; if (ch === '{') oc++; if (ch === '}') oc--; }
        while (ob > 0) { fixed += ']'; ob--; }
        while (oc > 0) { fixed += '}'; oc--; }
        result = JSON.parse(fixed);
      }
    } catch {
      console.error("Parse failed:", aiResponse);
      throw new Error("Failed to parse recipes");
    }

    if (!result.recipes || !Array.isArray(result.recipes)) throw new Error("Invalid format");

    result.recipes = result.recipes.map((r: any) => ({
      title: r.title || "Untitled", description: r.description || "", tag: r.tag || "comfort",
      servingSize: r.servingSize || 4, healthRating: r.healthRating || 3, healthRatingReason: r.healthRatingReason || "",
      cookingTime: r.cookingTime || null, estimatedCost: r.estimatedCost || null,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      instructions: Array.isArray(r.instructions) ? r.instructions : [],
      substitutes: r.substitutes || {},
      nutritionalValues: r.nutritionalValues || { calories: "N/A", protein: "N/A", carbs: "N/A", fat: "N/A", fiber: "N/A" },
    }));

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
