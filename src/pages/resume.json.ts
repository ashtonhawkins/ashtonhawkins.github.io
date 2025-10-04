import type { APIRoute } from "astro";
import resume from "../content/resume.json";

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(resume, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
