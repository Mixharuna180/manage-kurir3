import { users, type User, type InsertUser } from "@shared/schema";
import { products, type Product, type InsertProduct } from "@shared/schema";
import { orders, type Order, type InsertOrder } from "@shared/schema";
import { warehouses, type Warehouse, type InsertWarehouse } from "@shared/schema";
import { trackingEvents, type TrackingEvent, type InsertTrackingEvent } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, or, isNull, count, desc } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import createMemoryStore from "memorystore";

// Fix TypeScript error with session store typing
declare module 'express-session' {
  interface SessionStore {
    all: Function;
    destroy: Function;
    clear: Function;
    length: Function;
    get: Function;
    set: Function;
    touch: Function;
  }
}

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  getAvailableProducts(): Promise<any[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByTransactionId(transactionId: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getUserOrders(userId: number): Promise<Order[]>;
  getAvailableOrders(): Promise<Order[]>;
  getDriverOrders(driverId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;
  
  // Warehouse methods
  getWarehouse(id: number): Promise<Warehouse | undefined>;
  getAllWarehouses(): Promise<Warehouse[]>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, updates: Partial<Warehouse>): Promise<Warehouse>;
  
  // Tracking methods
  getTrackingEvent(id: number): Promise<TrackingEvent | undefined>;
  getOrderTrackingEvents(orderId: number): Promise<TrackingEvent[]>;
  createTrackingEvent(event: InsertTrackingEvent): Promise<TrackingEvent>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private orders: Map<number, Order>;
  private warehouses: Map<number, Warehouse>;
  private trackingEvents: Map<number, TrackingEvent>;
  sessionStore: session.SessionStore;
  
  private userCurrentId: number;
  private productCurrentId: number;
  private orderCurrentId: number;
  private warehouseCurrentId: number;
  private trackingEventCurrentId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.warehouses = new Map();
    this.trackingEvents = new Map();
    
    this.userCurrentId = 1;
    this.productCurrentId = 1;
    this.orderCurrentId = 1;
    this.warehouseCurrentId = 1;
    this.trackingEventCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Create demo warehouse
    this.createWarehouse({
      name: "Jakarta Warehouse",
      address: "Jl. Warehouse No. 1",
      city: "Jakarta",
      region: "DKI Jakarta",
      postalCode: "12345",
      areasServed: "Jakarta Pusat,Jakarta Selatan",
      capacity: 200
    });
    
    this.createWarehouse({
      name: "Bandung Warehouse",
      address: "Jl. Warehouse No. 2",
      city: "Bandung",
      region: "West Java",
      postalCode: "40111",
      areasServed: "Bandung Utara,Bandung Selatan",
      capacity: 150
    });
    
    this.createWarehouse({
      name: "Surabaya Warehouse",
      address: "Jl. Warehouse No. 3",
      city: "Surabaya",
      region: "East Java",
      postalCode: "60111",
      areasServed: "Surabaya Pusat,Surabaya Timur",
      capacity: 180
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }
  
  async getAvailableProducts(): Promise<any[]> {
    // Get all orders with paid status and no buyer yet
    const availableOrders = Array.from(this.orders.values()).filter(
      order => (order.orderStatus === "pending" || order.orderStatus === "paid") && !order.buyerId
    );
    
    // Map to product details with order ID
    const availableProducts = await Promise.all(availableOrders.map(async order => {
      const product = await this.getProduct(order.productId);
      if (product) {
        return {
          ...product,
          orderId: order.id
        };
      }
      return null;
    }));
    
    return availableProducts.filter(p => p !== null) as any[];
  }
  
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.productCurrentId++;
    const now = new Date();
    const product: Product = { 
      ...insertProduct, 
      id,
      createdAt: now
    };
    this.products.set(id, product);
    return product;
  }
  
  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const product = this.products.get(id);
    if (!product) {
      throw new Error(`Product with ID ${id} not found`);
    }
    
    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }
  
  async getOrderByTransactionId(transactionId: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      (order) => order.transactionId === transactionId,
    );
  }
  
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }
  
  async getUserOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.sellerId === userId || order.buyerId === userId,
    );
  }
  
  async getAvailableOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => 
        (order.orderStatus === "paid" && !order.pickupDriverId) || 
        (order.orderStatus === "in_warehouse" && !order.deliveryDriverId)
    );
  }
  
  async getDriverOrders(driverId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.pickupDriverId === driverId || order.deliveryDriverId === driverId,
    );
  }
  
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.orderCurrentId++;
    const now = new Date();
    const order: Order = { 
      ...insertOrder, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.orders.set(id, order);
    return order;
  }
  
  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }
    
    const now = new Date();
    const updatedOrder = { 
      ...order, 
      ...updates,
      updatedAt: now
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }
  
  // Warehouse methods
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    return this.warehouses.get(id);
  }
  
  async getAllWarehouses(): Promise<Warehouse[]> {
    return Array.from(this.warehouses.values());
  }
  
  async createWarehouse(insertWarehouse: InsertWarehouse): Promise<Warehouse> {
    const id = this.warehouseCurrentId++;
    const warehouse: Warehouse = { ...insertWarehouse, id };
    this.warehouses.set(id, warehouse);
    return warehouse;
  }
  
  async updateWarehouse(id: number, updates: Partial<Warehouse>): Promise<Warehouse> {
    const warehouse = this.warehouses.get(id);
    if (!warehouse) {
      throw new Error(`Warehouse with ID ${id} not found`);
    }
    
    const updatedWarehouse = { ...warehouse, ...updates };
    this.warehouses.set(id, updatedWarehouse);
    return updatedWarehouse;
  }
  
  // Tracking methods
  async getTrackingEvent(id: number): Promise<TrackingEvent | undefined> {
    return this.trackingEvents.get(id);
  }
  
  async getOrderTrackingEvents(orderId: number): Promise<TrackingEvent[]> {
    return Array.from(this.trackingEvents.values())
      .filter(event => event.orderId === orderId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  async createTrackingEvent(insertEvent: InsertTrackingEvent): Promise<TrackingEvent> {
    const id = this.trackingEventCurrentId++;
    const now = new Date();
    const event: TrackingEvent = { 
      ...insertEvent, 
      id,
      timestamp: now
    };
    this.trackingEvents.set(id, event);
    return event;
  }
}

// Implement DatabaseStorage for PostgreSQL operations
export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Gunakan MemoryStore untuk menghindari masalah dengan PostgreSQL session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 jam
    });
    
    // Create initial warehouses if they don't exist
    this.initializeWarehouses();
  }

  private async initializeWarehouses() {
    const warehouseCount = await db.select({ count: count() }).from(warehouses);
    if (warehouseCount[0].count === 0) {
      await db.insert(warehouses).values([
        {
          name: "Jakarta Warehouse",
          address: "Jl. Warehouse No. 1",
          city: "Jakarta",
          region: "DKI Jakarta",
          postalCode: "12345",
          areasServed: "Jakarta Pusat,Jakarta Selatan",
          capacity: 200
        },
        {
          name: "Bandung Warehouse",
          address: "Jl. Warehouse No. 2",
          city: "Bandung",
          region: "West Java",
          postalCode: "40111",
          areasServed: "Bandung Utara,Bandung Selatan",
          capacity: 150
        },
        {
          name: "Surabaya Warehouse",
          address: "Jl. Warehouse No. 3",
          city: "Surabaya",
          region: "East Java",
          postalCode: "60111",
          areasServed: "Surabaya Pusat,Surabaya Timur",
          capacity: 180
        }
      ]);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    return result[0];
  }
  
  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0];
  }
  
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }
  
  async getAvailableProducts(): Promise<any[]> {
    // Get all orders with paid status and no buyer yet
    const availableOrders = await db.select().from(orders)
      .where(and(
        or(
          eq(orders.orderStatus, "pending"),
          eq(orders.orderStatus, "paid")
        ),
        isNull(orders.buyerId)
      ));
    
    // Map to product details with order ID
    const availableProducts = await Promise.all(availableOrders.map(async order => {
      const product = await this.getProduct(order.productId);
      if (product) {
        return {
          ...product,
          orderId: order.id
        };
      }
      return null;
    }));
    
    return availableProducts.filter(p => p !== null) as any[];
  }
  
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(insertProduct).returning();
    return result[0];
  }
  
  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const result = await db.update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Product with ID ${id} not found`);
    }
    
    return result[0];
  }
  
  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }
  
  async getOrderByTransactionId(transactionId: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.transactionId, transactionId));
    return result[0];
  }
  
  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }
  
  async getUserOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(or(
        eq(orders.sellerId, userId),
        eq(orders.buyerId, userId)
      ));
  }
  
  async getAvailableOrders(): Promise<Order[]> {
    return await db.select().from(orders)
      .where(or(
        and(
          eq(orders.orderStatus, "paid"),
          isNull(orders.pickupDriverId)
        ),
        and(
          eq(orders.orderStatus, "in_warehouse"),
          isNull(orders.deliveryDriverId)
        )
      ));
  }
  
  async getDriverOrders(driverId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(or(
        eq(orders.pickupDriverId, driverId),
        eq(orders.deliveryDriverId, driverId)
      ));
  }
  
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(insertOrder).returning();
    return result[0];
  }
  
  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const result = await db.update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Order with ID ${id} not found`);
    }
    
    return result[0];
  }
  
  // Warehouse methods
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    const result = await db.select().from(warehouses).where(eq(warehouses.id, id));
    return result[0];
  }
  
  async getAllWarehouses(): Promise<Warehouse[]> {
    return await db.select().from(warehouses);
  }
  
  async createWarehouse(insertWarehouse: InsertWarehouse): Promise<Warehouse> {
    const result = await db.insert(warehouses).values(insertWarehouse).returning();
    return result[0];
  }
  
  async updateWarehouse(id: number, updates: Partial<Warehouse>): Promise<Warehouse> {
    const result = await db.update(warehouses)
      .set(updates)
      .where(eq(warehouses.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Warehouse with ID ${id} not found`);
    }
    
    return result[0];
  }
  
  // Tracking methods
  async getTrackingEvent(id: number): Promise<TrackingEvent | undefined> {
    const result = await db.select().from(trackingEvents).where(eq(trackingEvents.id, id));
    return result[0];
  }
  
  async getOrderTrackingEvents(orderId: number): Promise<TrackingEvent[]> {
    return await db.select().from(trackingEvents)
      .where(eq(trackingEvents.orderId, orderId))
      .orderBy(desc(trackingEvents.timestamp));
  }
  
  async createTrackingEvent(insertEvent: InsertTrackingEvent): Promise<TrackingEvent> {
    const result = await db.insert(trackingEvents).values(insertEvent).returning();
    return result[0];
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
