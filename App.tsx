
import React, { useState, useMemo, useEffect } from 'react';
import { Appliance, PowerStation, FilterCriteria } from './types';
import { getSmartAdvice } from './services/geminiService';

// ★★★ 手順1でデプロイした「ウェブアプリのURL」をここに貼り付けてください ★★★
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw_TWOR2fBqif093LrmE-k8UwdhEajOdzj1aofnXmfX3_8W7x7lmGBHZwR_nbha_qP_PA/exec";

const App: React.FC = () => {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [products, setProducts] = useState<PowerStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterCriteria>({
    capacity: '選択してください',
    output: '選択してください',
    weight: '選択してください',
    noise: '選択してください',
    led: '選択してください',
    lock: '選択してください',
  });
  const [advice, setAdvice] = useState<{ [key: string]: string }>({});
  const [loadingAdvice, setLoadingAdvice] = useState<string | null>(null);

  // 1. スプレッドシート(GAS)からデータを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!GAS_API_URL || GAS_API_URL.includes("YOUR_GAS")) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(GAS_API_URL);
        if (!res.ok) throw new Error("データの取得に失敗しました。URLを確認してください。");
        const data = await res.json();
        setAppliances(data.appliances || []);
        setProducts(data.products || []);
      } catch (e) {
        console.error(e);
        setError("スプレッドシートの読み込みに失敗しました。GASの「ウェブアプリのURL」が正しいか、公開設定が「全員」になっているか確認してください。");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. 合計ワット数の計算
  const selectedAppliances = useMemo(() => 
    appliances.filter(app => selectedAppIds.includes(app.id)),
  [selectedAppIds, appliances]);

  const totalWattage = useMemo(() => 
    selectedAppliances.reduce((sum, app) => sum + app.wattage, 0),
  [selectedAppliances]);

  // 3. フィルタリング処理
  const filteredProducts = useMemo(() => {
    return products.filter(item => {
      if (filters.capacity !== '選択してください') {
        const val = parseInt(filters.capacity.replace(/[^0-9]/g, ''));
        if (filters.capacity.includes('未満') && item.capacity >= val) return false;
        if (filters.capacity.includes('以上') && item.capacity < val) return false;
      }
      if (filters.output !== '選択してください') {
        const val = parseInt(filters.output.replace(/[^0-9]/g, ''));
        if (item.output < val) return false;
      }
      if (filters.weight !== '選択してください') {
        if (filters.weight === '5kg未満' && item.weight >= 5) return false;
        if (filters.weight === '5-13kg' && (item.weight < 5 || item.weight > 13)) return false;
        if (filters.weight === '13kg以上' && item.weight < 13) return false;
      }
      if (filters.led === '必要' && !item.hasLed) return false;
      if (filters.lock === '必要' && !item.hasChildLock) return false;
      return true;
    });
  }, [filters, products]);

  // AIアドバイスの取得
  const handleGetAdvice = async (product: PowerStation) => {
    const key = `${product.maker}-${product.model}`;
    if (advice[key]) return;
    setLoadingAdvice(key);
    const text = await getSmartAdvice(selectedAppliances, product);
    setAdvice(prev => ({ ...prev, [key]: text }));
    setLoadingAdvice(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-bold animate-pulse">スプレッドシートを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 bg-slate-50 min-h-screen">
      <header className="text-center mb-10">
        <div className="inline-block bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full mb-3 tracking-widest uppercase">
          Smart Battery Finder
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
          ⚡ ポータブル電源 <span className="text-blue-600">スマート診断</span>
        </h1>
        <p className="text-slate-500 mt-3 text-sm">あなたの使い方にぴったりの一台をAIが見つけます</p>
      </header>

      {!GAS_API_URL || GAS_API_URL.includes("YOUR_GAS") ? (
        <div className="bg-yellow-50 border-2 border-yellow-200 p-8 rounded-3xl text-center mb-10">
          <p className="text-yellow-800 font-bold">⚠️ 設定が必要です</p>
          <p className="text-yellow-700 text-sm mt-2">
            App.tsxの3行目にある `GAS_API_URL` に、デプロイしたウェブアプリのURLを貼り付けてください。
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-2 border-red-200 p-8 rounded-3xl text-center mb-10">
          <p className="text-red-800 font-bold">Error</p>
          <p className="text-red-700 text-sm mt-2">{error}</p>
        </div>
      ) : (
        <>
          {/* STEP 1: 家電選択 */}
          <section className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 mb-8">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-800">
              <span className="bg-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center text-sm font-mono">01</span>
              使用する予定の家電を選択
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {appliances.map(app => (
                <label 
                  key={app.id} 
                  className={`group flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                    selectedAppIds.includes(app.id) 
                    ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100' 
                    : 'border-slate-50 bg-slate-50 hover:border-slate-200 hover:bg-white'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={selectedAppIds.includes(app.id)}
                    onChange={() => setSelectedAppIds(prev => prev.includes(app.id) ? prev.filter(i => i !== app.id) : [...prev, app.id])}
                  />
                  <span className={`text-xs font-bold mb-1 transition-colors ${selectedAppIds.includes(app.id) ? 'text-blue-600' : 'text-slate-400'}`}>
                    {app.category}
                  </span>
                  <span className="text-sm font-black text-slate-800 leading-tight">{app.name}</span>
                  <span className="text-[10px] mt-2 font-mono text-slate-400">{app.wattage}W</span>
                </label>
              ))}
            </div>

            {totalWattage > 0 && (
              <div className="mt-8 bg-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
                <div>
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Consumption</div>
                  <div className="text-4xl font-black">{totalWattage}<span className="text-xl font-normal ml-1">W</span></div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-white/10 rounded-2xl px-5 py-3 border border-white/10">
                    <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Recommended Output</div>
                    <div className="text-lg font-black">{Math.ceil(totalWattage * 1.2)}W+</div>
                  </div>
                  <div className="bg-white/10 rounded-2xl px-5 py-3 border border-white/10">
                    <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Recommended Capacity</div>
                    <div className="text-lg font-black">{totalWattage}Wh+</div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* STEP 2: 条件 */}
          <section className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 mb-10">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-800">
              <span className="bg-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center text-sm font-mono">02</span>
              詳細スペックで絞り込む
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {Object.keys(filters).map((key) => (
                <div key={key}>
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{key}</label>
                  <select 
                    value={filters[key as keyof FilterCriteria]}
                    onChange={e => setFilters({...filters, [key]: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all appearance-none"
                  >
                    <option>選択してください</option>
                    {key === 'capacity' && <><option>1000Wh未満</option><option>1000Wh以上</option><option>2000Wh以上</option><option>3000Wh以上</option></>}
                    {key === 'output' && <><option>600W以上</option><option>1200W以上</option><option>1500W以上</option><option>2000W以上</option></>}
                    {key === 'weight' && <><option>5kg未満</option><option>5-13kg</option><option>13kg以上</option></>}
                    {key === 'led' || key === 'lock' ? <><option>必要</option><option>不要</option></> : null}
                  </select>
                </div>
              ))}
            </div>
          </section>

          {/* 診断結果 */}
          <div className="mb-6 flex justify-between items-end">
            <h3 className="text-2xl font-black text-slate-800">
              おすすめの電源 <span className="text-blue-600">({filteredProducts.length}件)</span>
            </h3>
          </div>

          <div className="space-y-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">該当する製品がありません。条件を緩めてみてください。</p>
              </div>
            ) : (
              filteredProducts.map(product => {
                const adviceKey = `${product.maker}-${product.model}`;
                return (
                  <div key={adviceKey} className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/30 border border-slate-50 overflow-hidden hover:translate-y-[-4px] transition-all duration-300">
                    <div className="p-8">
                      <div className="flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-56 aspect-square bg-slate-50 rounded-[2rem] overflow-hidden shrink-0 flex items-center justify-center p-4">
                          <img src={product.imageUrl} alt={product.model} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                        </div>
                        <div className="flex-grow flex flex-col">
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <div>
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">{product.maker}</span>
                              <h4 className="text-2xl font-black text-slate-900 mt-2 leading-tight">{product.model}</h4>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Market Price</div>
                              <div className="text-3xl font-black text-orange-600 italic">¥{product.price.toLocaleString()}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                              <div className="text-[8px] text-slate-400 font-black uppercase mb-1">Capacity</div>
                              <div className="text-sm font-black text-slate-800">{product.capacity}Wh</div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                              <div className="text-[8px] text-slate-400 font-black uppercase mb-1">Output</div>
                              <div className="text-sm font-black text-slate-800">{product.output}W</div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                              <div className="text-[8px] text-slate-400 font-black uppercase mb-1">Weight</div>
                              <div className="text-sm font-black text-slate-800">{product.weight}kg</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-8">
                            {product.maxOutput > 0 && <span className="text-[10px] font-bold px-3 py-1 bg-slate-900 text-white rounded-lg">瞬間最大 {product.maxOutput}W</span>}
                            {product.batteryType && <span className="text-[10px] font-bold px-3 py-1 bg-blue-100 text-blue-700 rounded-lg">{product.batteryType}</span>}
                            {product.hasLed && <span className="text-[10px] font-bold px-3 py-1 bg-yellow-50 text-yellow-600 border border-yellow-100 rounded-lg">💡 LED</span>}
                            {product.hasChildLock && <span className="text-[10px] font-bold px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-lg">🔒 ロック</span>}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-auto">
                            <a href={product.amazonUrl} target="_blank" className="bg-[#FF9900] text-white py-4 rounded-2xl font-black text-sm text-center shadow-lg shadow-orange-200 hover:brightness-110 transition-all">Amazon</a>
                            <a href={product.rakutenUrl} target="_blank" className="bg-[#BF0000] text-white py-4 rounded-2xl font-black text-sm text-center shadow-lg shadow-red-200 hover:brightness-110 transition-all">楽天市場</a>
                            <button 
                              onClick={() => handleGetAdvice(product)}
                              disabled={loadingAdvice === adviceKey}
                              className="col-span-2 sm:col-span-1 border-2 border-blue-600 text-blue-600 py-4 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {loadingAdvice === adviceKey ? (
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : '🤖 AI解説'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {advice[adviceKey] && (
                      <div className="px-8 py-6 bg-blue-600 text-white animate-in slide-in-from-bottom-2 duration-500">
                        <div className="flex gap-4">
                          <div className="text-2xl shrink-0">🤖</div>
                          <div className="text-sm font-bold leading-relaxed opacity-95">
                            {advice[adviceKey]}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
