import { Router, type IRouter } from "express";
import { db, productsTable, productVariantsTable, stockItemsTable } from "@workspace/db";
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import {
  GetProductsQueryParams,
  GetProductsResponse,
  GetProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseProductFields(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

type VariantOut = {
  id: number;
  productId: number;
  name: string;
  durationDays: number | null;
  price: number;
  sortOrder: number;
  isActive: boolean;
  stockCount: number;
};

async function loadVariantsByProductIds(productIds: number[]): Promise<Map<number, VariantOut[]>> {
  const result = new Map<number, VariantOut[]>();
  if (productIds.length === 0) return result;

  const variants = await db
    .select()
    .from(productVariantsTable)
    .where(and(inArray(productVariantsTable.productId, productIds), eq(productVariantsTable.isActive, true)))
    .orderBy(asc(productVariantsTable.sortOrder), asc(productVariantsTable.id));

  if (variants.length === 0) return result;

  const variantIds = variants.map((v) => v.id);
  const counts = await db
    .select({
      variantId: stockItemsTable.variantId,
      count: sql<number>`count(*)::int`,
    })
    .from(stockItemsTable)
    .where(and(inArray(stockItemsTable.variantId, variantIds), eq(stockItemsTable.status, "available")))
    .groupBy(stockItemsTable.variantId);
  const byVariant = new Map(counts.map((c) => [c.variantId, Number(c.count) || 0]));

  for (const v of variants) {
    const out: VariantOut = {
      id: v.id,
      productId: v.productId,
      name: v.name,
      durationDays: v.durationDays,
      price: Number(v.price),
      sortOrder: v.sortOrder,
      isActive: v.isActive,
      stockCount: byVariant.get(v.id) ?? 0,
    };
    const arr = result.get(v.productId) ?? [];
    arr.push(out);
    result.set(v.productId, arr);
  }
  return result;
}

router.get("/products", async (req, res): Promise<void> => {
  const params = GetProductsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let products;
  if (params.data.category && params.data.category !== "Tout") {
    products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.category, params.data.category));
  } else {
    products = await db.select().from(productsTable);
  }

  const variantsByProduct = await loadVariantsByProductIds(products.map((p) => p.id));

  res.json(
    GetProductsResponse.parse(
      products.map((p) => {
        const { digitalContent: _dc, digitalImageUrl: _di, ...rest } = p;
        return {
          ...rest,
          price: Number(p.price),
          customerInfoFields: parseProductFields(p.customerInfoFields),
          variants: variantsByProduct.get(p.id) ?? [],
        };
      })
    )
  );
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const variantsByProduct = await loadVariantsByProductIds([product.id]);

  const { digitalContent: _dc, digitalImageUrl: _di, ...rest } = product;
  res.json(
    GetProductResponse.parse({
      ...rest,
      price: Number(product.price),
      customerInfoFields: parseProductFields(product.customerInfoFields),
      variants: variantsByProduct.get(product.id) ?? [],
    })
  );
});

export default router;
