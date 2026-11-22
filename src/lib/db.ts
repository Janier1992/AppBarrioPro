import { Product, Sale, Task, Debt, BusinessProfile } from "../types";
import { insforge, isInsForgeConfigured, notifySubscribers } from "./insforge";
import { flushOutbox, pendingCount, writeRemote } from "./outbox";

export const db = {
  // 1. PROFILE
  getProfile: async (userId: string): Promise<BusinessProfile | null> => {
    // Antes de leer del servidor se envía lo pendiente; si algo sigue sin enviarse, se usa lo
    // local (que sí lo tiene) para que la lectura remota no "borre" ventas aún no confirmadas.
    await flushOutbox(userId);
    if (isInsForgeConfigured() && pendingCount(userId) === 0) {
      try {
        const { data, error } = await insforge!.database
          .from("profile")
          .select("*")
          .eq("userId", userId)
          .single();
        if (!error && data) return data as BusinessProfile;
      } catch (e) {
        console.warn("No se pudo leer el perfil del servidor; se usa la copia local:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_profile_${userId}`);
    return local ? JSON.parse(local) : null;
  },

  saveProfile: async (userId: string, profile: BusinessProfile): Promise<void> => {
    // geminiApiKey se elimina siempre: la clave ya no se guarda por tienda (solo en el servidor).
    // No se envía ni como null: en bases nuevas la columna no existe y el servidor rechazaría el guardado.
    // Las claves antiguas, si las hubiera, se borran con insforge-migration-quitar-clave-gemini.sql.
    const { geminiApiKey: _legacyKey, ...cleanProfile } = profile as BusinessProfile & { geminiApiKey?: unknown };
    const profileWithId = {
      ...cleanProfile,
      id: profile.id || `prof_${userId}`,
      userId
    };

    localStorage.setItem(`barriopro_profile_${userId}`, JSON.stringify(profileWithId));
    await writeRemote(userId, { table: "profile", kind: "upsert", data: { ...profileWithId } });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  // 2. PRODUCTS
  getProducts: async (userId: string): Promise<Product[]> => {
    // Antes de leer del servidor se envía lo pendiente; si algo sigue sin enviarse, se usa lo
    // local (que sí lo tiene) para que la lectura remota no "borre" ventas aún no confirmadas.
    await flushOutbox(userId);
    if (isInsForgeConfigured() && pendingCount(userId) === 0) {
      try {
        const { data, error } = await insforge!.database
          .from("products")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Product[];
      } catch (e) {
        console.warn("No se pudieron leer los productos del servidor; se usa la copia local:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_products_${userId}`);
    return local ? JSON.parse(local) : [];
  },

  addProduct: async (userId: string, product: Omit<Product, "id">): Promise<string> => {
    const id = `prod_${Math.random().toString(36).substring(2, 9)}`;
    const newProduct: Product = { ...product, id };

    const local = localStorage.getItem(`barriopro_products_${userId}`);
    const list: Product[] = local ? JSON.parse(local) : [];
    list.push(newProduct);
    localStorage.setItem(`barriopro_products_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "products", kind: "upsert", data: { ...newProduct } });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
    return id;
  },

  updateProduct: async (userId: string, productId: string, updates: Partial<Product>): Promise<void> => {
    const local = localStorage.getItem(`barriopro_products_${userId}`);
    let list: Product[] = local ? JSON.parse(local) : [];
    list = list.map(p => p.id === productId ? { ...p, ...updates } : p);
    localStorage.setItem(`barriopro_products_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "products", kind: "update", rowId: productId, data: updates });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  /**
   * Suma o resta stock (delta negativo = venta). A diferencia de updateProduct({ stock }), no envía
   * un valor absoluto calculado con datos posiblemente viejos: el servidor aplica el cambio de forma
   * atómica, así dos dispositivos vendiendo a la vez no se pisan.
   */
  adjustStock: async (userId: string, productId: string, delta: number): Promise<void> => {
    const local = localStorage.getItem(`barriopro_products_${userId}`);
    const list: Product[] = local ? JSON.parse(local) : [];
    const updatedAt = new Date().toISOString();
    localStorage.setItem(
      `barriopro_products_${userId}`,
      JSON.stringify(list.map(p => p.id === productId ? { ...p, stock: Math.max(0, p.stock + delta), updatedAt } : p))
    );
    await writeRemote(userId, { table: "products", kind: "adjust", rowId: productId, delta });
    notifySubscribers();
  },

  deleteProduct: async (userId: string, productId: string): Promise<void> => {
    const local = localStorage.getItem(`barriopro_products_${userId}`);
    let list: Product[] = local ? JSON.parse(local) : [];
    list = list.filter(p => p.id !== productId);
    localStorage.setItem(`barriopro_products_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "products", kind: "delete", rowId: productId });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  // 3. SALES
  getSales: async (userId: string): Promise<Sale[]> => {
    // Antes de leer del servidor se envía lo pendiente; si algo sigue sin enviarse, se usa lo
    // local (que sí lo tiene) para que la lectura remota no "borre" ventas aún no confirmadas.
    await flushOutbox(userId);
    if (isInsForgeConfigured() && pendingCount(userId) === 0) {
      try {
        const { data, error } = await insforge!.database
          .from("sales")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Sale[];
      } catch (e) {
        console.warn("No se pudieron leer las ventas del servidor; se usa la copia local:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_sales_${userId}`);
    return local ? JSON.parse(local) : [];
  },

  addSale: async (userId: string, sale: Omit<Sale, "id">): Promise<string> => {
    const id = `sale_${Math.random().toString(36).substring(2, 9)}`;
    const newSale: Sale = { ...sale, id };

    const local = localStorage.getItem(`barriopro_sales_${userId}`);
    const list: Sale[] = local ? JSON.parse(local) : [];
    list.push(newSale);
    localStorage.setItem(`barriopro_sales_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "sales", kind: "upsert", data: { ...newSale } });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
    return id;
  },

  deleteSale: async (userId: string, id: string): Promise<void> => {
    const local = localStorage.getItem(`barriopro_sales_${userId}`);
    const list: Sale[] = local ? JSON.parse(local) : [];
    const filtered = list.filter(s => s.id !== id);
    localStorage.setItem(`barriopro_sales_${userId}`, JSON.stringify(filtered));
    await writeRemote(userId, { table: "sales", kind: "delete", rowId: id });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  updateSale: async (userId: string, id: string, sale: Partial<Sale>): Promise<void> => {
    const local = localStorage.getItem(`barriopro_sales_${userId}`);
    const list: Sale[] = local ? JSON.parse(local) : [];
    const updated = list.map(s => s.id === id ? { ...s, ...sale } : s);
    localStorage.setItem(`barriopro_sales_${userId}`, JSON.stringify(updated));
    await writeRemote(userId, { table: "sales", kind: "update", rowId: id, data: sale });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  // 4. TASKS (CHECKLIST)
  getTasks: async (userId: string): Promise<Task[]> => {
    // Antes de leer del servidor se envía lo pendiente; si algo sigue sin enviarse, se usa lo
    // local (que sí lo tiene) para que la lectura remota no "borre" ventas aún no confirmadas.
    await flushOutbox(userId);
    if (isInsForgeConfigured() && pendingCount(userId) === 0) {
      try {
        const { data, error } = await insforge!.database
          .from("tasks")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Task[];
      } catch (e) {
        console.warn("No se pudieron leer las tareas del servidor; se usa la copia local:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_tasks_${userId}`);
    return local ? JSON.parse(local) : [];
  },

  addTask: async (userId: string, task: Omit<Task, "id">): Promise<string> => {
    const id = `task_${Math.random().toString(36).substring(2, 9)}`;
    const newTask: Task = { ...task, id };

    const local = localStorage.getItem(`barriopro_tasks_${userId}`);
    const list: Task[] = local ? JSON.parse(local) : [];
    list.push(newTask);
    localStorage.setItem(`barriopro_tasks_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "tasks", kind: "upsert", data: { ...newTask } });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
    return id;
  },

  updateTask: async (userId: string, taskId: string, updates: Partial<Task>): Promise<void> => {
    const local = localStorage.getItem(`barriopro_tasks_${userId}`);
    let list: Task[] = local ? JSON.parse(local) : [];
    list = list.map(t => t.id === taskId ? { ...t, ...updates } : t);
    localStorage.setItem(`barriopro_tasks_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "tasks", kind: "update", rowId: taskId, data: updates });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  deleteTask: async (userId: string, taskId: string): Promise<void> => {
    const local = localStorage.getItem(`barriopro_tasks_${userId}`);
    let list: Task[] = local ? JSON.parse(local) : [];
    list = list.filter(t => t.id !== taskId);
    localStorage.setItem(`barriopro_tasks_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "tasks", kind: "delete", rowId: taskId });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  // 5. DEBTS
  getDebts: async (userId: string): Promise<Debt[]> => {
    // Antes de leer del servidor se envía lo pendiente; si algo sigue sin enviarse, se usa lo
    // local (que sí lo tiene) para que la lectura remota no "borre" ventas aún no confirmadas.
    await flushOutbox(userId);
    if (isInsForgeConfigured() && pendingCount(userId) === 0) {
      try {
        const { data, error } = await insforge!.database
          .from("debts")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Debt[];
      } catch (e) {
        console.warn("No se pudieron leer los fiados del servidor; se usa la copia local:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_debts_${userId}`);
    return local ? JSON.parse(local) : [];
  },

  addDebt: async (userId: string, debt: Omit<Debt, "id">): Promise<string> => {
    const id = `debt_${Math.random().toString(36).substring(2, 9)}`;
    const newDebt: Debt = { ...debt, id };

    const local = localStorage.getItem(`barriopro_debts_${userId}`);
    const list: Debt[] = local ? JSON.parse(local) : [];
    list.push(newDebt);
    localStorage.setItem(`barriopro_debts_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "debts", kind: "upsert", data: { ...newDebt } });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
    return id;
  },

  updateDebt: async (userId: string, debtId: string, updates: Partial<Debt>): Promise<void> => {
    const local = localStorage.getItem(`barriopro_debts_${userId}`);
    let list: Debt[] = local ? JSON.parse(local) : [];
    list = list.map(d => d.id === debtId ? { ...d, ...updates } : d);
    localStorage.setItem(`barriopro_debts_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "debts", kind: "update", rowId: debtId, data: updates });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  deleteDebt: async (userId: string, debtId: string): Promise<void> => {
    const local = localStorage.getItem(`barriopro_debts_${userId}`);
    let list: Debt[] = local ? JSON.parse(local) : [];
    list = list.filter(d => d.id !== debtId);
    localStorage.setItem(`barriopro_debts_${userId}`, JSON.stringify(list));
    await writeRemote(userId, { table: "debts", kind: "delete", rowId: debtId });

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  }
};
