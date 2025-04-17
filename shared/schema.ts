import { pgTable, text, serial, integer, boolean, timestamp, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  userType: text("user_type").notNull().default("user"), // user, driver, or admin
  serviceArea: text("service_area"), // untuk driver: area layanan (kecamatan)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  phoneNumber: true,
  address: true,
  city: true,
  postalCode: true,
  userType: true,
  serviceArea: true,
});

// Products schema for listings
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("Other"),
  shippingCategory: text("shipping_category").notNull(), // A, B, C, or Custom
  shippingPrice: real("shipping_price").notNull(),
  productStatus: text("product_status").notNull().default("unpaid"), // paid or unpaid
  shippingPaidBy: text("shipping_paid_by").notNull().default("buyer"), // buyer or seller
  price: real("price").notNull(),
  weight: real("weight").notNull(),
  quantity: integer("quantity").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  pickupLatitude: text("pickup_latitude"),
  pickupLongitude: text("pickup_longitude"),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).pick({
  userId: true,
  name: true,
  description: true,
  category: true,
  shippingCategory: true,
  shippingPrice: true,
  productStatus: true,
  shippingPaidBy: true,
  price: true,
  weight: true,
  quantity: true,
  pickupAddress: true,
  pickupLatitude: true,
  pickupLongitude: true,
  city: true,
  postalCode: true,
});

// Orders schema for tracking shipments
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  transactionId: varchar("transaction_id", { length: 50 }).notNull().unique(),
  productId: integer("product_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  buyerId: integer("buyer_id"),
  orderStatus: text("order_status").notNull().default("pending"), // pending, paid, pickup_assigned, picked_up, in_warehouse, delivery_assigned, in_transit, delivered
  pickupDriverId: integer("pickup_driver_id"),
  deliveryDriverId: integer("delivery_driver_id"),
  deliveryAddress: text("delivery_address"),
  deliveryCity: text("delivery_city"),
  deliveryPostalCode: text("delivery_postal_code"),
  warehouseId: integer("warehouse_id"),
  paymentId: text("payment_id"),
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, paid
  paymentLink: text("payment_link"),
  // Bank transfer details - CATATAN: Kolom ini belum ada di database
  // Gunakan sessionStorage di client untuk sementara waktu
  // va_number: text("va_number"),
  // bank: text("bank"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  transactionId: true,
  productId: true,
  sellerId: true,
  buyerId: true,
  orderStatus: true,
  pickupDriverId: true,
  deliveryDriverId: true,
  deliveryAddress: true,
  deliveryCity: true,
  deliveryPostalCode: true,
  warehouseId: true,
  paymentId: true,
  paymentStatus: true,
  paymentLink: true,
});

// Warehouses for sorting by region
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  postalCode: text("postal_code").notNull(),
  areasServed: text("areas_served"), // Kecamatan yang dilayani (dipisahkan dengan koma)
  capacity: integer("capacity").default(100), // Kapasitas warehouse
});

export const insertWarehouseSchema = createInsertSchema(warehouses).pick({
  name: true,
  address: true,
  city: true,
  region: true,
  postalCode: true,
  areasServed: true,
  capacity: true,
});

// Shipment tracking events
export const trackingEvents = pgTable("tracking_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertTrackingEventSchema = createInsertSchema(trackingEvents).pick({
  orderId: true,
  status: true,
  description: true,
  location: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;

export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type InsertTrackingEvent = z.infer<typeof insertTrackingEventSchema>;

// Login data type
export type LoginData = Pick<InsertUser, "username" | "password">;

// Extended schemas with validation
export const userRegisterSchema = insertUserSchema.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const productFormSchema = insertProductSchema.extend({
  price: z.coerce.number().positive({ message: "Price must be a positive number" }),
  weight: z.coerce.number().positive({ message: "Weight must be a positive number" }),
  quantity: z.coerce.number().int().positive({ message: "Quantity must be a positive integer" }),
});

export const purchaseFormSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(8, { message: "Valid phone number is required" }),
  deliveryAddress: z.string().min(5, { message: "Full address is required" }),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().min(1, { message: "State is required" }),
  postalCode: z.string().min(1, { message: "Postal code is required" }),
});
