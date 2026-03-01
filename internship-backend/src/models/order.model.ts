import db from "../config/knex";
import type { Knex } from "knex";

export interface OrderRow {
  id: number;
  user_id: number;
  firebase_uid: string;
  order_id: string;
  status: string;
  payment_method: string;
  subtotal: number;
  total: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrderInput {
  userId: number;
  firebaseUid: string;
  orderId: string;
  paymentMethod: string;
  items: Array<{
    productId: number;
    title: string;
    price: number;
    thumbnail: string;
    quantity: number;
  }>;
  address: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
  };
  subtotal: number;
  total: number;
}

const create = async (input: CreateOrderInput): Promise<OrderRow> =>
  createWithTrx(input);

const createWithTrx = async (
  input: CreateOrderInput,
  trx?: Knex.Transaction
): Promise<OrderRow> => {
  if (trx) {
    return insertOrderGraph(trx, input);
  }

  return db.transaction(async (txn: Knex.Transaction) => insertOrderGraph(txn, input));
};

const insertOrderGraph = async (
  trx: Knex.Transaction,
  input: CreateOrderInput
): Promise<OrderRow> =>
  (async () => {
    const rows = (await trx("orders")
      .insert({
        user_id: input.userId,
        firebase_uid: input.firebaseUid,
        order_id: input.orderId,
        status: "pending",
        payment_method: input.paymentMethod,
        subtotal: input.subtotal,
        total: input.total,
      })
      .returning("*")) as OrderRow[];

    const order = rows[0];

    if (input.items.length > 0) {
      await trx("order_items").insert(
        input.items.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          title: item.title,
          price: item.price,
          thumbnail: item.thumbnail,
          quantity: item.quantity,
        }))
      );
    }

    await trx("shipping_addresses").insert({
      order_id: order.id,
      full_name: input.address.fullName,
      phone: input.address.phone,
      email: input.address.email,
      address_line1: input.address.addressLine1,
      address_line2: input.address.addressLine2,
      city: input.address.city,
      state: input.address.state,
      pincode: input.address.pincode,
    });

    return order;
  })();

const getByUserId = async (userId: number): Promise<any[]> => {
  const orders = await db<OrderRow>("orders")
    .select("*")
    .where({ user_id: userId })
    .orderBy("created_at", "desc");

  if (orders.length === 0) return [];

  const orderIds = orders.map((order: OrderRow) => order.id);

  const items = await db("order_items")
    .select("id", "order_id", "product_id", "title", "price", "thumbnail", "quantity")
    .whereIn("order_id", orderIds)
    .orderBy("id", "asc");

  const latestPayments = await db("payments as p")
    .select("p.order_id", "p.status")
    .whereIn("p.order_id", orderIds)
    .whereIn(
      "p.id",
      db("payments")
        .select(db.raw("MAX(id)"))
        .whereIn("order_id", orderIds)
        .groupBy("order_id")
    );

  const itemsByOrder = new Map<number, any[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({
      id: item.id,
      productId: item.product_id,
      title: item.title,
      price: item.price,
      thumbnail: item.thumbnail,
      quantity: item.quantity,
    });
    itemsByOrder.set(item.order_id, list);
  }

  const paymentStatusByOrder = new Map<number, string>();
  for (const payment of latestPayments) {
    paymentStatusByOrder.set(payment.order_id, payment.status);
  }

  return orders.map((order: OrderRow) => ({
    ...order,
    payment_status: paymentStatusByOrder.get(order.id),
    items: itemsByOrder.get(order.id) ?? [],
  }));
};

const getByOrderId = async (orderId: string, userId: number): Promise<any | null> => {
  const order = await db<OrderRow>("orders")
    .select("*")
    .where({ order_id: orderId, user_id: userId })
    .first();

  if (!order) return null;

  const [items, address] = await Promise.all([
    db("order_items")
      .select("id", "product_id", "title", "price", "thumbnail", "quantity")
      .where({ order_id: order.id })
      .orderBy("id", "asc"),
    db("shipping_addresses")
      .select(
        "full_name",
        "phone",
        "email",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "pincode"
      )
      .where({ order_id: order.id })
      .first(),
  ]);

  return {
    ...order,
    items: items.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      title: item.title,
      price: item.price,
      thumbnail: item.thumbnail,
      quantity: item.quantity,
    })),
    address: address
      ? {
          fullName: address.full_name,
          phone: address.phone,
          email: address.email,
          addressLine1: address.address_line1,
          addressLine2: address.address_line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        }
      : null,
  };
};

const getByOrderIdAny = async (orderId: string): Promise<any | null> => {
  const row = await db("orders as o")
    .leftJoin("shipping_addresses as sa", "sa.order_id", "o.id")
    .select("o.*", "sa.email as shipping_email")
    .where("o.order_id", orderId)
    .first();

  return row ?? null;
};

const getWorkflowDataByOrderId = async (orderId: string): Promise<any | null> => {
  const order = await db("orders as o")
    .leftJoin("shipping_addresses as sa", "sa.order_id", "o.id")
    .select(
      "o.id",
      "o.user_id",
      "o.firebase_uid",
      "o.order_id",
      "o.created_at",
      "o.payment_method",
      "o.subtotal",
      "o.total",
      "sa.full_name",
      "sa.phone",
      "sa.email",
      "sa.address_line1",
      "sa.address_line2",
      "sa.city",
      "sa.state",
      "sa.pincode"
    )
    .where("o.order_id", orderId)
    .first();

  if (!order) return null;

  const items = await db("order_items")
    .select("product_id", "title", "price", "thumbnail", "quantity")
    .where({ order_id: order.id })
    .orderBy("id", "asc");

  return {
    ...order,
    items,
  };
};

const updateStatus = async (orderId: string, status: string): Promise<void> => {
  await db("orders")
    .where({ order_id: orderId })
    .update({
      status,
      updated_at: db.fn.now(),
    });
};

const cancelPendingByUser = async (
  userId: number,
  exceptOrderId?: string
): Promise<Array<{ id: number; order_id: string }>> => {
  const pendingOrders = await db("orders")
    .select("id", "order_id")
    .where({ user_id: userId, status: "pending" })
    .modify((qb) => {
      if (exceptOrderId) {
        qb.andWhereNot({ order_id: exceptOrderId });
      }
    });

  if (pendingOrders.length === 0) return [];

  const pendingOrderIds = pendingOrders.map((row: { id: number }) => row.id);

  const rows = await db("orders")
    .whereIn("id", pendingOrderIds)
    .update({
      status: "cancelled",
      updated_at: db.fn.now(),
    })
    .returning(["id", "order_id"]);

  return rows.map((row: { id: number; order_id: string }) => ({
    id: Number(row.id),
    order_id: String(row.order_id),
  }));
};

export default {
  create,
  createWithTrx,
  getByUserId,
  getByOrderId,
  getByOrderIdAny,
  getWorkflowDataByOrderId,
  updateStatus,
  cancelPendingByUser,
};
