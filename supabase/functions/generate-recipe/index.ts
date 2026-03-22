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
    const { image, language = "en" } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 1: Validate if the image is food
    console.log("Validating if image contains food...");
    const validationResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Is this image showing food, a meal, or a dish? Answer with ONLY 'YES' if it clearly shows food/meal/dish, or 'NO' if it does not show food.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!validationResponse.ok) {
      const errorText = await validationResponse.text();
      console.error("Validation AI error:", validationResponse.status, errorText);
      
      if (validationResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (validationResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits depleted. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI service error during validation: ${validationResponse.status}`);
    }

    const validationData = await validationResponse.json();
    const validationContent = validationData.choices?.[0]?.message?.content?.trim().toUpperCase();
    
    console.log("Validation result:", validationContent);

    if (!validationContent || !validationContent.includes("YES")) {
      console.log("Image is not food, rejecting request");
      return new Response(
        JSON.stringify({ error: "Please upload a food image only. The uploaded image does not appear to be food or a dish." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Generate recipe with nutritional values
    console.log("Image validated as food, generating recipe...");

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
          messages: [
            {
              role: "system",
              content:
                "You are a professional chef and nutritionist. Analyze food images and generate detailed recipes with accurate ingredients, clear instructions, estimated nutritional information, ingredient substitutes, and a health rating. Always respond with valid JSON in this exact format: {\"title\": \"Recipe Name\", \"servingSize\": 4, \"healthRating\": 4, \"ingredients\": [\"ingredient 1\", \"ingredient 2\"], \"instructions\": [\"step 1\", \"step 2\"], \"substitutes\": {\"ingredient 1\": [\"substitute 1\", \"substitute 2\"]}, \"nutritionalValues\": {\"calories\": \"X kcal\", \"protein\": \"X g\", \"carbs\": \"X g\", \"fat\": \"X g\", \"fiber\": \"X g\"}}. The healthRating should be an integer from 1 to 5 based on how healthy the dish is (1=very unhealthy, 5=very healthy).",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Please analyze this food image and generate a complete recipe with: 1) A title, 2) Serving size (number of servings), 3) List of ingredients with measurements, 4) Step-by-step cooking instructions, 5) Possible substitute ingredients for each main ingredient (at least 1-2 alternatives when applicable), 6) Estimated nutritional values per serving (calories, protein, carbs, fat, fiber). IMPORTANT: Generate the ingredients and instructions in ${language === "en" ? "English" : language === "hi" ? "Hindi" : language === "ta" ? "Tamil" : language === "te" ? "Telugu" : language === "bn" ? "Bengali" : language === "mr" ? "Marathi" : "English"} language. Return only valid JSON.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits depleted. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let recipe;
    try {
      // Remove markdown code block wrappers if present
      let cleanResponse = aiResponse.trim();
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = cleanResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[1].trim();
      }
      
      // If still has backticks, try to find JSON object boundaries
      if (cleanResponse.includes('```')) {
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
        }
      }
      
      recipe = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", aiResponse);
      throw new Error("Failed to parse recipe from AI response");
    }

    // Validate the recipe structure
    if (!recipe.title || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.instructions)) {
      throw new Error("Invalid recipe format from AI");
    }

    // Ensure nutritional values exist with defaults if missing
    if (!recipe.nutritionalValues) {
      recipe.nutritionalValues = {
        calories: "N/A",
        protein: "N/A",
        carbs: "N/A",
        fat: "N/A",
        fiber: "N/A"
      };
    }

    // Ensure servingSize exists with default
    if (!recipe.servingSize) {
      recipe.servingSize = 1;
    }

    console.log("Recipe generated successfully:", recipe.title);

    return new Response(
      JSON.stringify({ recipe }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-recipe function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate recipe",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
