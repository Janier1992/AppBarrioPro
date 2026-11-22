/**
 * @file Checklist.tsx
 * @description Operational Checklist component for daily neighborhood business routines.
 * @design Part of the User Interface and Business Logic layers. Leverages real-time data binding 
 * with Firestore collections for robust persistence. Uses defensive try-catch statements to prevent crashes.
 */

import React, { useState } from "react";
import { Task } from "../types";
import { Plus, Trash2, Edit2, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { db } from "../lib/insforge";
import { useDialogs } from "../hooks/use-dialogs";
import Dialogs from "./Dialogs";
import { showErrorToast } from "../lib/toast";
import { BUSINESS_TYPES, loadBusinessType } from "../lib/businessTypes";

interface ChecklistProps {
  tasks: Task[];
  userId: string;
  searchQueryParam?: string;
  onClearSearchParam?: () => void;
}

export default function Checklist({ 
  tasks, 
  userId,
  searchQueryParam = "",
  onClearSearchParam
}: ChecklistProps) {
  const [taskText, setTaskText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const { confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, confirm } = useDialogs();

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  React.useEffect(() => {
    if (searchQueryParam) {
      setLocalSearchQuery(searchQueryParam);
      if (onClearSearchParam) {
        onClearSearchParam();
      }
    }
  }, [searchQueryParam]);

  const filteredActiveTasks = activeTasks.filter(t => 
    t.text.toLowerCase().includes(localSearchQuery.toLowerCase())
  );
  
  const filteredCompletedTasks = completedTasks.filter(t => 
    t.text.toLowerCase().includes(localSearchQuery.toLowerCase())
  );

  /**
   * @function handleRegistrarNuevaTarea
   * @description Valida, procesa y anexa un nuevo elemento de acción al listado diario.
   * Paso 1: Sanitizar espacios en blanco y verificar texto.
   * Paso 2: Ensamblar la entidad de tipo Task con marca de tiempo.
   * Paso 3: Disparar la inserción en la colección de tareas en Firestore.
   */
  const handleRegistrarNuevaTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) return;

    setLoading(true);
    try {
      const newTask: Omit<Task, "id"> = {
        text: taskText.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };

      await db.addTask(userId, newTask);
      setTaskText("");
    } catch (error) {
      console.error("Error adding task:", error);
      showErrorToast("No se pudo agregar la tarea. Verifica tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * @function handleAlternarEstadoTarea
   * @description Invierte el estado de completado (marcar o desmarcar) de una tarea.
   * Paso 1: Validar identificador único.
   * Paso 2: Actualizar el campo completed y registrar o limpiar la fecha de finalización.
   */
  const handleAlternarEstadoTarea = async (task: Task) => {
    if (!task.id) return;
    try {
      await db.updateTask(userId, task.id, {
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : undefined
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      showErrorToast("No se pudo actualizar la tarea. Verifica tu conexión e inténtalo de nuevo.");
    }
  };

  /**
   * @function handleEliminarTarea
   * @description Pide confirmación y elimina físicamente una tarea del checklist.
   */
  const handleEliminarTarea = (id: string) => {
    confirm(
      "Eliminar Tarea",
      "¿Seguro que deseas eliminar esta tarea del checklist? Esta acción no se puede deshacer.",
      async () => {
        try {
          await db.deleteTask(userId, id);
        } catch (error) {
          console.error("Error deleting task:", error);
          showErrorToast("No se pudo eliminar la tarea. Verifica tu conexión e inténtalo de nuevo.");
        }
      }
    );
  };

  /**
   * @function handleIniciarEdicionTarea
   * @description Activa la interfaz de edición en línea cargando el texto del elemento.
   */
  const handleIniciarEdicionTarea = (task: Task) => {
    setEditingTaskId(task.id || null);
    setEditingText(task.text);
  };

  /**
   * @function handleGuardarEdicionTarea
   * @description Guarda la edición de texto de una tarea de vuelta a la colección.
   * Paso 1: Validar que el texto final no sea nulo ni vacío.
   * Paso 2: Actualizar la cadena y salir del modo de edición.
   */
  const handleGuardarEdicionTarea = async (id: string) => {
    // Evita el doble guardado: al pulsar Enter, este mismo handler ya se
    // ejecutó y puso editingTaskId en null; el onBlur que se dispara al
    // desmontar el input volvería a llamar esta función innecesariamente.
    if (editingTaskId !== id) return;
    if (!editingText.trim()) return;
    try {
      await db.updateTask(userId, id, {
        text: editingText.trim()
      });
      setEditingTaskId(null);
    } catch (error) {
      console.error("Error saving task edit:", error);
      showErrorToast("No se pudo guardar la edición de la tarea. Verifica tu conexión e inténtalo de nuevo.");
    }
  };

  const suggestedType = loadBusinessType(userId) ?? BUSINESS_TYPES[0];
  const [addingSuggested, setAddingSuggested] = useState(false);

  const handleAgregarSugeridas = async () => {
    setAddingSuggested(true);
    try {
      for (const text of suggestedType.tasks) {
        await db.addTask(userId, { text, completed: false, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Error al agregar tareas sugeridas:", error);
      showErrorToast("No se pudieron agregar las tareas sugeridas. Inténtalo de nuevo.");
    } finally {
      setAddingSuggested(false);
    }
  };

  return (
    <div className="space-y-6" id="checklist-container">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-[28px] sm:text-3xl font-semibold tracking-tight text-brand-text">Tareas</h2>
          <p className="text-sm text-brand-muted">Tus rutinas de apertura, operación y cierre.</p>
        </div>
      </div>

      {localSearchQuery && (
        <div className="bg-brand-primary/5 border border-brand-primary/20 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-brand-primary">
          <span>Filtrado por búsqueda global: <strong>"{localSearchQuery}"</strong></span>
          <button 
            onClick={() => setLocalSearchQuery("")}
            className="font-bold underline hover:text-brand-primary-dark cursor-pointer text-[11px]"
          >
            Mostrar todo
          </button>
        </div>
      )}

      {/* Add Task Form */}
      <form onSubmit={handleRegistrarNuevaTarea} className="flex gap-2">
        <input
          type="text"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="Ej: Revisar temperatura de neveras, Comprobar pan caliente..."
          className="flex-1 rounded-xl border border-brand-border px-4 py-3 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden bg-white text-brand-text placeholder-brand-muted"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !taskText.trim()}
          className="rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
          Añadir Tarea
        </button>
      </form>

      {tasks.length === 0 && (
        <div className="rounded-2xl border border-brand-border bg-white p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[15px] font-medium">¿Empiezas con tareas sugeridas?</p>
            <p className="text-[13px] text-brand-muted">Para {suggestedType.label.toLowerCase()}: {suggestedType.tasks.join(" · ")}</p>
          </div>
          <button
            type="button"
            onClick={handleAgregarSugeridas}
            disabled={addingSuggested}
            className="shrink-0 h-11 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-medium cursor-pointer disabled:opacity-50"
          >
            {addingSuggested ? "Agregando..." : "Agregar las sugeridas"}
          </button>
        </div>
      )}

      {/* Task Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="checklist-grid">
        {/* Active Tasks Panel */}
        <div className="rounded-2xl border border-brand-border bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h3 className="font-bold text-brand-text text-sm">Tareas Pendientes</h3>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-100">
              {filteredActiveTasks.length} activas
            </span>
          </div>

          {filteredActiveTasks.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <CheckCircle2 className="mb-2 text-brand-primary" size={32} />
              <p className="text-sm font-medium text-brand-text">¡Todo completado!</p>
              <p className="text-xs text-brand-muted mt-1">No tienes tareas pendientes para hoy.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredActiveTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl bg-brand-bg p-3.5 hover:bg-brand-border/20 transition-colors group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleAlternarEstadoTarea(task)}
                      aria-label={`Marcar como completada: ${task.text}`}
                      className="text-brand-muted hover:text-brand-primary transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <Circle size={18} />
                    </button>

                    {editingTaskId === task.id ? (
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => handleGuardarEdicionTarea(task.id!)}
                        onKeyDown={(e) => e.key === "Enter" && handleGuardarEdicionTarea(task.id!)}
                        className="flex-1 rounded-md border border-brand-border px-2 py-1 text-sm bg-white focus:outline-hidden focus:border-brand-primary text-brand-text"
                        autoFocus
                      />
                    ) : (
                      <span className="text-xs font-medium text-brand-text truncate">{task.text}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleIniciarEdicionTarea(task)}
                      aria-label={`Editar tarea: ${task.text}`}
                      className="text-brand-muted hover:text-blue-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleEliminarTarea(task.id!)}
                      aria-label={`Eliminar tarea: ${task.text}`}
                      className="text-brand-muted hover:text-rose-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Tasks Panel */}
        <div className="rounded-2xl border border-brand-border bg-white p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h3 className="font-bold text-brand-text text-sm">Tareas Finalizadas</h3>
            <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-primary border border-brand-primary/20">
              {filteredCompletedTasks.length} completadas
            </span>
          </div>

          {filteredCompletedTasks.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Circle className="mb-2 text-brand-border" size={32} />
              <p className="text-xs text-brand-muted">Las tareas que termines aparecerán aquí.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredCompletedTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl bg-brand-primary/5 p-3.5 hover:bg-brand-primary/10 transition-colors group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleAlternarEstadoTarea(task)}
                      aria-label={`Marcar como pendiente: ${task.text}`}
                      className="text-brand-primary hover:text-brand-muted transition-colors flex-shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <span className="text-xs font-medium text-brand-muted line-through truncate">{task.text}</span>
                  </div>

                  <button
                    onClick={() => handleEliminarTarea(task.id!)}
                    aria-label={`Eliminar tarea: ${task.text}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity text-brand-muted hover:text-rose-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialogs
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        alertDialog={alertDialog}
        setAlertDialog={setAlertDialog}
        confirmLabel="Eliminar Tarea"
      />
    </div>
  );
}
