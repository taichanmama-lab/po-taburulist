
import React, { useState, useMemo, useEffect } from 'react';
import { Appliance, PowerStation, FilterCriteria } from './types';
import { getSmartAdvice } from './services/geminiService';

// ★★★ 手順1でデプロイした「ウェブアプリのURL」をここに貼り付けてください ★★★
const GAS_API_URL = "YOUR_GAS_WEB_APP_URL_HERE";

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

  // 1. スプレッドシートからデータを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!GAS_API_URL || GAS_API_URL.includes("YOUR_GAS")) {
        setError("GASのURLを設定してください。");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(GAS_API_URL);
        if (!res.ok) throw new Error("データの取得に失敗しました");
        const data = await res.json();
        setAppliances(data.appliances || []);
        setProducts(data.products || []);
      } catch (e) {
        console.error(e);
        setError("スプレッドシートからデータを読み込めませんでした。GASのURLと公開設定を確認してください。");
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

  // 3. 家電選択時にフィルタを自動推奨
  useEffect(() => {
    if (totalWattage > 0) {
      const recomOut = Math.ceil(totalWattage * 1.2);
      setFilters(prev => ({
        ...prev,
        output: recomOut >= 2000 ? "2000以上" : recomOut >= 1500 ? "1500以上" : recomOut >= 1200 ? "1200以上" : "600以上",
        capacity: totalWattage >= 2000 ? "2000以上" : totalWattage >= 1000 ? "1000以上" : "1000未満"
      }));
    }
  }, [totalWattage]);

  // 4. フィルタリング
  const filteredProducts = useMemo(() => {
    return products.filter(item => {
      if (filters.capacity !== '選択してください') {
        const val = parseInt(filters.capacity);
        if (filters.capacity.includes('未満') && item.capacity >= val) return false;
        if (filters.capacity.includes('以上') && item.capacity < val) return false;
      }
      if (filters.output !== '選択してください') {
        const val = parseInt(filters.output);
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

  const handleGetAdvice = async (product: PowerStation) => {
    const key = `${product.maker}-${product.model}`;
    if (advice[key]) return;
    setLoadingAdvice(key);
    const text = await getSmartAdvice(selectedAppliances, product);
    setAdvice(prev => ({ ...prev, [key]: text }));
    setLoadingAdvice(null);
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-slate-500">スプレッドシートのデータを読み込み中...</p>
    </div>
  );

  if (error) return (
    <div className="p-8 text-center">
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
        <p className="font-bold">エラーが発生しました</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-slate-50 min-h-screen">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <span className="text-yellow-500">⚡</span> ポータブル電源 スマート診断
        </h1>
        <p className="text-slate-500 mt-2 italic">Latest Update: Spreadsheet Synchronized</p>
      </header>

      {/* STEP 1: 家電選択 */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
          <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono">1</span>
          使用する家電を選択
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {appliances.map(app => (
            <label 
              key={app.id} 
              className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
                selectedAppIds.includes(app.id) 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <input 
                type="checkbox" 
                className="hidden"
                checked={selectedAppIds.includes(app.id)}
                onChange={() => setSelectedAppIds(prev => prev.includes(app.id) ? prev.filter(i => i !== app.id) : [...prev, app.id])}
              />
              <span className="text-sm font-bold truncate">{app.name}</span>
              <span className="text-xs text-slate-400">{app.wattage}W</span>
            </label>
          ))}
        </div>

        {totalWattage > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl shadow-md">
            <div className="text-xs uppercase tracking-wider opacity-80 font-bold">Total Power consumption</div>
            <div className="text-3xl font-black">{totalWattage} <span className="text-lg font-normal">W</span></div>
            <div className="text-xs mt-3 pt-3 border-t border-white/20 flex gap-4">
              <span>推奨出力: <span className="font-bold">{Math.ceil(totalWattage * 1.2)}W+</span></span>
              <span>推奨容量: <span className="font-bold">{totalWattage}Wh+</span></span>
            </div>
          </div>
        )}
      </section>

      {/* STEP 2: フィルタ */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
          <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono">2</span>
          詳細条件を絞り込む
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.keys(filters).map((key) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{key}</label>
              <select 
                value={filters[key as keyof FilterCriteria]}
                onChange={e => setFilters({...filters, [key]: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option>選択してください</option>
                {key === 'capacity' && <><option>1000未満</option><option>1000以上</option><option>2000以上</option><option>3000以上</option></>}
                {key === 'output' && <><option>600以上</option><option>1200以上</option><option>1500以上</option><option>2000以上</option></>}
                {key === 'weight' && <><option>5kg未満</option><option>5-13kg</option><option>13kg以上</option></>}
                {key === 'led' || key === 'lock' ? <><option>必要</option><option>不要</option></> : null}
              </select>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-600">おすすめのポータブル電源 ({filteredProducts.length}件)</h3>
      </div>

      {/* 検索結果 */}
      <div className="space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-400">条件に合う製品が見つかりませんでした。</p>
          </div>
        ) : (
          filteredProducts.map(product => {
            const adviceKey = `${product.maker}-${product.model}`;
            return (
              <div key={adviceKey} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5 flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-48 aspect-video md:aspect-square bg-slate-100 rounded-xl overflow-hidden shrink-0">
                    <img src={product.imageUrl} alt={product.model} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 px-2 py-0.5 bg-blue-50 rounded-full border border-blue-100">{product.maker}</span>
                        <h4 className="text-xl font-bold text-slate-800 mt-1">{product.model}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Sale Price</div>
                        <div className="text-2xl font-black text-orange-600">¥{product.price.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 my-4">
                      <div className="bg-slate-100 rounded-lg px-3 py-1 border border-slate-200">
                        <div className="text-[8px] text-slate-400 font-bold uppercase">Capacity</div>
                        <div className="text-sm font-bold text-slate-700">{product.capacity}Wh</div>
                      </div>
                      <div className="bg-slate-100 rounded-lg px-3 py-1 border border-slate-200">
                        <div className="text-[8px] text-slate-400 font-bold uppercase">Output</div>
                        <div className="text-sm font-bold text-slate-700">{product.output}W</div>
                      </div>
                      <div className="bg-slate-100 rounded-lg px-3 py-1 border border-slate-200">
                        <div className="text-[8px] text-slate-400 font-bold uppercase">Weight</div>
                        <div className="text-sm font-bold text-slate-700">{product.weight}kg</div>
                      </div>
                      {product.hasLed && <span className="bg-yellow-50 text-yellow-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-yellow-100 self-center">💡 LED</span>}
                      {product.hasChildLock && <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-green-100 self-center">🔒 LOCK</span>}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-auto">
                      <a href={product.amazonUrl} target="_blank" className="bg-[#FF9900] text-white py-2 rounded-lg font-bold text-xs text-center hover:brightness-110 transition-all">Amazonで購入</a>
                      <a href={product.rakutenUrl} target="_blank" className="bg-[#BF0000] text-white py-2 rounded-lg font-bold text-xs text-center hover:brightness-110 transition-all">楽天で購入</a>
                      <button 
                        onClick={() => handleGetAdvice(product)}
                        disabled={loadingAdvice === adviceKey}
                        className="col-span-2 sm:col-span-1 border-2 border-blue-500 text-blue-600 py-2 rounded-lg font-bold text-xs hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {loadingAdvice === adviceKey ? (
                          <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent animate-spin rounded-full"></div> 診断中</span>
                        ) : 'AIスマート解説'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {advice[adviceKey] && (
                  <div className="px-5 py-4 bg-blue-50/50 border-t border-blue-100 animate-in fade-in slide-in-from-top-1">
                    <div className="flex gap-3">
                      <div className="text-xl">🤖</div>
                      <div className="text-sm text-slate-600 leading-relaxed font-medium">
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
    </div>
  );
};

export default App;
