
import React, { useState } from 'react';
import { Plan, User } from '../types';
import Logo from './Logo';

interface SubscriptionPageProps {
  onSubscribe: (plan: Plan) => void;
  onBack: () => void;
  currentUser: User | null;
}

const PLANS: Plan[] = [
  { id: 'daily', name: 'Acceso Diario', price: 4.99, durationDays: 1, description: 'Desbloquea todos los picks de las próximas 24 horas.' },
  { id: 'weekly', name: 'Pase Semanal', price: 29.99, durationDays: 7, description: 'Ideal para seguir las competiciones europeas y NBA.', popular: true },
  { id: 'monthly', name: 'Picks Pro Mensual', price: 99.99, durationDays: 30, description: 'Acceso ilimitado y soporte prioritario de analistas.' },
];

type PaymentMethod = 'card' | 'bizum' | 'paypal' | 'crypto';

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onSubscribe, onBack, currentUser }) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'selection' | 'checkout' | 'gateway'>('selection');
  const [userPhone, setUserPhone] = useState('');

  const calculateDiscount = (plan: Plan) => {
    if (plan.id === 'daily') return null;
    const dailyRef = 4.99;
    const standardPrice = dailyRef * plan.durationDays;
    const discount = ((standardPrice - plan.price) / standardPrice) * 100;
    return Math.round(discount);
  };

  const startCheckout = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalPayment = () => {
    setProcessing(true);
    
    if (paymentMethod === 'bizum') {
      setTimeout(() => {
        setStep('gateway');
        setProcessing(false);
        setTimeout(() => {
          if (selectedPlan) onSubscribe(selectedPlan);
        }, 4500);
      }, 1500);
    } else {
      setTimeout(() => {
        if (selectedPlan) onSubscribe(selectedPlan);
        setProcessing(false);
      }, 2500);
    }
  };

  if (step === 'gateway' && selectedPlan) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 transition-colors">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="flex justify-center mb-4">
             <div className="bg-[#00AFF0] text-white px-6 py-2 rounded-full font-black text-2xl italic">bizum</div>
          </div>
          <div className="relative">
            <div className="w-24 h-24 border-4 border-sky-100 dark:border-sky-900/30 border-t-sky-500 rounded-full animate-spin mx-auto"></div>
            <i className="fas fa-shield-alt absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-sky-500"></i>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Verificando operación...</h2>
            <p className="text-gray-500 dark:text-[#C8C8C8] font-medium">Por favor, abre la aplicación de tu banco y <span className="text-sky-600 dark:text-sky-400 font-bold">acepta la solicitud de Bizum</span> por valor de {selectedPlan.price}€.</p>
          </div>
          <div className="bg-gray-50 dark:bg-[#121212] p-6 rounded-3xl border border-gray-100 dark:border-[#232323] text-left space-y-3">
            <div className="flex justify-between text-[10px] font-black text-gray-400 dark:text-[#6E6E6E] uppercase tracking-widest">
              <span>Concepto</span>
              <span className="text-gray-900 dark:text-white">Suscripción PickMaster Pro</span>
            </div>
            <div className="flex justify-between text-[10px] font-black text-gray-400 dark:text-[#6E6E6E] uppercase tracking-widest">
              <span>Importe</span>
              <span className="text-gray-900 dark:text-white">{selectedPlan.price} EUR</span>
            </div>
            <div className="flex justify-between text-[10px] font-black text-gray-400 dark:text-[#6E6E6E] uppercase tracking-widest">
              <span>Estado</span>
              <span className="text-sky-600 dark:text-sky-400 animate-pulse">Pendiente de firma</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'checkout' && selectedPlan) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-[#121212] rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-[#232323] transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="bg-[#001F3F] dark:bg-black p-10 text-white border-r dark:border-[#232323]">
              <button onClick={() => setStep('selection')} className="text-emerald-400 dark:text-[#FF3B30] font-bold mb-8 flex items-center hover:translate-x-1 transition-transform">
                <i className="fas fa-chevron-left mr-2"></i> Cambiar plan
              </button>
              <Logo size={40} className="mb-6" />
              <h3 className="text-sm font-black text-emerald-500 dark:text-[#FF3B30] uppercase tracking-[0.2em] mb-2">Resumen del pedido</h3>
              <div className="flex justify-between items-end mb-6">
                <h4 className="text-2xl font-black">{selectedPlan.name}</h4>
                <span className="text-3xl font-black text-[#00FF00]">{selectedPlan.price}€</span>
              </div>
              <div className="space-y-4 pt-6 border-t border-white/10 dark:border-[#232323]">
                <div className="flex justify-between text-sm text-white/60">
                  <span>Acceso Premium</span>
                  <span>Incluido</span>
                </div>
                <div className="flex justify-between text-lg font-black pt-4 text-white">
                  <span>TOTAL A PAGAR</span>
                  <span className="text-[#00FF00] dark:text-[#FF3B30]">{selectedPlan.price}€</span>
                </div>
              </div>
            </div>

            <div className="p-10">
              <h3 className="text-xl font-black text-[#001F3F] dark:text-white mb-6">Método de Pago</h3>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {(['card', 'bizum', 'paypal', 'crypto'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-xs uppercase transition-all flex items-center justify-center space-x-2 ${
                      paymentMethod === method ? 'border-emerald-500 dark:border-[#FF3B30] bg-emerald-50 dark:bg-red-900/10 text-emerald-700 dark:text-white' : 'border-gray-100 dark:border-[#232323] text-gray-400 dark:text-[#6E6E6E] hover:border-gray-200'
                    }`}
                  >
                    <i className={`fas ${method === 'card' ? 'fa-credit-card' : method === 'bizum' ? 'fa-mobile-alt' : method === 'paypal' ? 'fa-paypal' : 'fa-bitcoin'}`}></i>
                    <span>{method}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {paymentMethod === 'card' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 dark:text-[#6E6E6E] uppercase mb-2">Número de Tarjeta</label>
                      <input type="text" placeholder="XXXX XXXX XXXX XXXX" className="w-full p-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#232323] rounded-xl outline-none focus:border-emerald-500 dark:focus:border-[#FF3B30] font-mono text-gray-900 dark:text-white placeholder:text-gray-300" />
                    </div>
                  </div>
                )}
                {paymentMethod === 'bizum' && (
                  <div className="animate-in fade-in duration-300 space-y-4">
                    <label className="block text-[10px] font-black text-gray-400 dark:text-[#6E6E6E] uppercase mb-2">Tu número de teléfono</label>
                    <div className="flex space-x-2">
                      <span className="bg-gray-100 dark:bg-[#1A1A1A] p-4 rounded-xl font-bold text-gray-600 dark:text-[#C8C8C8] border dark:border-[#232323]">+34</span>
                      <input type="tel" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="600 000 000" className="flex-1 p-4 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#232323] rounded-xl outline-none focus:border-[#00AFF0] font-bold text-gray-900 dark:text-white placeholder:text-gray-300" />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleFinalPayment}
                  disabled={processing}
                  className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center ${
                    paymentMethod === 'bizum' ? 'bg-[#00AFF0] text-white shadow-sky-100' : 
                    paymentMethod === 'paypal' ? 'bg-[#ffc439] text-[#003087]' :
                    'bg-[#00FF00] dark:bg-[#FF3B30] text-[#001F3F] dark:text-white shadow-emerald-100'
                  } ${processing ? 'opacity-50' : 'hover:scale-[1.02]'}`}
                >
                  {processing ? <><i className="fas fa-spinner fa-spin mr-3"></i> REDIRIGIENDO...</> : <><i className="fas fa-lock mr-3 opacity-30"></i> FINALIZAR PAGO</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12 flex flex-col items-center">
        <h2 className="text-4xl md:text-5xl font-black text-[#001F3F] dark:text-white mb-4 uppercase">
          Pásate al <span className="text-emerald-600 dark:text-[#FF3B30]">Nivel Pro</span>
        </h2>
        <p className="text-gray-500 dark:text-[#C8C8C8] text-lg max-w-2xl mx-auto font-medium">
          Únete a la comunidad con mayor tasa de acierto (+80%) gracias a nuestro modelo de IA avanzado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-end">
        {PLANS.map((plan) => {
          const discount = calculateDiscount(plan);
          return (
            <div 
              key={plan.id}
              className={`relative bg-white dark:bg-[#121212] rounded-[2rem] p-8 border-2 transition-all transform hover:-translate-y-2 hover:shadow-2xl flex flex-col ${
                plan.popular ? 'border-emerald-500 dark:border-[#FF3B30] shadow-emerald-100 dark:shadow-red-900/10 shadow-2xl scale-105 z-10' : 'border-gray-100 dark:border-[#232323]'
              }`}
            >
              <div className="mb-8">
                <span className="text-emerald-600 dark:text-[#FF3B30] font-bold text-sm uppercase tracking-widest">{plan.name}</span>
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-black text-[#001F3F] dark:text-white">{plan.price}€</span>
                  <span className="text-gray-400 dark:text-[#6E6E6E] ml-2 font-bold uppercase">/{plan.id === 'daily' ? 'DÍA' : 'PLAN'}</span>
                </div>
                {discount && (
                  <span className="inline-block mt-3 bg-emerald-500 dark:bg-[#FF3B30] text-white text-xs font-black px-3 py-1 rounded-lg">AHORRA {discount}%</span>
                )}
              </div>

              <p className="text-gray-400 dark:text-[#C8C8C8] text-sm leading-relaxed mb-8 flex-grow font-medium">{plan.description}</p>

              <button 
                onClick={() => startCheckout(plan)}
                className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center shadow-xl ${
                  plan.popular ? 'bg-emerald-500 dark:bg-[#FF3B30] text-white' : 'bg-[#001F3F] dark:bg-black text-white'
                }`}
              >
                ACCEDER AHORA
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <button onClick={onBack} className="text-gray-400 dark:text-[#6E6E6E] hover:text-[#001F3F] dark:hover:text-white font-bold text-sm transition-colors flex items-center mx-auto">
          <i className="fas fa-arrow-left mr-2"></i> VOLVER A LA JORNADA
        </button>
      </div>
    </div>
  );
};

export default SubscriptionPage;
