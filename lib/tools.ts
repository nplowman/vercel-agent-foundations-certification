import { tool } from "ai";
import { z } from "zod";
import { ApiRequestError, getCategories, getProducts, getProductById, getProductStock, createReturn, getOrder, preauthorizeRefund, notifyReturnInProcess } from "@/lib/api";
import { start } from "workflow/api";
import { returnFlow } from "@/lib/workflows/return-flow";

export const searchProducts = tool({
  description: `Search the Vercel swag store product catalog. Use this whenver the user asks about products, what the store sells, or wants recommdantions. Optionally narrow results to a single category.`,
  inputSchema: z.object({
    query: z
    .string()
    .optional()
    .describe(`Optional, free-text search terms describing what the user is looking for. e.g. 'hoodie' or 'water bottle'`),
    category: z
      .string()
      .optional()
      .describe(`Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get valid category slugs.`),
  }),
  execute: async ({ query, category }) => {
    "use step";
    try {
      const products = await getProducts({
        search: query,
        category,
        limit: 10,
      });
      return {
        count: products.length,
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images[0],
          price: product.price,
          currency: product.currency,
          category: product.category,
          description: product.description,
        })),
      }
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "Unknown error";
      return {
        count: 0,
        products: [],
        error: message,
      };
    }
  },
});

export const getAllCategories = tool({
  description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
  inputSchema: z.object({}),
  execute: async () => {
    "use step";
    try {
      const categories = await getCategories();
      return {
        count: categories.length,
        categories: categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          productCount: c.productCount,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, categories: [], error: message };
    }
  },
});

export const getProductDetails = tool({
  description: `Get the full details for one product: price (integer cents), images, description, category, tags, and live inventory. Use this when the user asks about a specific product. Pass the product id from searchProducts. This catalog has no size variants; inventory is a single stock count.`,
  inputSchema: z.object({
    productId: z
      .string()
      .describe(
        "Product id (or slug) from searchProducts, for example a catalog id string."
      ),
  }),
  execute: async ({ productId }) => {
    "use step";
    try {
      const [product, stock] = await Promise.all([
        getProductById(productId),
        getProductStock(productId),
      ]);
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        currency: product.currency,
        category: product.category,
        image: product.images[0] ?? null,
        images: product.images,
        tags: product.tags,
        featured: product.featured,
        inventory: {
          stock: stock.stock,
          inStock: stock.inStock,
          lowStock: stock.lowStock,
        },
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});

export const returnOrder = tool({
  description: `File a return for one of the user's past orders. The user must provide an order ID and a reason. Example order IDs: 11111, 22222, 33333.`,
  inputSchema: z.object({
    orderId: z
      .string()
      .describe("The order ID the user wants to return."),
    reason: z
      .string()
      .min(10)
      .max(500)
      .describe("Why the user is returning the order."),
  }),
  execute: async ({ orderId, reason }) => {
    "use step";
    const run = await start(returnFlow, [orderId, reason]);
    return { runId: run.runId, message: `Return request received for order ${orderId}`};
  },
});
