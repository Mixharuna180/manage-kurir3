import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  generateTransactionId, 
  createPayment, 
  getPaymentStatus,
  parseWebhook,
  formatToIDR,
  snap
} from "./midtrans";

// Environment check
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
import { trackingEvents, insertTrackingEventSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Get all orders - for admin panel
  app.get("/api/orders", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Hanya admin yang bisa melihat semua order
      if (req.user.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: Not an admin" });
      }
      
      const orders = await storage.getAllOrders();
      
      // Fetch product details for each order
      const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        const product = await storage.getProduct(order.productId);
        const seller = await storage.getUser(order.sellerId);
        const buyer = order.buyerId ? await storage.getUser(order.buyerId) : null;
        
        return {
          ...order,
          product: product ? {
            id: product.id,
            name: product.name,
            price: product.price,
            shippingPrice: product.shippingPrice,
            category: product.category
          } : null,
          sellerName: seller ? seller.fullName || seller.username : null,
          buyerName: buyer ? buyer.fullName || buyer.username : null
        };
      }));
      
      res.json(ordersWithDetails);
    } catch (error) {
      next(error);
    }
  });
  
  // Get all drivers - for admin panel
  app.get("/api/drivers", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Hanya admin yang bisa melihat semua driver
      if (req.user.userType !== "admin" && req.user.userType !== "driver") {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
      
      // Get all users with userType = "driver"
      const users = await storage.getAllUsers();
      const drivers = users.filter(user => user.userType === "driver");
      
      res.json(drivers);
    } catch (error) {
      next(error);
    }
  });
  
  // Update driver data
  app.patch("/api/drivers/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Hanya admin yang bisa mengupdate data driver
      if (req.user.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
      
      const driverId = parseInt(req.params.id);
      const driver = await storage.getUser(driverId);
      
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      
      if (driver.userType !== "driver") {
        return res.status(400).json({ message: "User is not a driver" });
      }
      
      // Update driver data
      // Perhatikan bahwa kita tidak mengubah userType dan username
      const allowedFields = [
        'fullName', 
        'email', 
        'phoneNumber', 
        'address', 
        'city', 
        'postalCode', 
        'serviceArea'
      ];
      
      // Filter only allowed fields
      const filteredData: any = {};
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredData[key] = req.body[key];
        }
      });
      
      // Update user
      const updatedDriver = await storage.updateUser(driverId, filteredData);
      res.json(updatedDriver);
    } catch (error) {
      next(error);
    }
  });
  
  // Warehouse routes
  app.post("/api/warehouses", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Hanya admin yang bisa membuat warehouse
      if (req.user.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: Not an admin" });
      }
      
      const warehouse = await storage.createWarehouse(req.body);
      res.status(201).json(warehouse);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/warehouses", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Admin dan driver dapat melihat warehouse
      if (req.user.userType !== "admin" && req.user.userType !== "driver") {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
      
      const warehouses = await storage.getAllWarehouses();
      
      // Jika parameter include=orders ditentukan, sertakan juga data order untuk setiap warehouse
      if (req.query.include === 'orders') {
        const orders = await storage.getAllOrders();
        
        // Tambahkan hitungan order untuk setiap warehouse
        const warehousesWithCounts = warehouses.map(warehouse => {
          const warehouseOrders = orders.filter(order => order.warehouseId === warehouse.id);
          const incomingCount = warehouseOrders.filter(o => 
            ["paid", "pickup_assigned", "picked_up"].includes(o.orderStatus)).length;
          const inWarehouseCount = warehouseOrders.filter(o => 
            ["in_warehouse"].includes(o.orderStatus)).length;
          const outgoingCount = warehouseOrders.filter(o => 
            ["delivery_assigned", "in_transit"].includes(o.orderStatus)).length;
          
          return {
            ...warehouse,
            orderCounts: {
              incoming: incomingCount,
              inWarehouse: inWarehouseCount,
              outgoing: outgoingCount,
              total: warehouseOrders.length
            }
          };
        });
        
        return res.json(warehousesWithCounts);
      }
      
      res.json(warehouses);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/warehouses/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const warehouseId = parseInt(req.params.id);
      const warehouse = await storage.getWarehouse(warehouseId);
      
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      res.json(warehouse);
    } catch (error) {
      next(error);
    }
  });
  
  app.patch("/api/warehouses/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Solo el admin puede actualizar warehouses
      if (req.user.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }
      
      const warehouseId = parseInt(req.params.id);
      const warehouse = await storage.getWarehouse(warehouseId);
      
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      // Actualizar warehouse
      const updatedWarehouse = await storage.updateWarehouse(warehouseId, {
        ...req.body,
      });
      
      res.json(updatedWarehouse);
    } catch (error) {
      next(error);
    }
  });

  // User routes
  app.get("/api/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Hanya admin yang bisa melihat semua pengguna
      if (req.user.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: Not an admin" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  // Product routes
  app.post("/api/products", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const product = await storage.createProduct({
        ...req.body,
        userId: req.user.id,
      });
      
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/products", async (req, res, next) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/products/available", async (req, res, next) => {
    try {
      const availableProducts = await storage.getAvailableProducts();
      res.json(availableProducts);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/products/:id", async (req, res, next) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      next(error);
    }
  });

  // Order routes
  app.post("/api/orders", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Generate transaction ID if not provided
      const transactionId = req.body.transactionId || generateTransactionId();
      
      // Create order
      const order = await storage.createOrder({
        ...req.body,
        transactionId,
        sellerId: req.body.sellerId || req.user.id,
      });

      // Get product details for the response
      const product = await storage.getProduct(order.productId);
      
      // Generate tracking event for order creation
      await storage.createTrackingEvent({
        orderId: order.id,
        status: "pending",
        description: "Order created",
        location: product?.city,
      });
      
      res.status(201).json({
        ...order,
        productName: product?.name,
        price: product?.price,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/user", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const orders = await storage.getUserOrders(userId);
      
      // Fetch product names for each order
      const ordersWithProductNames = await Promise.all(orders.map(async (order) => {
        const product = await storage.getProduct(order.productId);
        return {
          ...order,
          productName: product?.name,
        };
      }));
      
      res.json(ordersWithProductNames);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/available", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const availableOrders = await storage.getAvailableOrders();
      
      // Fetch product names for each order
      const ordersWithProductNames = await Promise.all(availableOrders.map(async (order) => {
        const product = await storage.getProduct(order.productId);
        return {
          ...order,
          productName: product?.name,
        };
      }));
      
      res.json(ordersWithProductNames);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/driver", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (req.user.userType !== "driver") {
        return res.status(403).json({ message: "Forbidden: Not a driver" });
      }
      
      const driverId = req.user.id;
      const orders = await storage.getDriverOrders(driverId);
      
      // Fetch product names for each order
      const ordersWithProductNames = await Promise.all(orders.map(async (order) => {
        const product = await storage.getProduct(order.productId);
        return {
          ...order,
          productName: product?.name,
        };
      }));
      
      res.json(ordersWithProductNames);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/transaction/:transactionId", async (req, res, next) => {
    try {
      const transactionId = req.params.transactionId;
      const order = await storage.getOrderByTransactionId(transactionId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/:id", async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Untuk checkout, kita izinkan publik melihat order
      // Ini diperlukan pada proses checkout
      res.json(order);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/orders/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Check if user has permission to update this order
      if (
        req.user.id === order.sellerId || 
        req.user.id === order.buyerId || 
        req.user.id === order.pickupDriverId || 
        req.user.id === order.deliveryDriverId ||
        req.user.userType === "admin"
      ) {
        const updatedOrder = await storage.updateOrder(orderId, req.body);
        return res.json(updatedOrder);
      }
      
      res.status(403).json({ message: "Forbidden: You don't have permission to update this order" });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/orders/:id/status", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Update order status
      const { status, description, location, driverId } = req.body;
      const updates: any = { orderStatus: status };
      
      // Update driver ID if appropriate
      if (driverId) {
        if (status === "pickup_assigned") {
          updates.pickupDriverId = driverId;
        } else if (status === "delivery_assigned") {
          updates.deliveryDriverId = driverId;
        }
      }
      
      const updatedOrder = await storage.updateOrder(orderId, updates);
      
      // Create tracking event
      await storage.createTrackingEvent({
        orderId,
        status,
        description,
        location,
      });
      
      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  });

  // Tracking routes
  app.get("/api/tracking/:orderId", async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const trackingEvents = await storage.getOrderTrackingEvents(orderId);
      
      res.json(trackingEvents);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/tracking", async (req, res, next) => {
    try {
      // Validate request data
      const data = insertTrackingEventSchema.parse(req.body);
      
      // Create tracking event
      const event = await storage.createTrackingEvent(data);
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating tracking event:", error);
      next(error);
    }
  });

  // Purchase order
  app.post("/api/orders/:id/purchase", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const orderId = parseInt(req.params.id);
      const { buyerId } = req.body;
      
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      if (order.buyerId) {
        return res.status(400).json({ message: "This order has already been purchased" });
      }
      
      // Get the product
      const product = await storage.getProduct(order.productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Update order with buyer ID
      const updatedOrder = await storage.updateOrder(orderId, {
        buyerId: buyerId || req.user.id,
        orderStatus: "pending_payment"
      });
      
      // Create tracking event
      await storage.createTrackingEvent({
        orderId,
        status: "pending_payment",
        description: "Buyer assigned to order",
        location: product.city,
      });
      
      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  });

  // Payment routes
  app.post("/api/payments", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { 
        orderId, 
        customerName, 
        customerEmail,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        deliveryPostalCode,
        phoneNumber
      } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Pastikan informasi pengiriman disimpan
      if (deliveryAddress) {
        console.log("Updating order with delivery information:", {
          deliveryAddress,
          deliveryCity,
          deliveryPostalCode
        });
      }
      
      // Get order details
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Get product details to calculate the total amount
      const product = await storage.getProduct(order.productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Calculate total amount (product price + shipping price)
      const totalAmount = product.price + product.shippingPrice;
      
      console.log(`Creating payment for order ${orderId}:`, {
        transactionId: order.transactionId,
        productName: product.name,
        productPrice: product.price,
        shippingPrice: product.shippingPrice,
        totalAmount: totalAmount
      });
      
      // Mendapatkan URL dasar dari request
      const baseUrl = `${req.protocol}://${req.get('host') || req.headers.host || 'localhost:5000'}`;
      
      // Menghindari double slash dengan menggunakan normalizePath dari utils
      const successUrl = new URL(`/order-success?id=${orderId}`, baseUrl).toString();
      const failureUrl = new URL(`/order-failed?id=${orderId}`, baseUrl).toString();
      
      console.log("Payment redirect URLs:", {
        success: successUrl, 
        failure: failureUrl
      });
      
      // Gunakan Core API Midtrans untuk membuat transaksi baru
      const payment = await createPayment({
        externalID: order.transactionId,
        payerEmail: customerEmail || req.user.email || 'customer@example.com',
        description: `Payment for ${product.name}`,
        amount: totalAmount,
        successRedirectURL: successUrl,
        failureRedirectURL: failureUrl,
        itemDetails: [
          {
            id: `PROD-${product.id}`,
            price: product.price,
            quantity: 1,
            name: product.name
          },
          {
            id: 'SHIPPING',
            price: product.shippingPrice,
            quantity: 1,
            name: 'Shipping Cost'
          }
        ],
        customerDetails: {
          firstName: customerName || req.user.fullName || req.user.username,
          email: customerEmail || req.user.email || 'customer@example.com',
          phone: phoneNumber || req.user.phoneNumber || ''
        }
      });
      
      console.log(`✅ Created new Midtrans payment for transaction: ${order.transactionId}`);
      console.log(`Redirect URL: ${payment.redirect_url}, VA: ${payment.va_number}, Bank: ${payment.bank}`);
      
      console.log("Using payment data:", payment);
      
      // Siapkan data untuk update order
      const orderUpdateData: any = {
        paymentId: order.transactionId,
        paymentLink: payment.redirect_url,
        buyerId: req.user.id,
        orderStatus: "pending_payment",
        paymentStatus: "pending",
        va_number: payment.va_number,
        bank: payment.bank
      };
      
      // Tambahkan data alamat pengiriman jika ada
      if (deliveryAddress) {
        orderUpdateData.deliveryAddress = deliveryAddress;
        orderUpdateData.deliveryCity = deliveryCity;
        orderUpdateData.deliveryPostalCode = deliveryPostalCode;
      }
      
      // Update order dengan payment info dan alamat pengiriman
      const updatedOrder = await storage.updateOrder(orderId, orderUpdateData);
      
      // Create tracking event for payment initiation
      await storage.createTrackingEvent({
        orderId: order.id,
        status: "payment_initiated",
        description: `Payment initiated via Midtrans (${payment.transaction_id || payment.order_id})`,
        location: null
      });
      
      res.json({
        orderId,
        paymentId: payment.transaction_id || payment.order_id,
        paymentLink: payment.redirect_url,
        amount: totalAmount,
        va_number: payment.va_number, // VA number untuk bank transfer
        bank: payment.bank // Nama bank untuk virtual account
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      next(error);
    }
  });

  // Endpoint untuk memeriksa status pembayaran Midtrans
  app.get("/api/payments/:paymentId/status", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { paymentId } = req.params;
      
      if (!paymentId) {
        return res.status(400).json({ message: "Payment ID is required" });
      }
      
      console.log(`Checking payment status for Midtrans order ID: ${paymentId}`);
      
      // Gunakan ID order/transaction Midtrans untuk mendapatkan status pembayaran
      const status = await getPaymentStatus(paymentId);
      
      console.log(`Payment status for Midtrans order ${paymentId}: ${status}`);
      
      // Jika pembayaran berhasil, perbarui status pesanan
      if (status === "PAID" || status === "SETTLED") {
        // Cari pesanan berdasarkan paymentId
        const orders = await storage.getAllOrders();
        const order = orders.find(order => 
          order.paymentId === paymentId || 
          order.transactionId === paymentId  // Cari juga berdasarkan transactionId karena Midtrans sering menggunakan itu
        );
        
        if (order && order.paymentStatus !== "paid") {
          console.log(`Updating order ${order.id} status to paid based on status check`);
          
          await storage.updateOrder(order.id, {
            orderStatus: "paid",
            paymentStatus: "paid"
          });
          
          await storage.createTrackingEvent({
            orderId: order.id,
            status: "paid",
            description: "Payment confirmed via Midtrans status check",
            location: null
          });
        }
      }
      
      res.json({ 
        orderId: paymentId, // Midtrans menggunakan order_id
        paymentId, 
        status,
        statusLower: status.toLowerCase(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking Midtrans payment status:', error);
      next(error);
    }
  });

  // Endpoint untuk mendapatkan Snap Token dari Midtrans
  app.post("/api/payments/snap-token", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { orderId, amount, customerName, customerEmail } = req.body;
      
      if (!orderId || !amount) {
        return res.status(400).json({ message: "orderId and amount are required" });
      }
      
      console.log(`Creating Snap token for order ${orderId} with amount ${amount}`);
      
      // Get order details
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Get product details
      const product = await storage.getProduct(order.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Buat parameter untuk Snap
      const parameter = {
        transaction_details: {
          order_id: order.transactionId,
          gross_amount: Math.floor(amount)
        },
        customer_details: {
          first_name: customerName?.split(' ')[0] || req.user.username,
          last_name: customerName?.split(' ').slice(1).join(' ') || '',
          email: customerEmail || req.user.email
        },
        item_details: [
          {
            id: `PROD-${product.id}`,
            price: Math.floor(product.price),
            quantity: 1,
            name: product.name
          },
          {
            id: 'SHIPPING',
            price: Math.floor(product.shippingPrice),
            quantity: 1,
            name: 'Shipping Cost'
          }
        ]
      };
      
      try {
        // Coba dapatkan Snap token
        const snapResponse = await snap.createTransaction(parameter);
        console.log("Snap transaction created:", snapResponse);
        
        // Update order dengan token Snap
        await storage.updateOrder(orderId, {
          paymentId: snapResponse.token,
          orderStatus: "pending_payment",
          paymentStatus: "pending"
        });
        
        // Kirim token ke client
        res.json({ 
          token: snapResponse.token,
          redirectUrl: snapResponse.redirect_url
        });
      } catch (snapError) {
        console.error("Error creating Snap transaction:", snapError);
        
        // Coba buat payment dengan createPayment sebagai fallback
        try {
          console.log("Attempting to create payment with createPayment as fallback");
          const payment = await createPayment({
            externalID: order.transactionId,
            payerEmail: customerEmail || req.user.email,
            description: `Payment for ${product.name}`,
            amount: amount,
            customerDetails: {
              firstName: customerName || req.user.username,
              email: customerEmail || req.user.email
            },
            itemDetails: [
              {
                id: `PROD-${product.id}`,
                price: product.price,
                quantity: 1,
                name: product.name
              },
              {
                id: 'SHIPPING',
                price: product.shippingPrice,
                quantity: 1,
                name: 'Shipping Cost'
              }
            ]
          });
          
          // Update order dengan data payment
          await storage.updateOrder(orderId, {
            paymentLink: payment.redirect_url,
            paymentId: payment.transaction_id,
            orderStatus: "pending_payment",
            paymentStatus: "pending"
          });
          
          // Kirim token ke client
          res.json({
            token: payment.token,
            redirectUrl: payment.redirect_url,
            va_number: payment.va_number || "",
            bank: payment.bank || "",
            message: "Created payment with alternative method"
          });
        } catch (paymentError) {
          console.error("Both Snap and createPayment methods failed:", paymentError);
          
          // Jika kedua metode gagal, kembalikan error
          console.error("Failed to create payment with both primary and fallback methods");
          
          // Update order dengan status error
          await storage.updateOrder(orderId, {
            orderStatus: "payment_failed",
            paymentStatus: "failed"
          });
          
          // Kirim error ke client
          res.status(500).json({
            error: "Gagal membuat transaksi pembayaran. Silakan coba lagi nanti."
          });
        }
      }
    } catch (error) {
      console.error("Error in snap-token endpoint:", error);
      next(error);
    }
  });

  app.post("/api/payments/webhook", async (req, res, next) => {
    try {
      console.log('Received webhook call from Midtrans');
      console.log('Webhook body:', JSON.stringify(req.body, null, 2));
      
      // Parse and validate the webhook
      const webhook = parseWebhook(req.body);
      
      if (!webhook) {
        console.error('Invalid webhook payload from Midtrans');
        return res.status(400).send("Invalid webhook payload");
      }
      
      const { order_id, status, transaction_id } = webhook;
      console.log(`Processing Midtrans webhook: order ID ${order_id}, status ${status}`);
      
      // Find order by transaction ID (yang disimpan di order_id Midtrans)
      const order = await storage.getOrderByTransactionId(order_id);
      
      if (!order) {
        console.error(`Order not found for transaction ID: ${order_id}`);
        return res.status(404).send("Order not found");
      }
      
      // Update order based on payment status
      if (status === "PAID" || status === "SETTLED") {
        console.log(`Payment confirmed for order ${order.id}, updating status`);
        
        // Update order status and payment status
        await storage.updateOrder(order.id, {
          orderStatus: "paid",
          paymentStatus: "paid",
          paymentId: transaction_id || order_id
        });
        
        // Create tracking event for payment
        await storage.createTrackingEvent({
          orderId: order.id,
          status: "paid",
          description: "Payment confirmed via Midtrans",
          location: null
        });
        
        console.log(`Order ${order.id} updated successfully`);
      } else if (status === "EXPIRED" || status === "FAILED") {
        console.log(`Payment ${status} for order ${order.id}, updating status`);
        
        // Update order status for expired or failed payment
        await storage.updateOrder(order.id, {
          paymentStatus: status.toLowerCase(),
        });
        
        // Create tracking event
        await storage.createTrackingEvent({
          orderId: order.id,
          status: "payment_" + status.toLowerCase(),
          description: `Payment ${status.toLowerCase()} - ${transaction_id || order_id}`,
          location: null
        });
      }
      
      // Always respond with success to Midtrans
      res.status(200).send("Webhook processed successfully");
    } catch (error) {
      console.error('Error processing payment webhook:', error);
      // Still return 200 to prevent retries
      res.status(200).send("Webhook received with errors");
    }
  });

  // Warehouse routes
  app.get("/api/warehouses", async (req, res, next) => {
    try {
      const warehouses = await storage.getAllWarehouses();
      res.json(warehouses);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/warehouses", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user.userType !== "admin") {
        return res.status(403).json({ message: "Forbidden: Only admins can create warehouses" });
      }
      
      const warehouse = await storage.createWarehouse(req.body);
      res.status(201).json(warehouse);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
