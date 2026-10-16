import { createFileRoute } from "@tanstack/react-router";
import { ApiError, pageParams, withApiAuth } from "@/lib/devapi/api-auth.server";

import {withCreators} from '@/lib/marketplace/marketplace.server';

const PATH = "/api/public/v1/marketplace";

export const Route = createFileRoute("/api/public/v1/marketplace")({
  server: {
    handlers: {
      GET: withApiAuth({ scope: "marketplace:read", path: PATH }, async (ctx, request) => {
        const { limit, offset } = pageParams(request);
        const url = new URL(request.url);
        const category = url.searchParams.get("category");

        // Marketplace listings are catalogue data — published items only.
        let query = ctx.admin
          .from("marketplace_listings")
          .select(
            "id,title,slug,description,item_type,tags,price_pence,currency,metadata,published_at,status,seller_id",
          )
          .eq("status", "published").eq("item_type","agent")
          .order("published_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (category) query = query.eq("metadata->>category", category);

        const { data, error } = await query;
        if (error) throw new ApiError(500, "query_failed", error.message);
        const listings=await withCreators(ctx.admin,data??[]);
        return {listings:listings.map((row:any,index:number)=>({id:row.id,title:row.title,slug:data[index].slug,summary:row.description.slice(0,200),category:row.category,tags:row.features,icon:null,price_pence:data[index].price_pence,currency:row.currency,install_count:null,rating_avg:row.rating,rating_count:row.reviews_count,published_at:row.published_at})),limit,offset};
      }),
    },
  },
});
