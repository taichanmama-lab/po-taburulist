
import { GoogleGenAI } from "@google/genai";
import { Appliance, PowerStation } from "../types";

export const getSmartAdvice = async (selectedAppliances: Appliance[], chosenStation: PowerStation): Promise<string> => {
  // 環境変数からAPIキーを取得
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const applianceNames = selectedAppliances.length > 0 
    ? selectedAppliances.map(a => `${a.name}(${a.wattage}W)`).join(', ')
    : "家電の選択なし";
  const totalWattage = selectedAppliances.reduce((acc, a) => acc + a.wattage, 0);

  const prompt = `
    【ポータブル電源コンサルタントとして回答してください】
    ユーザーは以下の家電を使いたいと考えています: ${applianceNames}。
    合計消費電力は ${totalWattage}W です。
    
    検討中の製品: ${chosenStation.maker} ${chosenStation.model}
    スペック: 容量 ${chosenStation.capacity}Wh, 定格出力 ${chosenStation.output}W
    
    以下の3点を120文字程度で分かりやすく解説してください：
    1. この製品の出力で、選んだ家電が動くかどうか（起動電力も考慮して）。
    2. 合計電力で使い続けた場合の推定使用時間。
    3. この製品を選ぶメリット。
    
    ※親しみやすく、かつ専門的なアドバイザーの口調で。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "申し訳ありません。アドバイスを生成できませんでした。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AIとの接続に失敗しました。スペック表をご確認ください。";
  }
};
