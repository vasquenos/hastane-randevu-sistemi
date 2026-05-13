import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

const SLIDER_IMAGES = ["/images/hastane1.jpg", "/images/hastane2.jpg", "/images/hastane3.jpg"];
const ANA_SAATLER = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

// --- YARDIMCI VALİDASYON FONKSİYONLARI ---

const enforceOnlyNumbers = (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
};

const enforceOnlyLetters = (e) => {
  e.target.value = e.target.value.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '');
};

const validateTCKN = (tc) => {
  if (!tc || tc.length !== 11 || tc[0] === '0') return false;
  
  let oddSum = 0;   
  let evenSum = 0;  
  
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(tc[i]);
    if (i % 2 === 0) oddSum += digit;
    else evenSum += digit;
  }
  
  const digit10 = (oddSum * 7 - evenSum) % 10;
  const digit11 = (oddSum + evenSum + digit10) % 10;
  
  if (digit10 !== parseInt(tc[9]) || digit11 !== parseInt(tc[10])) return false;
  
  return true;
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  const [kayitForm, setKayitForm] = useState({ ad: "", soyad: "", tc: "", telefon: "", dogum: "", cinsiyet: "", sifre: "" });
  const [adminForm, setAdminForm] = useState({ kullaniciAdi: "", sifre: "" });

  const [doktorlar, setDoktorlar] = useState([]);
  const [randevuForm, setRandevuForm] = useState({ tc: "", doktorId: "", tarih: "", saat: "" });
  const [doluSaatler, setDoluSaatler] = useState([]);
  const [expandedHour, setExpandedHour] = useState(null);

  const [girisYapanHasta, setGirisYapanHasta] = useState(null);
  const [hastaGirisForm, setHastaGirisForm] = useState({ tc: "", sifre: "" });
  const [benimRandevularim, setBenimRandevularim] = useState([]);

  const [counts, setCounts] = useState({ hastalar: 0, doktorlar: 0, oduller: 0 });

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminView, setAdminView] = useState("dashboard");
  const [bolumler, setBolumler] = useState([]);
  const [tumRandevular, setTumRandevular] = useState([]);
  const [yeniDoktor, setYeniDoktor] = useState({ ad: "", soyad: "", unvan: "", cinsiyet: "", bolumId: "" });

  const [toast, setToast] = useState({ visible: false, message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: "", type: "" });
    }, 3000); 
  };
  
  const prevRandevuRef = useRef({ doktorId: "", tarih: "" });

  // --- USE EFFECTS ---

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/doktorlar`)
      .then(res => setDoktorlar(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.log(err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev === SLIDER_IMAGES.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const { doktorId, tarih } = randevuForm;
    const prev = prevRandevuRef.current;

    if (doktorId && tarih && (doktorId !== prev.doktorId || tarih !== prev.tarih)) {
      prevRandevuRef.current = { doktorId, tarih };
      axios.get(`${process.env.REACT_APP_API_URL}/dolu-saatler?doktorId=${doktorId}&tarih=${tarih}`)
        .then(res => {
          setDoluSaatler(Array.isArray(res.data) ? res.data : []);
          setRandevuForm(f => ({ ...f, saat: "" }));
          setExpandedHour(null);
        })
        .catch(err => console.log("Saatler çekilemedi:", err));
    } else if (!doktorId || !tarih) {
      setDoluSaatler([]);
    }
  }, [randevuForm.doktorId, randevuForm.tarih]);

  useEffect(() => {
    let h = 0, d = 0, o = 0;
    const interval = setInterval(() => {
      if (h < 1000) h += 20;
      if (d < 50) d += 1;
      if (o < 25) o += 1;
      setCounts({ hastalar: h, doktorlar: d, oduller: o });
      if (h >= 1000 && d >= 50 && o >= 25) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const kayitliHasta = localStorage.getItem("hasta");
    const hastaToken = localStorage.getItem("hastaToken");
    
    if (kayitliHasta && hastaToken) {
      const parsedHasta = JSON.parse(kayitliHasta);
      setGirisYapanHasta(parsedHasta);
      setRandevuForm(f => ({ ...f, tc: parsedHasta.TCno }));
      fetchRandevularim(parsedHasta.HastaID);
    }

    const adminToken = localStorage.getItem("adminToken");
    if (adminToken) {
      setIsAdminLoggedIn(true);
    }
  }, []);

  const handleTabChange = (key) => {
    if (key === "randevu" && !girisYapanHasta) {
      showToast("Randevu oluşturmak için önce hasta girişi yapmalısınız.", "error");
      setActiveTab("randevularim"); 
    } else {
      setActiveTab(key);
    }
  };

  // --- ADMİN VERİ FONKSİYONLARI ---

  const fetchBolumler = async () => {
    try { 
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/bolumler`); 
      setBolumler(Array.isArray(res.data) ? res.data : []); 
    } catch {}
  };

  const fetchTumRandevular = async () => {
    setIsLoading(true); 
    try { 
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/tum-randevular`); 
      setTumRandevular(Array.isArray(res.data) ? res.data : []); 
    } catch (err) { 
    } finally {
      setIsLoading(false); 
    }
  };

  const refetchDoktorlar = async () => {
    try { 
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/doktorlar`); 
      setDoktorlar(Array.isArray(res.data) ? res.data : []); 
    } catch {}
  };

  // --- ADMİN İŞLEM FONKSİYONLARI ---

  const handleDoktorEkle = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/doktor-ekle`, yeniDoktor);
      showToast(res.data.mesaj, "success");
      setYeniDoktor({ ad: "", soyad: "", unvan: "", cinsiyet: "", bolumId: "" });
      refetchDoktorlar();
    } catch (err) { 
      showToast(err.response?.data?.mesaj || "Hata oluştu.", "error"); 
    }
  };

  const handleDoktorSil = async (id) => {
    if (!window.confirm("Bu doktoru sistemden silmek istediğinize emin misiniz?")) return;
    try {
      const res = await axios.delete(`${process.env.REACT_APP_API_URL}/doktor-sil/${id}`);
      showToast(res.data.mesaj, "success");
      refetchDoktorlar();
    } catch (err) { 
      showToast(err.response?.data?.mesaj || "Hata oluştu.", "error"); 
    }
  };

  const handleAdminRandevuGuncelle = async (id, durum) => {
    try {
      const res = await axios.put(`${process.env.REACT_APP_API_URL}/admin-randevu-durum`, { randevuId: id, yeniDurum: durum });
      showToast(res.data.mesaj, "success");
      fetchTumRandevular(); 
    } catch (err) { 
      showToast("Hata oluştu.", "error"); 
    }
  };

  // --- FORM SUBMIT FONKSİYONLARI ---

 const handleAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin-giris`, adminForm);
      if (response.data.basarili) {
        showToast(response.data.mesaj, "success");
        setAdminForm({ kullaniciAdi: "", sifre: "" });
        setIsAdminLoggedIn(true); 
        localStorage.setItem("adminToken", response.data.token);
      }
    } catch (error) {
      showToast(error.response?.data?.mesaj || "Hatalı kullanıcı adı veya şifre!", "error");
    }
  };

  const handleKayitSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateTCKN(kayitForm.tc)) {
      showToast("Geçersiz T.C. Kimlik Numarası! Lütfen kontrol ediniz.", "error");
      return;
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/kayit`, kayitForm);
      showToast(response.data.mesaj, "success"); 
      setKayitForm({ ad: "", soyad: "", tc: "", telefon: "", dogum: "", cinsiyet: "", sifre: "" }); 
      setActiveTab("randevularim"); 
    } catch (error) {
      showToast(error.response?.data?.mesaj || "Kayıt sırasında bir hata oluştu.", "error"); 
    }
  };

  const handleRandevuSubmit = async (e) => {
    e.preventDefault();
    
    if (!girisYapanHasta) {
      showToast("Randevu almak için giriş yapmalısınız.", "error");
      setActiveTab("randevularim");
      return;
    }

    const secilenSaat = randevuForm.saat;
    if (secilenSaat < "09:00" || secilenSaat > "16:50") {
      showToast("Lütfen mesai saatleri içerisinde (09:00 - 16:50) bir saat seçiniz.", "error");
      return;
    }
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/randevu`, randevuForm);
      showToast(response.data.mesaj, "success");
      setRandevuForm(f => ({ ...f, doktorId: "", tarih: "", saat: "" }));
      setDoluSaatler([...doluSaatler, secilenSaat]); 
    } catch (error) {
      showToast(error.response?.data?.mesaj || "Randevu alınırken bir hata oluştu.", "error");
    }
  };

  const handleHastaGirisSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/hasta-giris`, hastaGirisForm);
      if (response.data.basarili) {
        const hastaVerisi = response.data.hasta;
        setGirisYapanHasta(hastaVerisi);
        localStorage.setItem("hastaToken", response.data.token);
        localStorage.setItem("hasta", JSON.stringify(hastaVerisi));
        
        setRandevuForm(f => ({ ...f, tc: hastaVerisi.TCno }));
        fetchRandevularim(hastaVerisi.HastaID);
        
        setHastaGirisForm({ tc: "", sifre: "" });
        showToast(response.data.mesaj, "success"); 
        setActiveTab("home"); 
      }
    } catch (error) {
      showToast(error.response?.data?.mesaj || "Giriş yapılamadı. T.C. veya şifre hatalı.", "error"); 
    }
  };

  const fetchRandevularim = async (hastaId) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/randevularim?hastaId=${hastaId}`);
      setBenimRandevularim(Array.isArray(res.data) ? res.data : []);
    } catch (err) { 
      console.log("Randevular çekilemedi", err); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleDurumDegistir = async (randevuId, yeniDurum) => {
    const islem = yeniDurum === "Onaylandi" ? "onaylamak" : "iptal etmek";
    if (!window.confirm(`Bu randevuyu ${islem} istediğinize emin misiniz?`)) return;

    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/randevu-durum`, {
        randevuId: randevuId,
        yeniDurum: yeniDurum,
        hastaId: girisYapanHasta.HastaID
      });
      showToast(response.data.mesaj, "success");
      fetchRandevularim(girisYapanHasta.HastaID); 
    } catch (err) {
      showToast("İşlem başarısız oldu.", "error");
    }
  };

  const handleHastaCikis = () => {
    setGirisYapanHasta(null); 
    setBenimRandevularim([]);
    setRandevuForm({ tc: "", doktorId: "", tarih: "", saat: "" });
    localStorage.removeItem("hastaToken"); 
    localStorage.removeItem("hasta"); 
    showToast("Başarıyla çıkış yapıldı.", "success");
    setActiveTab("home");
  };

  // --- SAAT YARDIMCI FONKSİYONLARI ---

  const getAltSaatler = (anaSaat) => {
    const h = anaSaat.split(":")[0];
    return [`${h}:00`, `${h}:10`, `${h}:20`, `${h}:30`, `${h}:40`, `${h}:50`];
  };

  const isAnaSaatTamamenDolu = (anaSaat) =>
    getAltSaatler(anaSaat).every(alt => (doluSaatler || []).includes(alt));

  
  return (
    <div>
      {/* --- ÖZEL BİLDİRİM BALONCUĞU --- */}
      {toast.visible && (
        <div className={`custom-toast toast-${toast.type} animate-slide-down`}>
          <span className="toast-icon">
            {toast.type === 'success' ? '✅' : '⚠️'}
          </span>
          <span className="toast-text">{toast.message}</span>
        </div>
      )}

      {/* --- GLOBAL YÜKLENİYOR EKRANI --- */}
      {isLoading && (
        <div className="global-loader">
          <div className="spinner"></div>
          <p>Veriler işleniyor, lütfen bekleyiniz...</p>
        </div>
      )}

      {/* NAVBAR (DİREKT JSX OLARAK GÖMÜLDÜ) */}
      <nav className="navbar">
        <div className="logo" onClick={() => handleTabChange("home")} style={{cursor: 'pointer'}}>
          Hastane Randevu
        </div>
        <div className="nav-links">
          {[
            { key: "home", label: "Ana Sayfa" },
            { key: "hakkimizda", label: "Hakkımızda" },
            { key: "randevu", label: "Randevu Al" },
            { key: "kayit", label: "Hasta Kaydı" },
            { key: "randevularim", label: girisYapanHasta ? "Panelim" : "Giriş Yap" },
            { key: "admin", label: "🔒 Admin" },
          ].map(({ key, label }) => (
            <button key={key} className={`nav-btn ${activeTab === key ? "active" : ""}`} onClick={() => handleTabChange(key)}>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ANA SAYFA */}
      {activeTab === "home" && (
        <div className="animate-fade-in">
          <div className="hero-section">
            {/* YUMUŞAK GEÇİŞ İÇİN SLIDER RESİMLERİ KATMANLARI */}
            {SLIDER_IMAGES.map((img, index) => (
              <div
                key={index}
                className="slider-bg"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${img})`,
                  opacity: currentImageIndex === index ? 1 : 0
                }}
              />
            ))}
            <div className="hero-content">
              <h1>Sağlığınız İçin Yenilikçi Çözümler</h1>
              <p>Alanında uzman doktorlarımız ve modern altyapımızla güvenilir sağlık hizmeti sunuyoruz.</p>
              {!girisYapanHasta && (
                  <button className="submit-btn" style={{width: 'auto', marginTop: '20px', padding: '15px 30px'}} onClick={() => handleTabChange("kayit")}>Hemen Kayıt Ol</button>
              )}
            </div>
          </div>

          <div id="stats-section" className="stats-container">
            <div className="stat-item"><h2>{counts.hastalar}+</h2><p>Hastalarımız</p></div>
            <div className="stat-item"><h2>{counts.doktorlar}+</h2><p>Doktorlarımız</p></div>
            <div className="stat-item"><h2>{counts.oduller}+</h2><p>Ödüllerimiz</p></div>
          </div>

          <div className="doctor-showcase">
            <h2 className="section-title">Alanında Uzman Doktorlarımız</h2>
            <div className="doctor-grid">
              {(doktorlar || []).map(dr => (
                <div key={dr.DoktorID} className="doctor-card">
                  <div className="dr-image">
                    <img
                      src={`/images/${String(dr.Cinsiyet).trim().toUpperCase() === "E" ? "erkek.png" : "kadin.png"}`}
                      alt="Doktor"
                    />
                  </div>
                  <div className="dr-info">
                    <h4>{dr.Unvan} {dr.DAd} {dr.DSoyad}</h4>
                    <span>{dr.BolumAdi}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HAKKIMIZDA */}
      {activeTab === "hakkimizda" && (
        <div className="container animate-fade-in">
          <div className="section-card">
            <h2>Hakkımızda</h2>
            <p>Hastane Randevu Sistemi olarak, hastalarımızın tedavi süreçlerini hızlandırmak ve randevu karmaşasını ortadan kaldırmak için en güncel teknolojileri kullanıyoruz. Uzman doktor kadromuz ve tam donanımlı hastanemizle 7/24 hizmetinizdeyiz. Sağlığınız bizim için değerlidir.</p>
          </div>
        </div>
      )}

      {/* HASTA KAYDI */}
      {activeTab === "kayit" && (
        <div className="container animate-fade-in">
          <div className="section-card">
            <h2>Yeni Hasta Kaydı</h2>
            <p style={{color: '#666', marginBottom: '20px'}}>Sisteme kayıt olarak anında randevu alabilirsiniz.</p>
            <form onSubmit={handleKayitSubmit}>
              <div style={{ display: "flex", gap: "20px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Ad</label>
                  <input type="text" value={kayitForm.ad} onInput={enforceOnlyLetters} onChange={e => setKayitForm({ ...kayitForm, ad: e.target.value })} placeholder="Adınız" required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Soyad</label>
                  <input type="text" value={kayitForm.soyad} onInput={enforceOnlyLetters} onChange={e => setKayitForm({ ...kayitForm, soyad: e.target.value })} placeholder="Soyadınız" required />
                </div>
              </div>
              <div className="form-group">
                <label>T.C. KİMLİK NO (11 Hane Zorunlu)</label>
                <input type="text" maxLength="11" pattern="\d{11}" title="T.C. Kimlik Numarası 11 haneli olmalıdır." value={kayitForm.tc} onInput={enforceOnlyNumbers} onChange={e => setKayitForm({ ...kayitForm, tc: e.target.value })} placeholder="12345678901" required />
              </div>
              <div className="form-group">
                <label>Telefon (05xx...)</label>
                <input type="text" maxLength="11" value={kayitForm.telefon} onInput={enforceOnlyNumbers} onChange={e => setKayitForm({ ...kayitForm, telefon: e.target.value })} placeholder="05XX XXX XX XX" required />
              </div>
              <div style={{ display: "flex", gap: "20px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>DOĞUM TARİHİ</label>
                  <input type="date" max={getTodayDate()} value={kayitForm.dogum} onChange={e => setKayitForm({ ...kayitForm, dogum: e.target.value })} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>CİNSİYET</label>
                  <select value={kayitForm.cinsiyet} onChange={e => setKayitForm({ ...kayitForm, cinsiyet: e.target.value })} required>
                      <option value="">Seçiniz</option>
                      <option value="Erkek">Erkek</option>
                      <option value="Kadin">Kadın</option>
                    </select>
                </div>
              </div>
              <div className="form-group">
                <label>ŞİFRE BELİRLEYİN (Min. 6 Karakter)</label>
                <input type="password" minLength="6" value={kayitForm.sifre} onChange={e => setKayitForm({ ...kayitForm, sifre: e.target.value })} required />
              </div>
              <button type="submit" className="submit-btn">Kayıt İşlemini Tamamla</button>
            </form>
          </div>
        </div>
      )}

      {/* RANDEVU AL */}
      {activeTab === "randevu" && girisYapanHasta && (
        <div className="container animate-fade-in">
          <div className="section-card">
            <h2>Randevu Oluştur</h2>
            <form onSubmit={handleRandevuSubmit}>
              <div className="form-group">
                <label>T.C. KİMLİK NUMARASI</label>
                <input type="text" value={randevuForm.tc} readOnly style={{backgroundColor: '#e9ecef', cursor: 'not-allowed'}} />
              </div>
              <div className="form-group">
                <label>BÖLÜM ve DOKTOR SEÇİMİ</label>
                <select value={randevuForm.doktorId} onChange={e => setRandevuForm({ ...randevuForm, doktorId: e.target.value })} required>
                  <option value="">Doktor Seçiniz...</option>
                  {(doktorlar || []).map(d => (
                    <option key={d.DoktorID} value={d.DoktorID}>{d.BolumAdi} - {d.Unvan} {d.DAd} {d.DSoyad}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>RANDEVU TARİHİ</label>
                <input type="date" min={getTodayDate()} value={randevuForm.tarih} onChange={e => setRandevuForm({ ...randevuForm, tarih: e.target.value })} required />
              </div>

              {randevuForm.doktorId && randevuForm.tarih && (
                <div className="form-group">
                  <label>Randevu Saati Seçin (10'ar Dakikalık Periyotlar)</label>
                  <div className="time-grid-main">
                    {ANA_SAATLER.map(anaSaat => {
                      const hepsiDoluMu = isAnaSaatTamamenDolu(anaSaat);
                      const isExpanded = expandedHour === anaSaat;
                      return (
                        <div key={anaSaat} className="time-block">
                          <button
                            type="button"
                            className={`time-slot-main ${hepsiDoluMu ? "disabled" : ""} ${isExpanded ? "active" : ""}`}
                            onClick={() => { if (!hepsiDoluMu) setExpandedHour(isExpanded ? null : anaSaat); }}
                            disabled={hepsiDoluMu}
                          >
                            {anaSaat} {hepsiDoluMu ? "(Dolu)" : "▼"}
                          </button>
                          <div className={`sub-slots-container ${isExpanded ? "open" : ""}`}>
                            {getAltSaatler(anaSaat).map(altSaat => {
                              const altDolu = (doluSaatler || []).includes(altSaat);
                              const altSecili = randevuForm.saat === altSaat;
                              return (
                                <button
                                  type="button"
                                  key={altSaat}
                                  className={`time-slot-sub ${altDolu ? "disabled" : ""} ${altSecili ? "selected" : ""}`}
                                  onClick={() => { if (!altDolu) setRandevuForm({ ...randevuForm, saat: altSaat }); }}
                                  disabled={altDolu}
                                >
                                  {altSaat}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <button type="submit" className="submit-btn" disabled={!randevuForm.saat}>Randevuyu Onayla ve Kaydet</button>
            </form>
          </div>
        </div>
      )}

      {/* RANDEVULARIM / HASTA GİRİŞİ */}
      {activeTab === "randevularim" && (
        <div className="container animate-fade-in">
          <div className="section-card">
            {!girisYapanHasta ? (
              <div style={{ maxWidth: "400px", margin: "0 auto" }}>
                <h2>Hasta Girişi</h2>
                <p style={{ marginBottom: "20px", color: "#666" }}>Randevularınızı yönetmek için T.C. Kimlik numaranız ve şifrenizle giriş yapın.</p>
                <form onSubmit={handleHastaGirisSubmit}>
                  <div className="form-group">
                    <label>T.C. KİMLİK NUMARANIZ</label>
                    <input type="text" maxLength="11" value={hastaGirisForm.tc} onInput={enforceOnlyNumbers} onChange={e => setHastaGirisForm({ ...hastaGirisForm, tc: e.target.value })} placeholder="11 Haneli TC No" required />
                  </div>
                  <div className="form-group">
                    <label>ŞİFRENİZ</label>
                    <input type="password" value={hastaGirisForm.sifre} onChange={e => setHastaGirisForm({ ...hastaGirisForm, sifre: e.target.value })} placeholder="Şifrenizi girin" required />
                  </div>
                  <button type="submit" className="submit-btn">Sisteme Giriş Yap</button>
                  <p style={{marginTop: '15px', textAlign: 'center', color: '#666'}}>Hesabınız yok mu? <button type="button" className="text-btn" onClick={() => handleTabChange("kayit")}>Hemen kayıt olun.</button></p>
                </form>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #280f42", paddingBottom: "10px", marginBottom: "20px" }}>
                  <h2 style={{ border: "none", margin: 0, padding: 0 }}>Hoş Geldiniz, {girisYapanHasta.HastaAd} {girisYapanHasta.HastaSoyad}</h2>
                 <button onClick={handleHastaCikis} className="nav-btn cancel-btn" style={{ backgroundColor: "#dc3545", color: 'white' }}>Güvenli Çıkış</button>
                </div>
                
                <h3 style={{marginBottom: '15px'}}>Randevularım</h3>

                {benimRandevularim.length === 0 ? (
                  <p>Henüz alınmış bir randevunuz bulunmamaktadır. <button type="button" className="text-btn" onClick={() => handleTabChange("randevu")}>Hemen randevu alın.</button></p>
                ) : (
                  <div className="appointments-list">
                    {(benimRandevularim || []).map(randevu => (
                      <div key={randevu.RandevuID} className="appointment-card">
                        <div className="appt-info">
                          <h3>{randevu.BolumAdi} - {randevu.Unvan} {randevu.DAd} {randevu.DSoyad}</h3>
                          <p>
                            <strong>Tarih:</strong> {new Date(randevu.RandevuTarihi).toLocaleDateString("tr-TR")} | <strong>Saat:</strong> {randevu.RandevuSaati.substring(0, 5)}
                          </p>
                        </div>
                        <div className="appt-actions">
                          <span className={`status-badge status-${randevu.Durum.toLowerCase()}`}>{randevu.Durum}</span>
                          {randevu.Durum === "Bekliyor" && (
                            <div className="action-buttons">
                              <button className="btn-approve" onClick={() => handleDurumDegistir(randevu.RandevuID, "Onaylandi")}>✔ Onayla</button>
                              <button className="btn-cancel" onClick={() => handleDurumDegistir(randevu.RandevuID, "Iptal")}>✖ İptal Et</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
        
      {/* ADMİN */}
      {activeTab === "admin" && (
        <div className="animate-fade-in">
          {!isAdminLoggedIn ? (
            <div className="admin-login-wrapper">
              <div className="admin-login-card">
                <div className="admin-header">
                  <span className="admin-icon">🔒</span>
                  <h2>Yönetici Paneli Girişi</h2>
                  <p>Sistem yönetimi için yetkili kullanıcı adı ve şifrenizi giriniz.</p>
                </div>
                <form onSubmit={handleAdminSubmit} className="admin-form">
                  <div className="form-group">
                    <label>Kullanıcı Adı</label>
                    <input type="text" value={adminForm.kullaniciAdi} onChange={e => setAdminForm({ ...adminForm, kullaniciAdi: e.target.value })} placeholder="Kullanıcı adınız" required />
                  </div>
                  <div className="form-group">
                    <label>Şifre</label>
                    <input type="password" value={adminForm.sifre} onChange={e => setAdminForm({ ...adminForm, sifre: e.target.value })} placeholder="••••••••" required />
                  </div>
                  <button type="submit" className="submit-btn admin-submit-btn">Panele Giriş Yap</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="container animate-fade-in" style={{ maxWidth: "1000px", marginTop: "60px" }}>
              {/* DASHBOARD */}
              {adminView === "dashboard" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", paddingBottom: "20px", borderBottom: "2px solid #eee" }}>
                    <h2 style={{ fontSize: "32px", color: "#111", margin: 0, border: "none" }}>Yönetici Kontrol Paneli</h2>
                    <button onClick={() => { 
                      setIsAdminLoggedIn(false); 
                      setAdminView("dashboard"); 
                      localStorage.removeItem("adminToken"); 
                      showToast("Admin çıkışı yapıldı.", "success");
                    }} style={{ background: "#dc3545", color: "white", border: "none", padding: "10px 20px", borderRadius: "10px", cursor: "pointer" }}>
                      Güvenli Çıkış
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                    <div className="section-card" style={{ textAlign: "center", padding: "40px" }}>
                      <h1 style={{ fontSize: "48px", margin: "0 0 15px 0" }}>👨‍⚕️</h1>
                      <h3 style={{ fontSize: "22px", color: "#111", marginBottom: "10px" }}>Doktor Yönetimi</h3>
                      <p style={{ color: "#666", marginBottom: "25px" }}>Sisteme yeni doktor ekleyin veya mevcut doktorları yönetin.</p>
                      <button onClick={() => setAdminView("doktorlar")} className="submit-btn admin-submit-btn">Doktorları Yönet</button>
                    </div>
                    <div className="section-card" style={{ textAlign: "center", padding: "40px" }}>
                      <h1 style={{ fontSize: "48px", margin: "0 0 15px 0" }}>📅</h1>
                      <h3 style={{ fontSize: "22px", color: "#111", marginBottom: "10px" }}>Randevu İşlemleri</h3>
                      <p style={{ color: "#666", marginBottom: "25px" }}>Sistemdeki tüm randevuları görüntüleyin ve durumlarını yönetin.</p>
                      <button onClick={() => setAdminView("randevular")} className="submit-btn admin-submit-btn">Randevuları Görüntüle</button>
                    </div>
                  </div>
                </div>
              )}

              {/* DOKTOR YÖNETİMİ */}
              {adminView === "doktorlar" && (
                <div className="animate-fade-in">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ color: "#111", margin: 0 }}>Doktor Yönetimi</h2>
                    <button onClick={() => setAdminView("dashboard")} className="btn-secondary" style={{ color: "#111", border: "2px solid #111", borderRadius: "10px" }}>← Panele Dön</button>
                  </div>
                  <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
                    <div className="section-card" style={{ flex: "1", minWidth: "300px" }}>
                      <h3>Yeni Doktor Ekle</h3>
                      <form onSubmit={handleDoktorEkle}>
                        <div className="form-group">
                            <label>Ad</label>
                            <input type="text" value={yeniDoktor.ad} onInput={enforceOnlyLetters} onChange={e => setYeniDoktor({ ...yeniDoktor, ad: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Soyad</label>
                            <input type="text" value={yeniDoktor.soyad} onInput={enforceOnlyLetters} onChange={e => setYeniDoktor({ ...yeniDoktor, soyad: e.target.value })} required />
                        </div>
                        <div style={{ display: "flex", gap: "15px" }}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label>Ünvan</label>
                            <input type="text" placeholder="Örn: Prof. Dr." pattern=".{2,}" title="Minimum 2 karakter" value={yeniDoktor.unvan} onChange={e => setYeniDoktor({ ...yeniDoktor, unvan: e.target.value })} required />
                           </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label>Cinsiyet</label>
                            <select value={yeniDoktor.cinsiyet} onChange={e => setYeniDoktor({ ...yeniDoktor, cinsiyet: e.target.value })} required>
                              <option value="">Seçiniz</option>
                              <option value="E">Erkek</option>
                              <option value="K">Kadın</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Bölüm</label>
                          <select value={yeniDoktor.bolumId} onChange={e => setYeniDoktor({ ...yeniDoktor, bolumId: e.target.value })} onClick={fetchBolumler} required>
                            <option value="">Önce tıklayıp bölüm seçiniz...</option>
                            {(bolumler || []).map(b => <option key={b.BolumID} value={b.BolumID}>{b.BolumAdi}</option>)}
                          </select>
                        </div>
                        <button type="submit" className="submit-btn admin-submit-btn">Doktoru Sisteme Ekle</button>
                      </form>
                    </div>
                    <div className="section-card" style={{ flex: "1.5", minWidth: "350px" }}>
                      <h3>Mevcut Doktorlar ({doktorlar.length})</h3>
                      <div className="appointments-list">
                        {(doktorlar || []).map(dr => (
                          <div key={dr.DoktorID} className="appointment-card" style={{ borderLeftColor: "#111" }}>
                            <div className="appt-info">
                              <h3 style={{ margin: 0, color: "#111" }}>{dr.Unvan} {dr.DAd} {dr.DSoyad}</h3>
                              <p>{dr.BolumAdi}</p>
                            </div>
                            <button onClick={() => handleDoktorSil(dr.DoktorID)} className="btn-cancel" style={{ padding: "8px 12px" }}>✖ Sil</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RANDEVU YÖNETİMİ */}
              {adminView === "randevular" && (
                <div className="animate-fade-in">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h2 style={{ color: "#111", margin: 0 }}>Sistemdeki Tüm Randevular</h2>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={fetchTumRandevular} className="submit-btn" style={{ margin: 0, padding: "10px 20px", width: "auto" }}>🔄 Verileri Yenile</button>
                      <button onClick={() => setAdminView("dashboard")} className="btn-secondary" style={{ color: "#111", border: "2px solid #111", borderRadius: "10px" }}>← Panele Dön</button>
                    </div>
                  </div>
                  <div className="section-card">
                    {tumRandevular.length === 0 ? (
                      <p>Verileri çekmek için Yenile butonuna basın veya sistemde aktif randevu bulunmamaktadır.</p>
                    ) : (
                      <div className="appointments-list">
                        {(tumRandevular || []).map(r => (
                          <div key={r.RandevuID} className="appointment-card" style={{ borderLeftColor: r.Durum === "Bekliyor" ? "#ffc107" : r.Durum === "Onaylandi" ? "#28a745" : "#dc3545" }}>
                            <div className="appt-info" style={{ flex: 1 }}>
                              <h3 style={{ color: "#111", fontSize: "16px" }}>🧑 Hasta: {r.HAd} {r.HSoyad} (TC: {r.TCno})</h3>
                              <p style={{ margin: "5px 0" }}>👨‍⚕️ Doktor: {r.Unvan} {r.DAd} {r.DSoyad} - {r.BolumAdi}</p>
                              <p style={{ fontWeight: "bold" }}>📅 {new Date(r.RandevuTarihi).toLocaleDateString("tr-TR")} | ⏰ {r.RandevuSaati.substring(0, 5)}</p>
                            </div>
                            <div className="appt-actions" style={{ alignItems: "center", gap: "15px", flexDirection: "row" }}>
                              <span className={`status-badge status-${r.Durum.toLowerCase()}`}>{r.Durum}</span>
                              {r.Durum === "Bekliyor" && (
                                <div style={{ display: "flex", gap: "5px" }}>
                                  <button onClick={() => handleAdminRandevuGuncelle(r.RandevuID, "Onaylandi")} className="btn-approve">✔ Onayla</button>
                                  <button onClick={() => handleAdminRandevuGuncelle(r.RandevuID, "Iptal")} className="btn-cancel">✖ İptal</button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* FOOTER (DİREKT JSX OLARAK GÖMÜLDÜ - ANİMASYON KALDIRILDI) */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section brand">
            <h2>Hastane Randevu</h2>
            <p>Modern altyapımız ve uzman kadromuzla sağlığınız için en yenilikçi çözümleri sunuyoruz. Saniyeler içinde randevunuzu alın, sağlığınızı ertelemeyin.</p>
          </div>
          <div className="footer-section links">
            <h4>Hızlı Menü</h4>
            <ul>
              {[["home", "Ana Sayfa"], ["hakkimizda", "Hakkımızda"], ["randevu", "Randevu Al"], ["kayit", "Hasta Kaydı"]].map(([key, label]) => (
                <li key={key}><button onClick={() => handleTabChange(key)}>{label}</button></li>
              ))}
            </ul>
          </div>
          <div className="footer-section contact">
            <h4>İletişim</h4>
            <p>
              <a href="https://maps.google.com/?q=Yenişehir+Mah.+Sağlık+Bulvarı+No:+4" target="_blank" rel="noopener noreferrer">
                📍 Yenişehir Mah. Sağlık Bulvarı No: 4
              </a>
            </p>
            <p>📞 0850 123 45 67</p>
            <p>
              <a href="mailto:bilgi@hastanerandevu.com">✉️ bilgi@hastanerandevu.com</a>
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Hastane Randevu Sistemi. Tüm hakları saklıdır. | Sistem Tasarımı ve Geliştirme: Efekan Tanrıkulu, Numan Yıldız</p>
        </div>
      </footer>
    </div>
  );
}