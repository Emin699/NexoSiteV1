import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

  res.json(
    GetProductsResponse.parse(
      products.map((p) => {
        const { digitalContent: _dc, digitalImageUrl: _di, ...rest } = p;
        return {
          ...rest,
          price: Number(p.price),
          customerInfoFields: parseProductFields(p.customerInfoFields),
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

  const { digitalContent: _dc, digitalImageUrl: _di, ...rest } = product;
  res.json(
    GetProductResponse.parse({
      ...rest,
      price: Number(product.price),
      customerInfoFields: parseProductFields(product.customerInfoFields),
    })
  );
});

export default router;
