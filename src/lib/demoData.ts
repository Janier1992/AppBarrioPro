import { db } from "./insforge";
import { Product, Sale, Task, BusinessProfile } from "../types";

export const DEMO_PRODUCTS: Product[] = [
  {
    name: "Pan de Molde Blanco",
    sku: "PAN-001",
    category: "Abarrotes",
    stock: 15,
    minStock: 8,
    price: 2.50,
    cost: 1.50,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Leche Entera 1L",
    sku: "LAC-002",
    category: "Abarrotes",
    stock: 2,
    minStock: 10,
    price: 1.80,
    cost: 1.10,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Huevos Docena",
    sku: "HUE-003",
    category: "Abarrotes",
    stock: 3,
    minStock: 12,
    price: 3.20,
    cost: 2.20,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Cinta Métrica 5m Profesional",
    sku: "FER-101",
    category: "Ferretería",
    stock: 8,
    minStock: 3,
    price: 6.50,
    cost: 4.00,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Paracetamol 500mg (10 Tabletas)",
    sku: "DRO-201",
    category: "Droguería",
    stock: 22,
    minStock: 10,
    price: 1.50,
    cost: 0.80,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Pechuga de Pollo 1kg",
    sku: "CAR-301",
    category: "Carnicería",
    stock: 6,
    minStock: 4,
    price: 4.80,
    cost: 3.20,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Cargador Carga Rápida USB-C",
    sku: "DIG-401",
    category: "Tienda Digital (Accesorios)",
    stock: 12,
    minStock: 5,
    price: 12.00,
    cost: 6.50,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Cuaderno Cuadriculado 100 Hojas",
    sku: "PAP-501",
    category: "Papelería",
    stock: 35,
    minStock: 15,
    price: 2.20,
    cost: 1.20,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Papas Sabaneras 1kg",
    sku: "LEG-011",
    category: "Legumbrería",
    stock: 18,
    minStock: 15,
    price: 1.40,
    cost: 0.80,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Plátanos de Seda 1kg",
    sku: "LEG-015",
    category: "Legumbrería",
    stock: 20,
    minStock: 8,
    price: 1.60,
    cost: 0.90,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Aceite de Girasol 1L",
    sku: "ABA-006",
    category: "Abarrotes",
    stock: 12,
    minStock: 8,
    price: 3.80,
    cost: 2.70,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Arroz Extra 1kg",
    sku: "ABA-007",
    category: "Abarrotes",
    stock: 30,
    minStock: 15,
    price: 1.50,
    cost: 0.90,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Martillo de Uña Carpintero",
    sku: "FER-102",
    category: "Ferretería",
    stock: 5,
    minStock: 2,
    price: 8.50,
    cost: 5.00,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Alcohol Antiséptico 500ml",
    sku: "DRO-202",
    category: "Droguería",
    stock: 15,
    minStock: 5,
    price: 2.50,
    cost: 1.20,
    updatedAt: new Date().toISOString()
  },
  {
    name: "Carne Molida de Res 1kg",
    sku: "CAR-302",
    category: "Carnicería",
    stock: 10,
    minStock: 5,
    price: 7.50,
    cost: 5.20,
    updatedAt: new Date().toISOString()
  }
];

