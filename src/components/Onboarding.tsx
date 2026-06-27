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
      title: "¿Cansado de los libros y el papel?",
      description: "Llevar el control de tu negocio en papel es cosa del pasado. Con BarrioPro, todo está en tu celular al instante de forma segura y sin enredos.",
      badge: "MIGRACIÓN SIMPLE",
      icon: Smartphone,
      color: "bg-emerald-500",
      accent: "text-emerald-600 bg-emerald-50",
      image: "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      testimonial: {
        quote: "Escribir todo en el cuaderno me quitaba horas y a veces se me perdía. Con BarrioPro registro ventas en 2 segundos.",
        author: "Doña María, Tienda 'El Abasto'"
      }
    },
    {
      title: "Todo en un solo lugar",
      description: "Registra tus ventas diarias, controla el inventario de tus productos para saber cuándo reponer y recuerda tus pendientes sin complicaciones.",
      badge: "CONTROL TOTAL",
      icon: TrendingUp,
      color: "bg-amber-500",
      accent: "text-amber-600 bg-amber-50",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      testimonial: {
        quote: "Ahora sé exactamente cuánto gané al final del día. Mis cuentas están claras y sin errores.",
        author: "Don José, Minimercado 'La Esquina'"
      }
    },
    {
      title: "Diseñado especialmente para ti",
      description: "Hecho a la medida para abarrotes, ferreterías, droguerías, carnicerías, legumbrerías, tiendas digitales (ventas de accesorios), papelerías y demás comercios de barrio.",
      badge: "100% INTUITIVO",
      icon: Sparkles,
      color: "bg-blue-500",
      accent: "text-blue-600 bg-blue-50",
      image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      testimonial: {
        quote: "No soy muy bueno con la tecnología, pero esta app la maneja hasta mi nieto de 8 años. ¡Es facilísima!",
        author: "Don Ramiro, Ferretería 'El Tornillo'"
      }
    },
    {
      title: "Únete a la revolución digital",
      description: "Más de 5,000 negocios locales de barrio ya confían en BarrioPro para crecer y competir mejor. Da el gran salto hoy mismo.",
      badge: "COMUNIDAD LOCAL",
      icon: Users,
      color: "bg-[#3A4A3A]",
      accent: "text-[#3A4A3A] bg-emerald-50",
      image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
      testimonial: {
        quote: "Desde que digitalicé mi negocio, tengo más tiempo libre y sé exactamente qué mercancía rota más rápido.",
        author: "Doña Elena, Legumbrería 'El Huerto'"
      }
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

          {/* Testimonial / Story Card (Persuasion element) */}
          <div className="relative z-10 bg-white/10 backdrop-blur-xs rounded-2xl p-4 mt-8 border border-white/10 space-y-2">
            <p className="text-xs italic leading-relaxed text-white/90">
              "{current.testimonial.quote}"
            </p>
            <p className="text-[10px] font-bold text-emerald-300">
              — {current.testimonial.author}
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
                {currentStep === 0 && "🚀 Da el paso hacia la era moderna"}
                {currentStep === 1 && "📊 Centraliza la administración de tu negocio"}
                {currentStep === 2 && "⚡ Sin cursos técnicos ni manuales"}
                {currentStep === 3 && "👥 Únete a miles de tenderos prósperos"}
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
                  BarrioPro Digital — Fácil, rápido y confiable
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
