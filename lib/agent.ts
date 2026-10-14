import { 
  ToolLoopAgent,
 type InferAgentUIMessage,
 type UIToolInvocation,
 } from "ai";
import { searchProducts, getAllCategories, getProductDetails, returnOrder } from "@/lib/tools";

export const shoppingAgent = new ToolLoopAgent({
  model: "claude-sonnet-5",
  instructions: `You are a helpful assistant for the Vercel swag store. 
  When the user asks about products, availability, or recommendations, use the searchProducts tool to look up real catalog data before answering.
  When asked about a type or category of product use the getAllCategories tool 
  for getting valid categories before using searchProducts.
  When the user asks about a specific product — price, images, description, or inventory — use getProductDetails with that product's id or slug. Search first if you do not already have it. Prices are integer cents. This catalog has no size variants; report the live stock count from the tool.
  When the user wants to return an order, use the returnOrder tool. Ask for the order ID and reason if they haven't provided them. Example order IDs are 11111, 22222, and 33333.`,
  tools: { searchProducts, getAllCategories, getProductDetails, returnOrder },
});

export type ShoppingAgentUIMessage = InferAgentUIMessage<typeof shoppingAgent>;
export type SearchProductsToolInvocation = UIToolInvocation<typeof searchProducts>;
export type ProductDetailsToolInvocation = UIToolInvocation<typeof getProductDetails>;