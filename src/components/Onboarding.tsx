import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  ChevronRight, 
  CheckCircle, 
  TrendingUp, 
  Smartphone, 
  HelpCircle,
  Users
} from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Empieza por tu inventario",
      description: "Ve a la sección \"Inventario\" y agrega tus productos: nombre, precio, costo y cuántas unidades tienes. Con eso ya puedes registrar ventas y Tiendly te avisará cuando algo se esté agotando.",
      badge: "PASO 1",
      icon: Smartphone,
      color: "bg-emerald-500",
      accent: "text-emerald-600 bg-emerald-50",
      image: "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      tip: "Si quieres cargar muchos productos de una vez, usa \"Carga Masiva (Excel)\" en Inventario."
    },
    {
      title: "Registra tus ventas del día",
      description: "En \"Caja y Ventas\" eliges los productos, defines el método de pago (efectivo, tarjeta, transferencia o fiado) y confirmas. El stock y tus reportes se actualizan solos.",
      badge: "PASO 2",
      icon: TrendingUp,
      color: "bg-amber-500",
      accent: "text-amber-600 bg-amber-50",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      tip: "El Panel de Control tiene un botón de \"Venta Rápida\" para cobros de mostrador en efectivo."
    },
    {
      title: "Lleva tus tareas y tus fiados al día",
      description: "El \"Checklist\" te ayuda a no olvidar tus rutinas diarias, y \"Deudas\" lleva la cuenta de a quién le fiaste y cuándo debe pagarte, para que no se te pierda ningún cobro.",
      badge: "PASO 3",
      icon: Sparkles,
      color: "bg-blue-500",
      accent: "text-blue-600 bg-blue-50",
      image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      tip: "En Ajustes puedes activar un PIN de 4 dígitos si compartes el celular o la tablet con alguien más."
    },
    {
      title: "Todo esto ya está listo para ti",
      description: "No necesitas ser experto en tecnología: si tienes dudas sobre alguna función, el asistente de IA (el botón flotante con la estrella) puede ayudarte con preguntas sobre tu inventario y tus ventas.",
      badge: "LISTO PARA EMPEZAR",
      icon: Users,
      color: "bg-[#3A4A3A]",
      accent: "text-[#3A4A3A] bg-emerald-50",
      image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      tip: "Puedes cargar datos de ejemplo desde el Panel de Control para explorar la app antes de meter tu inventario real."
    }
  ];

  const current = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto" id="onboarding-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-brand-border/60 flex flex-col md:flex-row h-auto md:h-[620px]"
        id="onboarding-card"
      >
        {/* Left column: Visual context / illustrative banner */}
        <div className="md:w-5/12 bg-[#3A4A3A] text-white p-8 flex flex-col justify-between relative overflow-hidden select-none">
          {/* Accent decoration blobs */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-36 w-36 rounded-full bg-white/5 blur-xl" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-36 w-36 rounded-full bg-white/5 blur-xl" />
          
          <div className="relative z-10 space-y-4">
            <span className={`inline-block text-[10px] font-extrabold tracking-widest uppercase px-3 py-1 rounded-full ${current.accent}`}>
              {current.badge}
            </span>
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <current.icon size={24} className="text-emerald-300" />
            </div>
            <h2 className="text-2xl font-black leading-tight tracking-tight mt-4">
              {current.title}
            </h2>
          </div>

          {/* Consejo práctico del paso actual */}
          <div className="relative z-10 bg-white/10 backdrop-blur-xs rounded-2xl p-4 mt-8 border border-white/10 space-y-1">
            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">💡 Consejo</p>
            <p className="text-xs leading-relaxed text-white/90">
              {current.tip}
            </p>
          </div>
        </div>

        {/* Right column: Form / Information / Actions */}
        <div className="md:w-7/12 p-8 flex flex-col justify-between bg-white h-full">
          <div className="space-y-6">
            {/* Steps indicator */}
            <div className="flex items-center gap-1.5" id="onboarding-indicator-list">
              {steps.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep ? "w-8 bg-[#4CAF50]" : "w-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#212121] tracking-tight">
                {currentStep === 0 && "📦 Arma tu catálogo de productos"}
                {currentStep === 1 && "🧾 Cobra y controla tu caja"}
                {currentStep === 2 && "✅ Organiza tu día a día"}
                {currentStep === 3 && "🚀 Ya puedes empezar a usar Tiendly"}
              </h3>
              
              <p className="text-sm text-brand-muted leading-relaxed">
                {current.description}
              </p>
            </div>

            {/* Illustrative product mockup placeholder */}
            <div className="relative rounded-2xl overflow-hidden border border-brand-border/60 h-44 bg-slate-50">
              <img 
                src={current.image} 
                alt={current.title}
                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4">
                <span className="text-xs font-semibold text-white tracking-wide">
                  Tiendly Digital — Fácil, rápido y confiable
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex items-center justify-between pt-6 border-t border-brand-border/40 mt-6 select-none shrink-0">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="text-xs font-bold text-slate-400 hover:text-[#212121] disabled:opacity-30 transition-colors py-2 px-3 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Atrás
            </button>

            <button
              onClick={handleNext}
              className="rounded-2xl bg-[#4CAF50] hover:bg-[#45a049] text-white text-xs font-bold px-6 py-3.5 shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>{currentStep === steps.length - 1 ? "Comenzar Ahora 🏪" : "Siguiente"}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
