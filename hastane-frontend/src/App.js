import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

const SLIDER_IMAGES = ["/images/hastane1.jpg", "/images/hastane2.jpg", "/images/hastane3.jpg"];
const ANA_SAATLER = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  // Form state'leri
  const [kayitForm, setKayitForm] = useState({ ad: "", soyad: "", tc: "", telefon: "", dogum: "", cinsiyet: "", sifre: "" });
  const [adminForm, setAdminForm] = useState({ kullaniciAdi: "", sifre: "" });

  // Randevu sistemi - Başlangıç değerlerini [] yaparak beyaz ekranı önlüyoruz
  const [doktorlar, setDoktorlar] = useState([]);
  const [randevuForm, setRandevuForm] = useState({ tc: "", doktorId: "", tarih: "", saat: "" });
  const [doluSaatler, setDoluSaatler] = useState([]);
  const [expandedHour, setExpandedHour] = useState(null);

  // Hasta paneli
  const [girisYapanHasta, setGirisYapanHasta] = useState(null);
  const [hastaGirisForm, setHastaGirisForm] = useState({ tc: "", sifre: "" });
  const [benimRandevularim, setBenimRandevularim] = useState([]);

  // Sayaçlar
  const [counts, setCounts] = useState({ hastalar: 0, doktorlar: 0, oduller: 0 });
  const [hasStarted, setHasStarted] = useState(false);

  // Slider
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Admin paneli
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminView, setAdminView] = useState("dashboard");
  const [bolumler, setBolumler] = useState([]);
  const [tumRandevular, setTumRandevular] = useState([]);
  const [yeniDoktor, setYeniDoktor] = useState({ ad: "", soyad: "", unvan: "", cinsiyet: "", bolumId: "" });

  // Bildirim ve Yükleniyor State'leri
  const [toast, setToast] = useState({ visible: false, message: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  // API URL Tanımı (Vercel ortam değişkeni için)
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

  // Bildirim gösterme fonksiyonu
  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: "", type: "" });
    }, 3000); 
  };
  
  const prevRandevuRef = useRef({ doktorId: "", tarih: "" });

  // --- USE EFFECTS ---

  // İlk yüklemede doktorları çek
  useEffect(() => {
    axios.get(`${API_URL}/doktorlar`)
      .then(res => setDoktorlar(Array.isArray(res.data) ? res.data : []))
      .catch(err => {
        console.error("Doktorlar çekilemedi:", err);
        setDoktorlar([]); // Hata durumunda boş dizi ata ki .map patlamasın
      });
  }, [API_URL]);

  // Slider Döngüsü
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev === SLIDER_IMAGES.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Randevu Saatleri Kontrolü
  useEffect(() => {
    const { doktorId, tarih } = randevuForm;
    const prev = prevRandevuRef.current;

    if (doktorId && tarih && (doktorId !== prev.doktorId || tarih !== prev.tarih)) {
      prevRandevuRef.current = { doktorId, tarih };
      axios.get(`${API_URL}/dolu-saatler?doktorId=${doktorId}&tarih=${tarih}`)
        .then(res => {
          setDoluSaatler(Array.isArray(res.data) ? res.data : []);
          setRandevuForm(f => ({ ...f, saat: "" }));
          setExpandedHour(null);
        })
        .catch(err => {
          console.error("Saatler çekilemedi:", err);
          setDoluSaatler([]);
        });
    } else if (!doktorId || !tarih) {
      setDoluSaatler([]);
    }
  }, [randevuForm.doktorId, randevuForm.tarih, API_URL]);

  // Sayaç Animasyonu
  useEffect(() => {
    const handleScroll = () => {
      if (hasStarted) return;
      const section = document.getElementById("stats-section");
      if (section && section.getBoundingClientRect().top < window.innerHeight) {
        setHasStarted(true);
        let h = 0, d = 0, o = 0;
        const interval = setInterval(() => {
          if (h < 1000) h += 20;
          if (d < 50) d += 1;
          if (o < 25) o += 1;
          setCounts({ hastalar: h, doktorlar: d, oduller: o });
          if (h >= 1000 && d >= 50 && o >= 25) clearInterval(interval);
        }, 30);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasStarted]);

  // Oturum Kontrolü
  useEffect(() => {
    const kayitliHasta = localStorage.getItem("hasta");
    const hastaToken = localStorage.getItem("hastaToken");
    
    if (kayitliHasta && hastaToken) {
      try {
        const parsedHasta = JSON.parse(kayitliHasta);
        setGirisYapanHasta(parsedHasta);
        fetchRandevularim(parsedHasta.HastaID);
      } catch (e) {
        console.error("Oturum verisi bozuk");
      }
    }

    const adminToken = localStorage.getItem("adminToken");
    if (adminToken) {
      setIsAdminLoggedIn(true);
    }
  }, []); 

  // --- FONKSİYONLAR ---

  const fetchRandevularim = async (hastaId) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/randevularim?hastaId=${hastaId}`);
      setBenimRandevularim(Array.isArray(res.data) ? res.data : []);
    } catch (err) { 
      console.error("Randevular çekilemedi", err); 
      setBenimRandevularim([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBolumler = async () => {
    try { 
      const res = await axios.get(`${API_URL}/bolumler`); 
      setBolumler(Array.isArray(res.data) ? res.data : []); 
    } catch { setBolumler([]); }
  };

  const fetchTumRandevular = async () => {
    setIsLoading(true); 
    try { 
      const res = await axios.get(`${API_URL}/tum-randevular`); 
      setTumRandevular(Array.isArray(res.data) ? res.data : []); 
    } catch (err) { 
      setTumRandevular([]);
    } finally {
      setIsLoading(false); 
    }
  };

  const refetchDoktorlar = async () => {
    try { 
      const res = await axios.get(`${API_URL}/doktorlar`); 
      setDoktorlar(Array.isArray(res.data) ? res.data : []); 
    } catch { setDoktorlar([]); }
  };

  // --- EVENT HANDLERS ---

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/admin-giris`, adminForm);
      if (response.data.basarili) {
        showToast(response.data.mesaj, "success");
        setAdminForm({ kullaniciAdi: "", sifre: "" });
        setIsAdminLoggedIn(true); 
        localStorage.setItem("adminToken", response.data.token);
      }
    } catch (error) {
      showToast(error.response?.data?.mesaj || "Hatalı giriş!", "error");
    }
  };

  const handleKayitSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/kayit`, kayitForm);
      showToast(response.data.mesaj, "success"); 
      setKayitForm({ ad: "", soyad: "", tc: "", telefon: "", dogum: "", cinsiyet: "", sifre: "" }); 
    } catch (error) {
      showToast(error.response?.data?.mesaj || "Kayıt hatası.", "error"); 
    }
  };

  const handleRandevuSubmit = async (e) => {
    e.preventDefault();
    if (randevuForm.saat < "09:00" || randevuForm.saat > "16:50") {
      showToast("Lütfen mesai saatleri seçiniz.", "error");
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/randevu`, randevuForm);
      showToast(response.data.mesaj, "success");
      setRandevuForm({ tc: "", doktorId: "", tarih: "", saat: "" });
      setDoluSaatler(prev => [...prev, randevuForm.saat]); 
    } catch (error) {
      showToast(error.response?.data?.mesaj || "Randevu hatası.", "error");
    }
  };

  const handleHastaGirisSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/hasta-giris`, hastaGirisForm);
      if (response.data.basarili) {
        setGirisYapanHasta(response.data.hasta);
        localStorage.setItem("hastaToken", response.data.token);
        localStorage.setItem("hasta", JSON.stringify(response.data.hasta));
        fetchRandevularim(response.data.hasta.HastaID);
        showToast(response.data.mesaj, "success"); 
      }
    } catch (error) {
      showToast(error.response?.data?.mesaj || "Giriş hatası.", "error"); 
    }
  };

  const handleDurumDegistir = async (randevuId, yeniDurum) => {
    try {
      const response = await axios.put(`${API_URL}/randevu-durum`, {
        randevuId, yeniDurum, hastaId: girisYapanHasta.HastaID
      });
      showToast(response.data.mesaj, "success");
      fetchRandevularim(girisYapanHasta.HastaID); 
    } catch {
      showToast("İşlem başarısız.", "error");
    }
  };

  const handleDoktorEkle = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/doktor-ekle`, yeniDoktor);
      showToast(res.data.mesaj, "success");
      setYeniDoktor({ ad: "", soyad: "", unvan: "", cinsiyet: "", bolumId: "" });
      refetchDoktorlar();
    } catch (err) { showToast("Hata oluştu.", "error"); }
  };

  const handleDoktorSil = async (id) => {
    if (!window.confirm("Silmek istediğinize emin misiniz?")) return;
    try {
      const res = await axios.delete(`${API_URL}/doktor-sil/${id}`);
      showToast(res.data.mesaj, "success");
      refetchDoktorlar();
    } catch { showToast("Hata oluştu.", "error"); }
  };

  const handleAdminRandevuGuncelle = async (id, durum) => {
    try {
      const res = await axios.put(`${API_URL}/admin-randevu-durum`, { randevuId: id, yeniDurum: durum });
      showToast(res.data.mesaj, "success");
      fetchTumRandevular(); 
    } catch { showToast("Hata oluştu.", "error"); }
  };

  // --- YARDIMCI FONKSİYONLAR ---

  const getAltSaatler = (anaSaat) => {
    const h = anaSaat.split(":")[0];
    return [`${h}:00`, `${h}:10`, `${h}:20`, `${h}:30`, `${h}:40`, `${h}:50`];
  };

  const isAnaSaatTamamenDolu = (anaSaat) =>
    getAltSaatler(anaSaat).every(alt => (doluSaatler || []).includes(alt));

  // --- BİLEŞENLER ---

  const Navbar = () => (
    <nav className="navbar">
      <div className="logo">Hastane Randevu</div>
      <div className="nav-links">
        {[
          { key: "home", label: "Ana Sayfa" },
          { key: "hakkimizda", label: "Hakkımızda" },
          { key: "randevu", label: "Randevu Al" },
          { key: "kayit", label: "Hasta Kaydı" },
          { key: "randevularim", label: "Randevularım" },
          { key: "admin", label: "Admin Girişi" },
        ].map(({ key, label }) => (
          <button key={key} className={`nav-btn ${activeTab === key ? "active" : ""}`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>
    </nav>
  );

  const Footer = () => (
    <footer className="footer animate-fade-in">
      <div className="footer-content">
        <div className="footer-section brand">
          <h2>Hastane Randevu</h2>
          <p>Modern altyapımız ve uzman kadromuzla sağlığınız için en yenilikçi çözümleri sunuyoruz.</p>
        </div>
        <div className="footer-section links">
          <h4>Hızlı Menü</h4>
          <ul>
            {[["home", "Ana Sayfa"], ["hakkimizda", "Hakkımızda"], ["randevu", "Randevu Al"], ["kayit", "Hasta Kaydı"]].map(([key, label]) => (
              <li key={key}><button onClick={() => setActiveTab(key)}>{label}</button></li>
            ))}
          </ul>
        </div>
        <div className="footer-section contact">
          <h4>İletişim</h4>
          <p>📍 Yenişehir Mah. Sağlık Bulvarı No: 4</p>
          <p>📞 0850 123 45 67</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 Hastane Randevu Sistemi. | Tasarım: Efekan Tanrıkulu</p>
      </div>
    </footer>
  );
  
  return (
    <div>
      {/* TOAST NOTIFICATION */}
      {toast.visible && (
        <div className={`custom-toast toast-${toast.type} animate-slide-down`}>
          <span className="toast-icon">{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="toast-text">{toast.message}</span>
        </div>
      )}

      {/* LOADING SCREEN */}
      {isLoading && (
        <div className="global-loader">
          <div className="spinner"></div>
          <p>Veriler işleniyor...</p>
        </div>
      )}

      <Navbar />

      {/* ANA SAYFA */}
      {activeTab === "home" && (
        <div className="animate-fade-in">
          <div className="hero-section" style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${SLIDER_IMAGES[currentImageIndex]})`,
              backgroundSize: "cover", backgroundPosition: "center", transition: "background-image 1s ease-in-out"
            }}>
            <h1>Sağlığınız İçin Yenilikçi Çözümler</h1>
            <p>Alanında uzman doktorlarımız ve modern altyapımızla güvenilir sağlık hizmeti sunuyoruz.</p>
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
                    <img src={`/images/${String(dr.Cinsiyet).trim().toUpperCase() === "E" ? "erkek.png" : "kadin.png"}`} alt="Doktor" />
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
            <p>Hastane Randevu Sistemi olarak, tedavi süreçlerini hızlandırmak ve randevu karmaşasını ortadan kaldırmak için en güncel teknolojileri kullanıyoruz.</p>
          </div>
        </div>
      )}

      {/* HASTA KAYDI */}
      {activeTab === "kayit" && (
        <div className="container animate-fade-in">
          <div className="section-card">
            <h2>Yeni Hasta Kaydı</h2>
            <form onSubmit={handleKayitSubmit}>
              <div style={{ display: "flex", gap: "20px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Ad</label>
                  <input type="text" value={kayitForm.ad} onChange={e => setKayitForm({ ...kayitForm, ad: e.target.value })} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Soyad</label>
                  <input type="text" value={kayitForm.soyad} onChange={e => setKayitForm({ ...kayitForm, soyad: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>T.C. KİMLİK NO</label>
                <input type="text" maxLength="11" value={kayitForm.tc} onChange={e => setKayitForm({ ...kayitForm, tc: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Telefon</label>
                <input type="text" value={kayitForm.telefon} onChange={e => setKayitForm({ ...kayitForm, telefon: e.target.value })} required />
              </div>
              <div style={{ display: "flex", gap: "20px" }}>
                <div className="form-group" style={{ flex: 1 }}><label>DOĞUM TARİHİ</label><input type="date" value={kayitForm.dogum} onChange={e => setKayitForm({ ...kayitForm, dogum: e.target.value })} required /></div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>CİNSİYET</label>
                  <select value={kayitForm.cinsiyet} onChange={e => setKayitForm({ ...kayitForm, cinsiyet: e.target.value })} required>
                    <option value="">Seçiniz</option><option value="Erkek">Erkek</option><option value="Kadin">Kadın</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>ŞİFRE</label><input type="password" value={kayitForm.sifre} onChange={e => setKayitForm({ ...kayitForm, sifre: e.target.value })} required /></div>
              <button type="submit" className="submit-btn">Kayıt Ol</button>
            </form>
          </div>
        </div>
      )}

      {/* RANDEVU AL */}
      {activeTab === "randevu" && (
        <div className="container animate-fade-in">
          <div className="section-card">
            <h2>Randevu Oluştur</h2>
            <form onSubmit={handleRandevuSubmit}>
              <div className="form-group"><label>T.C. KİMLİK</label><input type="text" maxLength="11" value={randevuForm.tc} onChange={e => setRandevuForm({ ...randevuForm, tc: e.target.value })} required /></div>
              <div className="form-group">
                <label>DOKTOR SEÇİMİ</label>
                <select value={randevuForm.doktorId} onChange={e => setRandevuForm({ ...randevuForm, doktorId: e.target.value })} required>
                  <option value="">Seçiniz...</option>
                  {(doktorlar || []).map(d => <option key={d.DoktorID} value={d.DoktorID}>{d.BolumAdi} - {d.Unvan} {d.DAd} {d.DSoyad}</option>)}
                </select>
              </div>
              <div className="form-group"><label>TARİH</label><input type="date" value={randevuForm.tarih} onChange={e => setRandevuForm({ ...randevuForm, tarih: e.target.value })} required /></div>

              {randevuForm.doktorId && randevuForm.tarih && (
                <div className="form-group">
                  <label>Saat Seçin</label>
                  <div className="time-grid-main">
                    {(ANA_SAATLER || []).map(anaSaat => {
                      const hepsiDoluMu = isAnaSaatTamamenDolu(anaSaat);
                      const isExpanded = expandedHour === anaSaat;
                      return (
                        <div key={anaSaat} className="time-block">
                          <button type="button" className={`time-slot-main ${hepsiDoluMu ? "disabled" : ""} ${isExpanded ? "active" : ""}`}
                            onClick={() => { if (!hepsiDoluMu) setExpandedHour(isExpanded ? null : anaSaat); }}>
                            {anaSaat} {hepsiDoluMu ? "(Dolu)" : "▼"}
                          </button>
                          <div className={`sub-slots-container ${isExpanded ? "open" : ""}`}>
                            {getAltSaatler(anaSaat).map(altSaat => {
                              const altDolu = (doluSaatler || []).includes(altSaat);
                              return (
                                <button type="button" key={altSaat} className={`time-slot-sub ${altDolu ? "disabled" : ""} ${randevuForm.saat === altSaat ? "selected" : ""}`}
                                  onClick={() => { if (!altDolu) setRandevuForm({ ...randevuForm, saat: altSaat }); }}>
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
              <button type="submit" className="submit-btn" disabled={!randevuForm.saat}>Onayla</button>
            </form>
          </div>
        </div>
      )}

      {/* RANDEVULARIM */}
      {activeTab === "randevularim" && (
        <div className="container animate-fade-in">
          <div className="section-card">
            {!girisYapanHasta ? (
              <div style={{ maxWidth: "400px", margin: "0 auto" }}>
                <h2>Hasta Girişi</h2>
                <form onSubmit={handleHastaGirisSubmit}>
                  <div className="form-group"><label>T.C. NO</label><input type="text" maxLength="11" value={hastaGirisForm.tc} onChange={e => setHastaGirisForm({ ...hastaGirisForm, tc: e.target.value })} required /></div>
                  <div className="form-group"><label>ŞİFRE</label><input type="password" value={hastaGirisForm.sifre} onChange={e => setHastaGirisForm({ ...hastaGirisForm, sifre: e.target.value })} required /></div>
                  <button type="submit" className="submit-btn">Giriş Yap</button>
                </form>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #280f42", paddingBottom: "10px", marginBottom: "20px" }}>
                  <h2>Randevularım</h2>
                  <button onClick={() => { setGirisYapanHasta(null); localStorage.clear(); }} className="nav-btn">Çıkış</button>
                </div>
                {benimRandevularim.length === 0 ? <p>Randevu bulunamadı.</p> : (
                  <div className="appointments-list">
                    {(benimRandevularim || []).map(randevu => (
                      <div key={randevu.RandevuID} className="appointment-card">
                        <div className="appt-info">
                          <h3>{randevu.BolumAdi} - {randevu.DAd} {randevu.DSoyad}</h3>
                          <p><strong>Tarih:</strong> {new Date(randevu.RandevuTarihi).toLocaleDateString("tr-TR")} | <strong>Saat:</strong> {randevu.RandevuSaati.substring(0, 5)}</p>
                        </div>
                        <div className="appt-actions">
                          <span className={`status-badge status-${randevu.Durum.toLowerCase()}`}>{randevu.Durum}</span>
                          {randevu.Durum === "Bekliyor" && (
                            <div className="action-buttons">
                              <button className="btn-approve" onClick={() => handleDurumDegistir(randevu.RandevuID, "Onaylandi")}>✔</button>
                              <button className="btn-cancel" onClick={() => handleDurumDegistir(randevu.RandevuID, "Iptal")}>✖</button>
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
                <h2>Yönetici Paneli</h2>
                <form onSubmit={handleAdminSubmit}>
                  <div className="form-group"><label>Kullanıcı Adı</label><input type="text" value={adminForm.kullaniciAdi} onChange={e => setAdminForm({ ...adminForm, kullaniciAdi: e.target.value })} required /></div>
                  <div className="form-group"><label>Şifre</label><input type="password" value={adminForm.sifre} onChange={e => setAdminForm({ ...adminForm, sifre: e.target.value })} required /></div>
                  <button type="submit" className="submit-btn">Giriş</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="container animate-fade-in">
              {adminView === "dashboard" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginTop: "50px" }}>
                  <div className="section-card" style={{textAlign:"center"}}>
                    <h3>Doktor Yönetimi</h3>
                    <button onClick={() => setAdminView("doktorlar")} className="submit-btn">Yönet</button>
                  </div>
                  <div className="section-card" style={{textAlign:"center"}}>
                    <h3>Randevu İşlemleri</h3>
                    <button onClick={() => { setAdminView("randevular"); fetchTumRandevular(); }} className="submit-btn">Görüntüle</button>
                  </div>
                  <button onClick={() => { setIsAdminLoggedIn(false); localStorage.clear(); }} style={{gridColumn:"span 2", background:"#dc3545", color:"white", border:"none", padding:"10px", borderRadius:"5px", cursor:"pointer"}}>Çıkış Yap</button>
                </div>
              )}

              {adminView === "doktorlar" && (
                <div className="animate-fade-in">
                  <button onClick={() => setAdminView("dashboard")} className="btn-secondary">← Geri</button>
                  <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
                    <div className="section-card" style={{ flex: 1 }}>
                      <h3>Doktor Ekle</h3>
                      <form onSubmit={handleDoktorEkle}>
                        <input type="text" placeholder="Ad" value={yeniDoktor.ad} onChange={e => setYeniDoktor({ ...yeniDoktor, ad: e.target.value })} required />
                        <input type="text" placeholder="Soyad" value={yeniDoktor.soyad} onChange={e => setYeniDoktor({ ...yeniDoktor, soyad: e.target.value })} required />
                        <select value={yeniDoktor.bolumId} onClick={fetchBolumler} onChange={e => setYeniDoktor({ ...yeniDoktor, bolumId: e.target.value })} required>
                          <option value="">Bölüm Seç...</option>
                          {(bolumler || []).map(b => <option key={b.BolumID} value={b.BolumID}>{b.BolumAdi}</option>)}
                        </select>
                        <button type="submit" className="submit-btn">Ekle</button>
                      </form>
                    </div>
                    <div className="section-card" style={{ flex: 1 }}>
                      <h3>Mevcut Doktorlar</h3>
                      {(doktorlar || []).map(dr => (
                        <div key={dr.DoktorID} className="appointment-card" style={{marginBottom:"10px"}}>
                          <span>{dr.DAd} {dr.DSoyad}</span>
                          <button onClick={() => handleDoktorSil(dr.DoktorID)} className="btn-cancel">Sil</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {adminView === "randevular" && (
                <div className="animate-fade-in">
                  <button onClick={() => setAdminView("dashboard")} className="btn-secondary">← Geri</button>
                  <div className="section-card" style={{marginTop:"20px"}}>
                    {(tumRandevular || []).map(r => (
                      <div key={r.RandevuID} className="appointment-card">
                        <div>
                          <p>Hasta: {r.HAd} {r.HSoyad}</p>
                          <p>Doktor: {r.DAd} {r.DSoyad}</p>
                          <p>{new Date(r.RandevuTarihi).toLocaleDateString()} - {r.RandevuSaati}</p>
                        </div>
                        <span className={`status-badge status-${r.Durum.toLowerCase()}`}>{r.Durum}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}git add .
git commit -m "Fix: Veri gelmediğinde sayfanın çökmesi engellendi"
git push