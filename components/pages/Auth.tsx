import React, { useState } from 'react';
import { supabase } from '../../supabase/client';
import { ShieldCheck, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Verifique seu e-mail para confirmar a conta.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#c5a059]/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      
      <div className="w-full max-w-lg space-y-12 animate-slide-up relative z-10">
        <div className="text-center">
            <div className="inline-block bg-gradient-to-br from-[#c5a059] to-[#d9b36a] p-4 rounded-[2rem] shadow-2xl mb-8">
                <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-[800] text-white tracking-tight">Curatela Contas</h1>
            <p className="mt-4 text-slate-400 font-medium tracking-wide">
              {isLogin ? 'Autenticação Segura Sovereign Trust' : 'Solicitar Acesso ao Sistema de Curatela'}
            </p>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl border border-white/10">
            <form className="space-y-8" onSubmit={handleAuth}>
                <div>
                    <label htmlFor="email" className="block text-[10px] font-extrabold text-[#c5a059] uppercase tracking-[0.25em] mb-3">Identidade Eletrônica</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#c5a059] transition-all font-medium placeholder:text-slate-600"
                        placeholder="exemplo@dominio.com"
                    />
                </div>
                <div>
                    <label htmlFor="password"  className="block text-[10px] font-extrabold text-[#c5a059] uppercase tracking-[0.25em] mb-3">Chave de Acesso</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#c5a059] transition-all font-medium placeholder:text-slate-600"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-rose-500" />
                        <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-premium-gold w-full flex justify-center items-center gap-3 px-8 py-5 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
                    {loading ? 'PROCESSANDO...' : (isLogin ? 'ENTRAR NO SISTEMA' : 'SOLICITAR ACESSO')}
                </button>
            </form>
            
            <div className="mt-10 text-center">
                <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-[10px] font-extrabold text-slate-500 hover:text-white uppercase tracking-[0.2em] transition-colors">
                    {isLogin ? 'NÃO POSSUI CREDENCIAIS? SOLICITE AQUI' : 'JÁ POSSUI ACESSO? VOLTAR AO LOGIN'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;