import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

export const inventoryRoutes = new Elysia({ prefix: "/inventory" })

  // Lab 1: GET /inventory — ดึงข้อมูลสินค้าทั้งหมด เรียงตามชื่อ A-Z
  // Challenge: รองรับ query ?low_stock=true เพื่อดึงเฉพาะสินค้าที่ quantity <= 10
  .get("/", async ({ query }) => {
    const { low_stock } = query as { low_stock?: boolean };

    const where = low_stock ? { quantity: { lte: 10 } } : {};

    const items = await prisma.inventory.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return items;
  }, {
    query: t.Object({
      low_stock: t.Optional(t.Boolean()),
    }),
  })

  // Lab 2: POST /inventory — เพิ่มสินค้าใหม่ พร้อม Validation ด้วย TypeBox
  // เงื่อนไข: name, sku, zone เป็น string ห้ามว่าง; quantity เป็นตัวเลข และ default = 0 ถ้าไม่ส่งมา
  .post("/", async ({ body, set }) => {
    const { name, sku, zone } = body as { name: string; sku: string; zone: string };
    const quantity = (body as { quantity?: number }).quantity ?? 0;

    const created = await prisma.inventory.create({
      data: { id: crypto.randomUUID(), name, sku, zone, quantity },
    });

    set.status = 201;
    return created;
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      sku: t.String({ minLength: 1 }),
      zone: t.String({ minLength: 1 }),
      quantity: t.Optional(t.Integer()),
    }),
  })

  // Lab 3: PATCH /inventory/:id/adjust — ปรับจำนวนสต็อกด้วย { change }
  .patch("/:id/adjust", async ({ params, body, set }) => {
    const { id } = params as { id: string };
    const { change } = body as { change: number };

    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      set.status = 404;
      return { message: "Inventory item not found" };
    }

    const updated = await prisma.inventory.update({
      where: { id },
      data: { quantity: { increment: change } },
    });

    return updated;
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ change: t.Integer() }),
  })

  // Lab 4: DELETE /inventory/:id — ลบสินค้า เฉพาะเมื่อ quantity = 0 มิฉะนั้น 400
  .delete("/:id", async ({ params, set }) => {
    const { id } = params as { id: string };

    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      set.status = 404;
      return { message: "Inventory item not found" };
    }

    if (existing.quantity > 0) {
      set.status = 400;
      return { message: "ไม่สามารถลบสินค้าที่ยังมีอยู่ในสต็อกได้" };
    }

    await prisma.inventory.delete({ where: { id } });
    return { message: "Deleted successfully" };
  }, {
    params: t.Object({ id: t.String() }),
  });
