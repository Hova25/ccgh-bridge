import type { APIRoute } from "astro";
import { searchIndexOf } from "../../../src/docs/search-index";
import { entriesOf } from "../entries";

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(searchIndexOf({ entries: await entriesOf() })), {
    headers: { "content-type": "application/json" },
  });
