import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    
    switch (type) {
      case "course-builder":
        systemPrompt = `You are an expert course curriculum designer for Merotalent LMS platform. 
When given a course title/subject, generate:
1. A compelling course description (2-3 paragraphs)
2. A detailed syllabus with modules and topics
3. Clear learning outcomes (5-8 bullet points)

Format your response as JSON with these fields:
- description: string
- syllabus: string (markdown formatted)
- learning_outcomes: string[] (array of outcomes)

Be specific, practical, and industry-relevant.`;
        break;
        
      case "course-assistant":
        systemPrompt = `You are an AI teaching assistant for an online learning platform called Merotalent.
Help students understand course content, answer questions about lessons, explain concepts, 
and provide additional context. Be encouraging, clear, and supportive.
If asked about topics outside the course scope, gently redirect to relevant materials.`;
        break;
        
      case "support-bot":
      default:
        systemPrompt = `You are the AI support assistant for Merotalent, a talent development platform.
You help visitors with:
- Platform features (competitions, courses, mentorship, jobs)
- Account questions (signup, login, profiles)
- Course information and recommendations
- Job listings and application process
- Pricing and subscription details
- Technical support

Be friendly, helpful, and concise. If you cannot answer something, 
suggest contacting support through the contact form.
Platform highlights:
- Skill-based competitions with badges and prizes
- Expert mentorship marketplace
- Comprehensive LMS with mixed content
- Job board with skills matching
- Performance-based talent profiles`;
        break;
    }

    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    };

    // For course builder, use structured output
    if (type === "course-builder") {
      body.stream = false;
      body.tools = [
        {
          type: "function",
          function: {
            name: "generate_course_content",
            description: "Generate course description, syllabus, and learning outcomes",
            parameters: {
              type: "object",
              properties: {
                description: { type: "string", description: "Course description (2-3 paragraphs)" },
                syllabus: { type: "string", description: "Detailed syllabus in markdown format" },
                learning_outcomes: { 
                  type: "array", 
                  items: { type: "string" },
                  description: "5-8 learning outcomes" 
                }
              },
              required: ["description", "syllabus", "learning_outcomes"],
              additionalProperties: false
            }
          }
        }
      ];
      body.tool_choice = { type: "function", function: { name: "generate_course_content" } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For course builder, parse the structured response
    if (type === "course-builder") {
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const content = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify(content), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to generate content" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For streaming responses
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
