// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
//
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

Deno.serve(() => {
  return new Response(
    JSON.stringify({ message: "Hello from Edge Functions! NOVA VERSÃO + 8" }),
    { headers: { "Content-Type": "application/json" } },
  )
})

// To invoke:
// curl 'http://localhost:<KONG_HTTP_PORT>/functions/v1/hello' \
//   --header 'Authorization: Bearer <anon/service_role API key>'
 
