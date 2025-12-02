import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RECEIPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    merchantName: { type: Type.STRING, description: "Name of the merchant or store." },
    transactionDate: { type: Type.STRING, description: "Date of transaction in YYYY-MM-DD format." },
    currency: { type: Type.STRING, description: "Currency symbol or code (e.g., $, USD, EUR)." },
    totalAmount: { type: Type.NUMBER, description: "Final total amount paid." },
    category: { type: Type.STRING, description: "General category of the purchase (e.g., Food, Transport, Utilities)." },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          qty: { type: Type.NUMBER },
          price: { type: Type.NUMBER }
        }
      }
    },
    confidenceScore: { type: Type.NUMBER, description: "Confidence score from 0 to 100 based on data completeness." }
  },
  required: ["merchantName", "totalAmount", "items"]
};

// Now accepts raw text from PaddleOCR instead of an image
export const parseReceiptText = async (rawText: string): Promise<ReceiptData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            text: `You are a receipt parsing engine. I will provide you with raw text extracted from a receipt using OCR. 
            Your job is to structure this text into JSON. 
            
            RAW OCR TEXT:
            """
            ${rawText}
            """
            
            Instructions:
            1. Identify the merchant name.
            2. Extract the date (YYYY-MM-DD). If year is missing, assume current year.
            3. Extract the total amount.
            4. Extract individual line items with prices.
            5. Determine the category.
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: RECEIPT_SCHEMA,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const data = JSON.parse(text) as Omit<ReceiptData, 'id'>;
    
    return {
      ...data,
      id: crypto.randomUUID()
    };
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};
