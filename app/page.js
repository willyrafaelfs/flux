'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CATEGORIES = ["Makanan/Minuman", "Belanja Bulanan", "Transportasi", "Hiburan", "Kesehatan", "Tagihan", "Pendidikan", "Lainnya"];
const INITIAL_FORM = { nama_toko: "", keperluan: "", kategori: "Lainnya", total_harga: "", tanggal: new Date().toISOString().split('T')[0], catatan: "" };

const ICONS = {
  eye: <><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" /><circle cx="12" cy="12" r="3" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  chart: <path d="M12 20V10M18 20V4M6 20v-4" />,
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
  settings: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>,
  cpu: <><path d="M4 4h16v16H4zm5 5h6v6H9zM9 1v3m6-3v3m-6 16v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3" /></>,
  lock: <><path d="M7 11V7a5 5 0 0 1 10 0v4M3 11h18v11H3z" /></>,
  agreement: <><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></>,
  smartphone: <><path d="M5 2h14v20H5zM12 18h.01" /></>,
  alert: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  fileText: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></>
};

const Icon = ({ name, className = "w-5 h-5" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {ICONS[name] || null}
  </svg>
);

export default function Home() {
  const { data: session, status } = useSession();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0); // For Gemini, we'll use this as a state toggle
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("Semua");
  const [budgetLimit, setBudgetLimit] = useState(5000000); 
  const [showBudgetPrompt, setShowBudgetPrompt] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState('daily'); // 'daily', 'monthly', 'categories'
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'warning' }
  const [activeModal, setActiveModal] = useState(null); // null, 'privacy', 'terms'
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  
  const fileInputRef = useRef(null);

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    dataList.forEach(item => {
      const d = new Date(item.tanggal);
      if (!isNaN(d.getFullYear())) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [dataList]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (status === 'authenticated') {
        fetchData();
        const savedBudget = localStorage.getItem('flux_budget');
        if (savedBudget) setBudgetLimit(parseInt(savedBudget));
    }
  }, [status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance');
      const json = await res.json();
      if (json.data) setDataList(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filteredData = useMemo(() => {
    return dataList.filter(item => {
      const matchSearch = (item.nama_toko?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || (item.keperluan?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === "Semua" || item.kategori === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [dataList, searchTerm, filterCategory]);

  const stats = useMemo(() => {
    let totalThisMonth = 0;
    const catTotals = {};
    const dayTotals = {};
    const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const monthTotals = Array(12).fill(0);

    dataList.forEach(item => {
      const d = new Date(item.tanggal);
      const val = parseInt(item.total_harga?.toString().replace(/[\.,]/g, '') || "0");
      
      // Monthly aggregation for the selected Year
      if (d.getFullYear() === viewYear) {
          monthTotals[d.getMonth()] += val;
      }

      // Daily & Category aggregation for the selected Month/Year
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
          totalThisMonth += val;
          dayTotals[d.getDate()] = (dayTotals[d.getDate()] || 0) + val;
          catTotals[item.kategori] = (catTotals[item.kategori] || 0) + val;
      }
    });

    // Calculate days in selected month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const chartData = Array.from({ length: daysInMonth }, (_, i) => ({ name: (i + 1).toString(), total: dayTotals[i+1] || 0 }));
    
    const barChartData = shortMonthNames.map((name, i) => ({ name, total: monthTotals[i] }));
    
    const pieChartData = Object.entries(catTotals).map(([name, value]) => ({ name, value }));
    
    // AI Local Insights Generation
    const insights = [];
    const sorted = Object.entries(catTotals).sort((a,b) => b[1] - a[1]);
    const budgetPct = Math.min((totalThisMonth / budgetLimit) * 100, 100);
    
    if (dataList.length === 0) {
        insights.push("Belum ada data. Mulai jalankan scan AI pertama Anda hari ini.");
    } else {
        if (budgetPct >= 100) insights.push("🚨 DARURAT ANGGARAN: Anda telah melampaui batas anggaran bulanan yang ditentukan!");
        else if (budgetPct >= 80) insights.push("⚠️ PERINGATAN: Sisa anggaran Anda bulan ini sudah menipis (<20%).");
        else insights.push("✅ AMAN: Pengeluaran Anda berada pada jalur anggaran yang sehat.");

        if (sorted[0] && totalThisMonth > 0) {
            const topPct = Math.round((sorted[0][1] / totalThisMonth) * 100);
            if (topPct > 50) insights.push(`📊 ANOMALI: ${topPct}% pengeluaran bulan ini tersedot untuk kategori [${sorted[0][0]}].`);
            else insights.push(`💡 INFO: Kategori pengeluaran terbesar Anda adalah [${sorted[0][0]}].`);
        }
    }

    return { 
        totalThisMonth, 
        sortedCats: sorted, 
        totalAll: Object.values(catTotals).reduce((a,b) => a+b, 0) || 1, 
        budgetPercent: budgetPct, 
        chartData, 
        barChartData: barChartData.filter(d => d.total > 0 || shortMonthNames.indexOf(d.name) <= (viewYear < new Date().getFullYear() ? 11 : new Date().getMonth())),
        pieChartData,
        insights 
    };
  }, [dataList, budgetLimit, viewMonth, viewYear]);

  const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#10b981', '#f59e0b'];

  const exportToCSV = () => {
    const headers = ["ID", "Nama Toko", "Kategori", "Keperluan", "Total", "Tanggal", "Link Struk"];
    const rows = dataList.map(item => [item.id, item.nama_toko, item.kategori, item.keperluan, item.total_harga, item.tanggal, item.imageUrl || ""]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Flux_Records_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const compressImageForAI = (imageFile) => {
    return new Promise((resolve) => {
      const img = new Image(); 
      img.src = URL.createObjectURL(imageFile);
      img.onload = () => {
        // Create an off-screen canvas (we don't need a ref if we just create one)
        const canvas = document.createElement('canvas'); 
        const ctx = canvas.getContext('2d');
        
        let w = img.width; 
        let h = img.height; 
        
        // Resize down to 1024px maximum (Saves 70%+ token cost compared to 4K)
        if (w > 1024) { h = h * (1024/w); w = 1024; }
        if (h > 1024) { w = w * (1024/h); h = 1024; }
        
        canvas.width = w; 
        canvas.height = h; 
        ctx.drawImage(img, 0, 0, w, h);
        
        // JPEG compression quality 0.6 is very lightweight but readable for AI
        canvas.toBlob(b => resolve(b), 'image/jpeg', 0.6);
      };
    });
  };

  const handleScan = async () => {
    if (!file) return; setScanning(true);
    try {
      // Compress the image before sending it to Gemini
      const compressedBlob = await compressImageForAI(file);
        
      const payload = new FormData();
      payload.append("file", compressedBlob, "receipt.jpg");

      const res = await fetch('/api/gemini', {
        method: 'POST',
        body: payload,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghubungi Gemini AI");

      if (json.data) {
          setFormData(prev => ({ ...prev, ...json.data }));
          showToast("AI berhasil mengekstrak data JSON!", "success");
      }
    } catch (e) { 
        showToast(e.message, "error");
    } finally { 
        setScanning(false); 
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("data", JSON.stringify(formData));
      if (file) payload.append("file", file);

      const res = await fetch('/api/finance', {
        method: editId ? 'PUT' : 'POST',
        body: editId ? JSON.stringify({ id: editId, ...formData }) : payload,
      });

      if (res.ok) { 
          setFormData(INITIAL_FORM); setFile(null); setPreview(null); setEditId(null); 
          fetchData(); 
          showToast("Data tersimpan & difoto arsip ke Drive!", "success");
      }
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus transaksi ini?")) return; setLoading(true);
    try { const res = await fetch(`/api/finance?id=${id}`, { method: 'DELETE' }); if (res.ok) { fetchData(); showToast("Transaksi dihapus.", "warning"); } }
    catch (e) { showToast(e.message, "error"); } finally { setLoading(false); }
  };

  const formatCurrency = (val) => {
    const num = parseInt(val?.toString().replace(/[\.,]/g, '') || "0");
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const LegalModal = () => {
    if (!activeModal) return null;
    const isPrivacy = activeModal === 'privacy';
    const email = "willy.rafaelfs@gmail.com";
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-fadeIn" onClick={() => setActiveModal(null)}>
        <div className="glass p-10 max-w-3xl w-full h-full max-h-[85vh] overflow-y-auto custom-scrollbar animate-modal" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-12 sticky top-0 bg-slate-900/40 backdrop-blur-xl py-4 z-10 border-b border-white/5">
            <div className="flex items-center gap-4">
               <Icon name={isPrivacy ? "shield" : "fileText"} className="w-8 h-8 text-indigo-400" />
               <h3 className="text-2xl font-black tracking-tighter uppercase">{isPrivacy ? "Kebijakan Privasi" : "Persyaratan Layanan"}</h3>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">✕</button>
          </div>
          
          <div className="space-y-10 text-slate-400 text-sm font-medium leading-[1.8]">
            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-[0.3em] bg-indigo-500/5 inline-block px-3 py-1 rounded-md">Terakhir diperbarui: 18 April 2026</p>
            
            {isPrivacy ? (
              <div className="space-y-12">
                <section className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Icon name="download" className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-black uppercase text-xs tracking-widest">1. Informasi yang Kami Kumpulkan</h4>
                  </div>
                  <p>Aplikasi <strong>Smart Receipt Hub</strong> sangat menjunjung tinggi privasi Anda. Kami hanya mengumpulkan informasi yang diperlukan untuk menjalankan layanan inti kami:</p>
                  <ul className="space-y-3 pl-2">
                    <li className="flex gap-3 items-start font-medium"><span className="text-indigo-500 mt-1">●</span> <span><strong>Informasi Akun Google:</strong> Email dan Nama Anda digunakan untuk proses autentikasi.</span></li>
                    <li className="flex gap-3 items-start font-medium"><span className="text-indigo-500 mt-1">●</span> <span><strong>Data Google Drive:</strong> Kami meminta akses <code>drive.file</code> untuk menyimpan data struk di Drive Anda sendiri.</span></li>
                    <li className="flex gap-3 items-start font-medium"><span className="text-indigo-500 mt-1">●</span> <span><strong>File Gambar:</strong> Gambar diproses sementara oleh AI sebelum disimpan permanen di Drive Anda.</span></li>
                  </ul>
                </section>
                <section className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Icon name="settings" className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-black uppercase text-xs tracking-widest">2. Penggunaan Data</h4>
                  </div>
                  <p>Data Anda digunakan semata-mata untuk menganalisis konten struk menggunakan layanan Gemini AI, serta mengelola data transaksi di penyimpanan Google Drive milik Anda sendiri.</p>
                </section>
                <section className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Icon name="cpu" className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-black uppercase text-xs tracking-widest">3. Berbagi Data & AI</h4>
                  </div>
                  <p>Kami <strong>tidak menjual</strong> data Anda. Data dikirim ke <strong>Google Gemini</strong> hanya untuk pemrosesan AI anonim dan tidak disimpan permanen oleh sistem kami.</p>
                </section>
                <section className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Icon name="lock" className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-black uppercase text-xs tracking-widest">4. Keamanan Data</h4>
                  </div>
                  <p>Seluruh komunikasi dilindungi enkripsi SSL/TLS. Kami tidak menyimpan salinan permanen di server kami; semuanya terisolasi di folder aman Google Drive Anda.</p>
                </section>
              </div>
            ) : (
              <div className="space-y-12">
                <section className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Icon name="agreement" className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-black uppercase text-xs tracking-widest">1. Penerimaan Ketentuan</h4>
                  </div>
                  <p>Dengan mengakses atau menggunakan <strong>Smart Receipt Hub</strong>, Anda setuju untuk terikat oleh Persyaratan Layanan ini. Jika Anda tidak menyetujui bagian mana pun, Anda tidak diperkenankan menggunakan aplikasi kami.</p>
                </section>
                <section className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Icon name="smartphone" className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-black uppercase text-xs tracking-widest">2. Penggunaan Layanan</h4>
                  </div>
                  <p>Anda bertanggung jawab penuh atas keamanan akun Google Anda, keakuratan data struk yang diunggah, serta keputusan keuangan yang diambil berdasarkan insight aplikasi.</p>
                </section>
                <section className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <Icon name="alert" className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-black uppercase text-xs tracking-widest">3. Batasan Tanggung Jawab</h4>
                  </div>
                  <p className="p-4 bg-white/5 rounded-xl italic border-l-2 border-indigo-500">"Layanan ini disediakan 'sebagaimana adanya' tanpa jaminan apapun."</p>
                  <p>Kami tidak menjamin akurasi 100% dari hasil ekstraksi AI dan tidak bertanggung jawab atas kerugian finansial akibat ketidaktelitian sistem.</p>
                </section>
              </div>
            )}

            <div className="pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
               <div className="text-center sm:text-left">
                  <h5 className="font-black text-white text-[10px] uppercase tracking-widest mb-1">Punya Pertanyaan?</h5>
                  <p className="text-[10px] text-slate-500 font-bold">Kami siap memberikan transparansi lebih lanjut.</p>
               </div>
               <a href={`mailto:${email}`} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all">Hubungi Pengembang</a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center bg-[#020617]"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!session) {
    return (
      <div className="relative min-h-screen bg-[#020617] flex flex-col overflow-x-hidden selection:bg-indigo-500/30 font-sans text-white">
        <div className="mesh-gradient opacity-50 animate-pulse"></div>
        
        {/* Navbar */}
        <nav className="container mx-auto px-8 py-10 flex justify-between items-center relative z-20">
          <div className="text-3xl font-black tracking-tighter uppercase">Flux<span className="text-indigo-500">.</span></div>
          <button onClick={() => signIn('google')} className="px-8 py-3 bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl font-bold hover:bg-white/10 transition-all text-sm tracking-widest uppercase">Launch App</button>
        </nav>

        {/* Hero */}
        <main className="container mx-auto px-8 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10 py-10">
          <div className="space-y-10 animate-reveal">
            <div className="inline-block px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black tracking-[0.3em] uppercase">Gemini 2.5 Evolution</div>
            <h1 className="text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight text-balance">Cerdaskan Alur Keuangan <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-pan">Lewat AI Vision.</span></h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-xl font-medium">Flux menggunakan Google Gemini untuk memindai struk dengan data terpusat, aman, dan tersinkronisasi di Google Drive Anda sendiri.</p>
            <button onClick={() => signIn('google')} className="group px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/30 transition-all flex items-center gap-4">
              Mulai Sekarang <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
          <div className="relative hidden lg:block animate-reveal [animation-delay:200ms]">
            <img src="/dashboard.png" className="relative rounded-[2.5rem] shadow-[2xl] border border-white/10 animate-float" alt="Dashboard Hub" />
          </div>
        </main>

        {/* Unified Knowledge Section */}
        <section className="container mx-auto px-8 py-40 relative z-10 border-t border-white/5">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              <div className="lg:col-span-1 space-y-6">
                 <h2 className="text-4xl font-black tracking-tighter">Cerdas & <span className="text-slate-600">Aman.</span></h2>
                 <p className="text-slate-500 font-bold leading-relaxed text-sm">Infrastruktur cloud Google memastikan data finansial Anda tetap pribadi, namun dapat diakses kapan saja.</p>
              </div>
              
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
                 {[
                    { i: "eye", t: "AI Vision Engine", d: "Gemini memahami struk belanja Anda untuk ekstraksi data super akurat." },
                    { i: "shield", t: "Double-Layer Privacy", d: "Enkripsi login Google ditambah penyimpanan eksklusif di Drive pribadi Anda." },
                    { i: "chart", t: "Visual Analytics", d: "Grafik pintar yang menganalisis tren pengeluaran bulanan secara otomatis." },
                    { i: "zap", t: "Real-time Sync", d: "Semua data tersinkronisasi instan ke seluruh perangkat melalui Google Cloud." }
                 ].map((feat, i) => (
                    <div key={i} className="space-y-4 animate-reveal" style={{ animationDelay: `${i*100}ms` }}>
                       <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                          <Icon name={feat.i} className="w-6 h-6 text-indigo-500" />
                       </div>
                       <h4 className="text-lg font-black tracking-tight">{feat.t}</h4>
                       <p className="text-slate-500 text-xs leading-relaxed font-bold">{feat.d}</p>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Modern SaaS Footer */}
        <footer className="container mx-auto px-8 py-16 relative z-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-12">
           <div className="flex flex-col items-center md:items-start gap-4">
              <div className="text-2xl font-black tracking-tighter uppercase">Flux<span className="text-indigo-500">.</span></div>
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">© 2026 Flux . All Rights Reserved.</p>
           </div>
           
           <div className="flex flex-wrap justify-center gap-10">
              <button onClick={() => setActiveModal('privacy')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">Privacy Policy</button>
              <button onClick={() => setActiveModal('terms')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">Terms of Service</button>
           </div>
        </footer>

        <LegalModal />
        
        {toast && (
            <div className="fixed bottom-10 right-10 z-[300] animate-toast">
                <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border font-black text-[10px] uppercase tracking-widest ${toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' : toast.type === 'warning' ? 'bg-yellow-950/90 border-yellow-500/50 text-yellow-200' : 'bg-slate-900/90 border-indigo-500/50 text-indigo-200 backdrop-blur-xl'}`}>
                    <span>{toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}</span>
                    {toast.message}
                </div>
            </div>
        )}
      </div>
    );
  }

  // --- Dashboard ---
  return (
    <div className="min-h-screen lg:h-screen bg-[#020617] text-white overflow-y-auto lg:overflow-hidden flex flex-col selection:bg-indigo-500/30 font-sans">
      <div className="mesh-gradient opacity-30"></div>
      
      {/* Top Budget Alert Warning */}
      {stats.budgetPercent >= 80 && (
          <div className={`w-full text-center py-1.5 text-[9px] font-black uppercase tracking-[0.3em] z-50 animate-pulse shadow-2xl ${stats.budgetPercent >= 100 ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'}`}>
             {stats.budgetPercent >= 100 ? 'ALARM: KUOTA ANGGARAN BULAN INI TELAH HABIS / TERLAMPAUI' : 'PERINGATAN: ANGGARAN BULAN INI TERSISA KURANG DARI 20%'}
          </div>
      )}

      <div className="max-w-[1800px] w-full mx-auto px-6 lg:px-10 py-4 flex flex-col lg:h-full lg:overflow-hidden">
        {/* Compact Header */}
        <header className="flex justify-between items-center mb-6 animate-reveal">
          <div className="flex items-center gap-10">
            <h1 className="text-xl font-black tracking-tighter">FLUX<span className="text-indigo-500 text-2xl">.</span></h1>
            <div className="w-px h-4 bg-white/10 hidden md:block"></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:block">Financial Control Center</p>
          </div>
          <div className="flex items-center gap-6">
             <button onClick={exportToCSV} className="text-[9px] font-black tracking-[0.2em] text-slate-500 hover:text-indigo-400 transition-colors uppercase">Export Ledger</button>
             <div className="w-px h-4 bg-white/10"></div>
             <div className="flex items-center gap-3">
                <img src={session.user.image} className="w-7 h-7 rounded-full ring-2 ring-indigo-500/20" alt="Avatar" />
                <span className="font-bold text-xs hidden lg:block text-slate-400">{session.user.name}</span>
             </div>
             <button onClick={() => signOut()} className="text-[9px] font-black text-slate-600 hover:text-red-400 tracking-widest uppercase transition-colors">Sign Out</button>
          </div>
        </header>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          
          {/* Sidebar (ACTION ZONE) */}
          <aside className="lg:col-span-3 xl:col-span-3 flex flex-col gap-6 overflow-y-auto pr-1 custom-scrollbar animate-reveal [animation-delay:100ms]">
             
             {/* Gemini Scanner Card */}
             <section className="glass p-6 space-y-5 border-indigo-500/10">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400/80">Gemini Vision</h3>
                   <div className="px-2 py-0.5 bg-indigo-500/10 rounded text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Powered</div>
                </div>
                
                <div onClick={() => fileInputRef.current.click()} className="relative group border-2 border-dashed border-white/5 rounded-2xl p-4 text-center cursor-pointer hover:border-indigo-500/50 transition-all bg-slate-950/20 overflow-hidden">
                    {preview ? <img src={preview} className="max-h-32 mx-auto rounded-lg shadow-xl" /> : <div className="py-4"><div className="text-3xl mb-2 opacity-20 group-hover:opacity-40 transition-opacity">📸</div><p className="text-slate-600 font-black text-[8px] tracking-[0.2em]">TOUCH TO SCAN RECEIPT</p></div>}
                    {scanning && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center">
                         <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                         <div className="text-[8px] font-black tracking-[0.2em] uppercase text-indigo-400">Processing...</div>
                      </div>
                    )}
                </div>
                <input type="file" hidden ref={fileInputRef} onChange={e => { const f=e.target.files[0]; if(f){setFile(f); setPreview(URL.createObjectURL(f));}}} />
                {file && !scanning && <button onClick={handleScan} className="w-full py-3.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 rounded-xl font-black text-[9px] tracking-[0.2em] uppercase transition-all">Submit to Gemini</button>}
             </section>

             {/* Ledger Form Card */}
             <section className="glass p-6 space-y-4">
                <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-500 mb-2">Record Transaction</h3>
                <div className="space-y-3">
                   <input className="form-input !py-3 !text-xs !bg-transparent border-white/5" value={formData.nama_toko} onChange={e => setFormData({...formData, nama_toko: e.target.value})} placeholder="Merchant Name" />
                   <div className="grid grid-cols-2 gap-3">
                      <select className="form-input !py-3 !text-xs !bg-transparent border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value})}>
                          {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0f172a] text-white">{c}</option>)}
                      </select>
                      <input className="form-input !py-3 !text-xs !bg-transparent border-white/5" value={formData.keperluan} onChange={e => setFormData({...formData, keperluan: e.target.value})} placeholder="Description" />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <input className="form-input !py-3 !text-xs !bg-transparent border-white/5" value={formData.total_harga} onChange={e => setFormData({...formData, total_harga: e.target.value})} placeholder="Amount (IDR)" />
                      <input type="date" className="form-input !py-3 !text-xs !bg-transparent border-white/5" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} />
                   </div>
                   <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-white/5 hover:bg-white text-white hover:text-black rounded-xl font-black text-[10px] tracking-[0.3em] uppercase transition-all shadow-lg">
                       {loading ? 'SYCHRONIZING...' : (editId ? 'Commit Edit' : 'Sync to Drive')}
                   </button>
                   {editId && <button onClick={() => {setEditId(null); setFormData(INITIAL_FORM);}} className="w-full py-2 text-slate-600 font-bold text-[9px] tracking-widest uppercase text-center">Cancel Edit</button>}
                </div>
             </section>

             {/* Dynamic Insights Card */}
             <section className="glass p-6 space-y-4">
                <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400">Smart Insights</h3>
                <div className="space-y-3">
                  {stats.insights.map((insight, idx) => (
                      <div key={idx} className="flex gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 items-start animate-reveal" style={{ animationDelay: `${idx * 100}ms` }}>
                          <span className="text-base leading-none">{insight.includes('DARURAT') ? '🚨' : insight.includes('PERINGATAN') ? '⚠️' : '💡'}</span>
                          <p className="text-[10px] font-bold text-slate-400 leading-relaxed tracking-tight">{insight.replace(/🚨|⚠️|✅|📊|💡/g, '')}</p>
                      </div>
                  ))}
                </div>
             </section>
          </aside>

          {/* Main Area (MONITORING ZONE) */}
          <main className="lg:col-span-9 xl:col-span-9 flex flex-col gap-6 lg:overflow-hidden">
             
             {/* Period Selector (Historical Reports Control) */}
             <section className="glass p-3 flex flex-wrap items-center justify-between gap-4 animate-reveal [animation-delay:100ms] border-indigo-500/10">
                <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                   <Icon name="chart" className="w-4 h-4 text-indigo-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Report Period</span>
                </div>
                <div className="flex gap-2">
                   <select 
                     className="bg-slate-950/60 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none hover:border-indigo-500/30 transition-all cursor-pointer"
                     value={viewMonth}
                     onChange={e => setViewMonth(parseInt(e.target.value))}
                   >
                     {monthNames.map((m, i) => <option key={m} value={i} className="bg-[#0f172a] text-white">{m}</option>)}
                   </select>
                   <select 
                     className="bg-slate-950/60 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none hover:border-indigo-500/30 transition-all cursor-pointer"
                     value={viewYear}
                     onChange={e => setViewYear(parseInt(e.target.value))}
                   >
                     {availableYears.map(y => <option key={y} value={y} className="bg-[#0f172a] text-white">{y}</option>)}
                   </select>
                </div>
             </section>

             {/* Compact Stats Bar */}
             <section className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-reveal [animation-delay:200ms]">
                <div className="glass p-5 border-white/[0.05] flex justify-between items-center group">
                   <div>
                      <p className="text-slate-500 font-black text-[8px] uppercase tracking-widest mb-1.5 opacity-60">Outflow: {monthNames[viewMonth]} {viewYear}</p>
                      <h2 className="text-2xl font-black text-indigo-400 tracking-tighter">{formatCurrency(stats.totalThisMonth)}</h2>
                   </div>
                   <div className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity">💸</div>
                </div>
                <div className="glass p-5 border-white/[0.05] flex justify-between items-center group">
                   <div>
                      <p className="text-slate-500 font-black text-[8px] uppercase tracking-widest mb-1.5 opacity-60">Archive Depth</p>
                      <h2 className="text-2xl font-black text-slate-200 tracking-tighter">{dataList.length} <span className="text-[9px] font-bold opacity-30 tracking-widest">ITEMS</span></h2>
                   </div>
                   <div className="text-2xl opacity-20 group-hover:opacity-100 transition-opacity">📦</div>
                </div>
                <div className="glass p-5 border-white/[0.05] cursor-pointer group hover:bg-white/[0.01]" onClick={() => setShowBudgetPrompt(true)}>
                   <div className="flex justify-between items-center mb-2">
                        <p className="text-slate-500 font-black text-[8px] uppercase tracking-widest opacity-60">Budget Utilization</p>
                        <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Adjust</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <h4 className="text-2xl font-black tracking-tighter">{Math.round(stats.budgetPercent)}%</h4>
                      <div className="flex-1 h-1 bg-slate-950 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${stats.budgetPercent > 90 ? 'bg-red-500' : (stats.budgetPercent > 70 ? 'bg-yellow-500' : 'bg-indigo-500')}`} style={{ width: `${stats.budgetPercent}%` }}></div>
                      </div>
                   </div>
                </div>
             </section>

             {/* Tabbed Analytics Card */}
             <section className="glass p-6 flex flex-col min-h-0 h-[320px] animate-reveal [animation-delay:300ms]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-500">Visual Intelligence</h3>
                  <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5">
                      {[
                          { id: 'daily', label: 'Trend Line' },
                          { id: 'monthly', label: 'Monthly Summary' },
                          { id: 'categories', label: 'Category Split' }
                      ].map(tab => (
                          <button key={tab.id} onClick={() => setActiveInsightTab(tab.id)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeInsightTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-400'}`}>{tab.label}</button>
                      ))}
                  </div>
                </div>
                
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      {activeInsightTab === 'daily' ? (
                          <LineChart data={stats.chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                              <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b'}} tickLine={false} axisLine={false} />
                              <YAxis tick={{fontSize: 9, fill: '#64748b'}} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} itemStyle={{ color: '#fff' }} />
                              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 4, fill: '#6366f1' }} strokeLinecap="round" />
                          </LineChart>
                      ) : activeInsightTab === 'monthly' ? (
                          <BarChart data={stats.barChartData.slice(-6)} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                              <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b'}} tickLine={false} axisLine={false} />
                              <YAxis tick={{fontSize: 9, fill: '#64748b'}} tickLine={false} axisLine={false} />
                              <Tooltip cursor={false} formatter={(value) => formatCurrency(value)} contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }} itemStyle={{ color: '#fff' }} />
                              <Bar dataKey="total" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                          </BarChart>
                      ) : (
                          <PieChart>
                              <Pie data={stats.pieChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={8} dataKey="value">
                                  {stats.pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="rgba(0,0,0,0)" />)}
                              </Pie>
                              <Tooltip 
                                 formatter={(value) => {
                                   const percentage = ((value / stats.totalAll) * 100).toFixed(1);
                                   return [`${formatCurrency(value)} (${percentage}%)`];
                                 }} 
                                 contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }} 
                                 itemStyle={{ color: '#fff' }}
                                />
                              <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '40px' }} />
                          </PieChart>
                      )}
                  </ResponsiveContainer>
                </div>
             </section>

             {/* Ledger Repository Card */}
             <section className="glass p-0 flex-1 flex flex-col overflow-hidden animate-reveal [animation-delay:400ms]">
                <div className="p-5 border-b border-white/[0.05] flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.01]">
                   <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                      Financial Ledger
                   </h3>
                   <div className="flex flex-1 w-full max-w-sm gap-2">
                        <input className="form-input !py-2.5 !px-4 !text-[10px] !bg-slate-950/60 border-none" placeholder="Search entries..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        <select className="form-input !py-2.5 !px-4 !w-auto !text-[10px] !bg-slate-950/60 border-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                            <option value="Semua">All Classes</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left table-auto">
                      <thead className="sticky top-0 bg-slate-900/40 backdrop-blur-2xl z-10 border-b border-white/5">
                        <tr className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                           <th className="py-4 px-8">Transaction Hub</th>
                           <th className="py-4">Timestamp</th>
                           <th className="py-4">Value</th>
                           <th className="py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {[...filteredData].reverse().map(item => (
                          <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                            <td className="py-5 px-8">
                               <div className="font-bold text-slate-100 text-sm mb-0.5">{item.nama_toko || "Store"}</div>
                               <div className="text-[9px] font-bold tracking-tight text-slate-500 flex items-center gap-2 italic">
                                  <span>{item.kategori}</span>
                                  <span className="opacity-20">•</span>
                                  <span>{item.keperluan}</span>
                                </div>
                            </td>
                            <td className="py-5 font-bold text-slate-500 text-[10px] tabular-nums tracking-widest">{item.tanggal}</td>
                            <td className="py-5 font-black text-sm text-indigo-400 tracking-tighter tabular-nums">{formatCurrency(item.total_harga)}</td>
                            <td className="py-5">
                               <div className="flex justify-center gap-5 opacity-0 group-hover:opacity-100 transition-all">
                                  {item.imageUrl && <a href={item.imageUrl} target="_blank" className="text-sm grayscale opacity-50 hover:grayscale-0 hover:opacity-100" title="Source">📎</a>}
                                  <button onClick={() => { setEditId(item.id); setFormData(item); }} className="text-sm opacity-50 hover:opacity-100">✏️</button>
                                  <button onClick={() => handleDelete(item.id)} className="text-sm opacity-20 hover:opacity-100 text-red-500">🗑️</button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </section>
          </main>
        </div>
      </div>
      
      {showBudgetPrompt && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[100] flex items-center justify-center p-6">
              <div className="glass p-10 max-w-sm w-full animate-reveal border-indigo-500/30">
                  <h3 className="text-xl font-black mb-3 tracking-tighter uppercase">Set Budget Goal</h3>
                  <p className="text-[10px] text-slate-500 mb-8 leading-relaxed font-bold uppercase tracking-widest">Flux Intelligence will provide visual alerts when you reach 80% and 100% of this target.</p>
                  <label className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3 block">Monthly Limit (IDR)</label>
                  <input type="number" className="form-input mb-8 !py-5 text-2xl font-black text-center text-white bg-transparent border-white/10" value={budgetLimit} onChange={e => setBudgetLimit(parseInt(e.target.value))} />
                  <button onClick={() => { localStorage.setItem('flux_budget', budgetLimit); setShowBudgetPrompt(false); showToast("Target Anggaran diperbarui!"); }} className="btn-flux btn-flux-primary !py-5 w-full">Commit Target</button>
              </div>
          </div>
      )}

      {/* Global Notification system */}
      {toast && (
          <div className="fixed bottom-10 right-10 z-[100] animate-toast">
              <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border font-black text-[10px] uppercase tracking-widest ${toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' : toast.type === 'warning' ? 'bg-yellow-950/90 border-yellow-500/50 text-yellow-200' : 'bg-slate-900/90 border-indigo-500/50 text-indigo-200 backdrop-blur-xl'}`}>
                  <span>{toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}</span>
                  {toast.message}
              </div>
          </div>
      )}

      <LegalModal />
    </div>
  );
}
