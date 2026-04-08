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
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
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

    console.log("Analyzing ingredient regions in food image...");

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
                'You are a food ingredient detection expert. Analyze food images and identify the INDIVIDUAL RAW INGREDIENTS that make up the dish — NOT the dish name itself, and absolutely NOT any non-food items (no plates, bowls, spoons, forks, napkins, tables, hands, cups, glasses, containers, trays, or any background objects). For example: if you see "pani puri", do NOT label it as "pani puri". Instead, identify: "puri shells", "tamarind water", "potato filling", "chickpeas", "onion", "sev", "green chutney", "chili". Break every dish down into the raw ingredients needed to MAKE it from scratch. Return valid JSON only in this format: {"labels": [{"name": "ingredient name", "x": 50, "y": 30}, ...]}. x and y are percentages (0-100) of position in the image. Identify 5-8 distinct individual ingredients. Be very specific (e.g. "semolina dough shells", "boiled potato", "roasted cumin powder"). IMPORTANT: Space labels apart — minimum 15 units distance between any pair. Distribute evenly. ONLY label edible food components, nothing else.',
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Identify the visible ingredients and food components in this dish image. For each one, provide the ingredient name and its approximate x,y position as a percentage of the image dimensions. Return only valid JSON.",
                },
                {
                  type: "image_url",
                  image_url: { url: image },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits depleted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
      if (clean.includes("```")) {
        const s = clean.indexOf("{");
        const e = clean.lastIndexOf("}");
        if (s !== -1 && e !== -1) clean = clean.substring(s, e + 1);
      }
      result = JSON.parse(clean);
    } catch {
      console.error("Failed to parse:", aiResponse);
      throw new Error("Failed to parse ingredient analysis");
    }

    if (!result.labels || !Array.isArray(result.labels)) {
      throw new Error("Invalid response format");
    }

    // Clamp values and prevent overlapping labels
    result.labels = result.labels.map((l: any) => ({
      name: l.name,
      x: Math.max(8, Math.min(92, Number(l.x) || 50)),
      y: Math.max(8, Math.min(92, Number(l.y) || 50)),
    }));

    // Push apart labels that are too close (minimum 12% distance)
    const MIN_DIST = 12;
    for (let i = 0; i < result.labels.length; i++) {
      for (let j = i + 1; j < result.labels.length; j++) {
        const a = result.labels[i];
        const b = result.labels[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIN_DIST) {
          const angle = Math.atan2(dy, dx) || (Math.PI / 4);
          const push = (MIN_DIST - dist) / 2 + 1;
          b.x = Math.max(8, Math.min(92, b.x + Math.cos(angle) * push));
          b.y = Math.max(8, Math.min(92, b.y + Math.sin(angle) * push));
          a.x = Math.max(8, Math.min(92, a.x - Math.cos(angle) * push));
          a.y = Math.max(8, Math.min(92, a.y - Math.sin(angle) * push));
        }
      }
    }

    console.log("Detected ingredients:", result.labels.length);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
