import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Template API Gemini - Siap digunakan saat API Key sudah tersedia
export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "API Key belum dikonfigurasi di .env.local" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    // Menggunakan model Gemini 2.5 Flash
    // Model ini telah lolos tes kuota pada kunci API Anda setelah metode pembayaran aktif.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
    });

    const prompt = `
      Analisis foto struk ini dan ekstrak data berikut dalam format JSON. 
      PENTING: Hanya kembalikan JSON saja, tanpa teks penjelasan apapun.
      
      Struktur JSON:
      {
        "nama_toko": "String (Nama tempat/toko)",
        "keperluan": "String (Tujuan belanja/pembayaran)",
        "kategori": "String (Salah satu dari: Makanan/Minuman, Belanja Bulanan, Transportasi, Hiburan, Kesehatan, Tagihan, Pendidikan, Lainnya)",
        "total_harga": "String (Hanya angka total, misal: 150000)",
        "tanggal": "String (Format YYYY-MM-DD)",
        "catatan": "String (Daftar singkat item yang dibeli)"
      }
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: file.type } },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Pembersihan teks JSON yang lebih kuat
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Format AI tidak valid: " + text);
    
    const data = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Gemini Template Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
