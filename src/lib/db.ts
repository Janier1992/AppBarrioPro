import { Product, Sale, Task, Debt, BusinessProfile } from "../types";
import { insforge, isInsForgeConfigured, notifySubscribers } from "./insforge";

export const db = {
  // 1. PROFILE
  getProfile: async (userId: string): Promise<BusinessProfile | null> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge!.database
          .from("profile")
          .select("*")
          .eq("userId", userId)
          .single();
        if (!error && data) return data as BusinessProfile;
      } catch (e) {
        console.warn("Profile fetch failed, using local profile:", e);
      }
    }
    const local = localStorage.getItem(`barriopro_profile_${userId}`);
    return local ? JSON.parse(local) : null;
  },

  saveProfile: async (userId: string, profile: BusinessProfile): Promise<void> => {
    // geminiApiKey se elimina siempre: la clave ya no se guarda por tienda (solo en el servidor).
    // Al guardar, también se borra el valor que haya quedado en perfiles anteriores.
    const { geminiApiKey: _legacyKey, ...cleanProfile } = profile as BusinessProfile & { geminiApiKey?: unknown };
    const profileWithId = {
      ...cleanProfile,
      id: profile.id || `prof_${userId}`,
      userId
    };

    localStorage.setItem(`barriopro_profile_${userId}`, JSON.stringify(profileWithId));
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("profile")
          .upsert({ ...profileWithId, geminiApiKey: null });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to save profile to InsForge:", e);
      }
    }

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  // 2. PRODUCTS
  getProducts: async (userId: string): Promise<Product[]> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge!.database
          .from("products")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Product[];
      } catch (e) {
        console.warn("Products fetch failed, using local products:", e);
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
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("products")
          .insert({ ...newProduct, userId });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to add product to InsForge:", e);
      }
    }

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
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("products")
          .update(updates)
          .eq("id", productId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to update product in InsForge:", e);
      }
    }

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  deleteProduct: async (userId: string, productId: string): Promise<void> => {
    const local = localStorage.getItem(`barriopro_products_${userId}`);
    let list: Product[] = local ? JSON.parse(local) : [];
    list = list.filter(p => p.id !== productId);
    localStorage.setItem(`barriopro_products_${userId}`, JSON.stringify(list));
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("products")
          .delete()
          .eq("id", productId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to delete product from InsForge:", e);
      }
    }

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  // 3. SALES
  getSales: async (userId: string): Promise<Sale[]> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge!.database
          .from("sales")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Sale[];
      } catch (e) {
        console.warn("Sales fetch failed, using local sales:", e);
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
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("sales")
          .insert({ ...newSale, userId });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to add sale to InsForge:", e);
      }
    }

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
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("sales")
          .delete()
          .eq("id", id)
          .eq("userId", userId);
        if (error) throw error;
      } catch (error) {
        console.error("Error al eliminar la venta de InsForge:", error);
      }
    }

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  updateSale: async (userId: string, id: string, sale: Partial<Sale>): Promise<void> => {
    const local = localStorage.getItem(`barriopro_sales_${userId}`);
    const list: Sale[] = local ? JSON.parse(local) : [];
    const updated = list.map(s => s.id === id ? { ...s, ...sale } : s);
    localStorage.setItem(`barriopro_sales_${userId}`, JSON.stringify(updated));
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("sales")
          .update(sale)
          .eq("id", id)
          .eq("userId", userId);
        if (error) throw error;
      } catch (error) {
        console.error("Error al actualizar la venta en InsForge:", error);
      }
    }

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  // 4. TASKS (CHECKLIST)
  getTasks: async (userId: string): Promise<Task[]> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge!.database
          .from("tasks")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Task[];
      } catch (e) {
        console.warn("Tasks fetch failed, using local tasks:", e);
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
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("tasks")
          .insert({ ...newTask, userId });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to add task to InsForge:", e);
      }
    }

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
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("tasks")
          .update(updates)
          .eq("id", taskId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to update task in InsForge:", e);
      }
    }

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  deleteTask: async (userId: string, taskId: string): Promise<void> => {
    const local = localStorage.getItem(`barriopro_tasks_${userId}`);
    let list: Task[] = local ? JSON.parse(local) : [];
    list = list.filter(t => t.id !== taskId);
    localStorage.setItem(`barriopro_tasks_${userId}`, JSON.stringify(list));
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("tasks")
          .delete()
          .eq("id", taskId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to delete task from InsForge:", e);
      }
    }

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  // 5. DEBTS
  getDebts: async (userId: string): Promise<Debt[]> => {
    if (isInsForgeConfigured()) {
      try {
        const { data, error } = await insforge!.database
          .from("debts")
          .select("*")
          .eq("userId", userId);
        if (!error && data) return data as Debt[];
      } catch (e) {
        console.warn("Debts fetch failed, using local debts:", e);
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
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("debts")
          .insert({ ...newDebt, userId });
        if (error) throw error;
      } catch (e) {
        console.error("Failed to add debt to InsForge:", e);
      }
    }

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
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("debts")
          .update(updates)
          .eq("id", debtId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to update debt in InsForge:", e);
      }
    }

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  },

  deleteDebt: async (userId: string, debtId: string): Promise<void> => {
    const local = localStorage.getItem(`barriopro_debts_${userId}`);
    let list: Debt[] = local ? JSON.parse(local) : [];
    list = list.filter(d => d.id !== debtId);
    localStorage.setItem(`barriopro_debts_${userId}`, JSON.stringify(list));
    if (isInsForgeConfigured()) {
      try {
        const { error } = await insforge!.database
          .from("debts")
          .delete()
          .eq("id", debtId)
          .eq("userId", userId);
        if (error) throw error;
      } catch (e) {
        console.error("Failed to delete debt from InsForge:", e);
      }
    }

    // Se avisa DESPUÉS de escribir en el servidor: si se avisara antes, la recarga leería
    // el dato viejo del servidor y pisaría el cambio (p. ej. el tema volvía al anterior).
    notifySubscribers();
  }
};