export const DEMO_SALES = (prodIds: string[]): Sale[] => {
  const now = new Date();
  
  // Sales from today
  const today = now.toISOString();
  // Sales from yesterday
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  // Sales from 2 days ago
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  // Sales from 3 days ago
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  // Sales from 4 days ago
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      items: [
        { productId: prodIds[0] || "1", name: "Pan de Molde Blanco", quantity: 2, price: 2.50 },
        { productId: prodIds[1] || "2", name: "Leche Entera 1L", quantity: 3, price: 1.80 }
      ],
      total: 10.40,
      timestamp: today
    },
    {
      items: [
        { productId: prodIds[13] || "14", name: "Refresco de Cola 1.5L", quantity: 2, price: 2.10 },
        { productId: prodIds[9] || "10", name: "Atún en lata 140g", quantity: 3, price: 1.90 }
      ],
      total: 9.90,
      timestamp: today
    },
    {
      items: [
        { productId: prodIds[2] || "3", name: "Huevos Docena", quantity: 1, price: 3.20 },
        { productId: prodIds[3] || "4", name: "Café de Altura Molido 250g", quantity: 1, price: 5.90 }
      ],
      total: 9.10,
      timestamp: today
    },
    {
      items: [
        { productId: prodIds[4] || "5", name: "Queso Fresco 500g", quantity: 1, price: 4.50 },
        { productId: prodIds[0] || "1", name: "Pan de Molde Blanco", quantity: 1, price: 2.50 }
      ],
      total: 7.00,
      timestamp: yesterday
    },
    {
      items: [
        { productId: prodIds[11] || "12", name: "Detergente Líquido 1L", quantity: 1, price: 4.20 },
        { productId: prodIds[12] || "13", name: "Jabón de Tocador Cremoso", quantity: 2, price: 0.90 }
      ],
      total: 6.00,
      timestamp: yesterday
    },
    {
      items: [
        { productId: prodIds[1] || "2", name: "Leche Entera 1L", quantity: 5, price: 1.80 }
      ],
      total: 9.00,
      timestamp: yesterday
    },
    {
      items: [
        { productId: prodIds[3] || "4", name: "Café de Altura Molido 250g", quantity: 2, price: 5.90 },
        { productId: prodIds[0] || "1", name: "Pan de Molde Blanco", quantity: 3, price: 2.50 }
      ],
      total: 19.30,
      timestamp: twoDaysAgo
    },
    {
      items: [
        { productId: prodIds[6] || "7", name: "Arroz Extra 1kg", quantity: 4, price: 1.50 },
        { productId: prodIds[5] || "6", name: "Aceite de Girasol 1L", quantity: 1, price: 3.80 }
      ],
      total: 9.80,
      timestamp: twoDaysAgo
    },
    {
      items: [
        { productId: prodIds[7] || "8", name: "Azúcar Refinada 1kg", quantity: 2, price: 1.20 },
        { productId: prodIds[14] || "15", name: "Plátanos de Seda 1kg", quantity: 1.5, price: 1.60 }
      ],
      total: 4.80,
      timestamp: threeDaysAgo
    },
    {
      items: [
        { productId: prodIds[3] || "4", name: "Café de Altura Molido 250g", quantity: 1, price: 5.90 },
        { productId: prodIds[4] || "5", name: "Queso Fresco 500g", quantity: 2, price: 4.50 }
      ],
      total: 14.90,
      timestamp: fourDaysAgo
    }
  ];
};

export const DEMO_TASKS: Task[] = [
  { text: "Revisar fecha de vencimiento de lácteos", completed: false, createdAt: new Date().toISOString() },
  { text: "Limpiar y ordenar estantería principal", completed: true, completedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
  { text: "Hacer pedido de huevos al proveedor local", completed: false, createdAt: new Date().toISOString() },
  { text: "Revisar caja y cuadrar ventas de la mañana", completed: false, createdAt: new Date().toISOString() }
];

export const DEFAULT_PROFILE: BusinessProfile = {
  businessName: "Abasto San José",
  address: "Calle de las Flores 123, Barrio El Prado",
  hours: "08:00 - 20:00",
  lowStockThreshold: 5,
  securityPin: "1234",
  updatedAt: new Date().toISOString()
};

export async function loadDemoDataToFirestore(userId: string) {
  try {
    // 1. Save Profile
    await db.saveProfile(userId, DEFAULT_PROFILE);

    // 2. Save Products & track their IDs
    const tempIds: string[] = [];
    const productsToSave = DEMO_PRODUCTS.map(product => {
      const id = `prod_${Math.random().toString(36).substring(2, 9)}`;
      tempIds.push(id);
      return { ...product, id };
    });
    await db.saveProductsList(userId, productsToSave);

    // 3. Save Sales
    const salesToSave = DEMO_SALES(tempIds).map(sale => {
      const id = `sale_${Math.random().toString(36).substring(2, 9)}`;
      return { ...sale, id };
    });
    await db.saveSalesList(userId, salesToSave);

    // 4. Save Tasks
    const tasksToSave = DEMO_TASKS.map(task => {
      const id = `task_${Math.random().toString(36).substring(2, 9)}`;
      return { ...task, id };
    });
    await db.saveTasksList(userId, tasksToSave);

    // Initial Empty Debts
    await db.saveDebtsList(userId, []);

    console.log("Demo data loaded successfully to InsForge Database!");
  } catch (error) {
    console.error("Error loading demo data:", error);
  }
}
