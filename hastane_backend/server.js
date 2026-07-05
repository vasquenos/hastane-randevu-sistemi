const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "HastaneRandevuSistemi",
  port: process.env.DB_PORT || 3306,
  // BUNU EKLİYORUZ: Bulut sistemleri için güvenli bağlantı izni
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect((err) => {
  if (err) console.error("Veritabanı bağlantı hatası:", err);
  else console.log("MySQL bağlantısı başarılı");
});

// =====================================================================
// AUTH MIDDLEWARE — Rol izolasyonunun temeli.
// Şimdiye kadar hiçbir endpoint JWT token'ı doğrulamıyordu; herkes
// (token olmadan bile) /tum-randevular, /admin-randevu-durum,
// /doktor-ekle, /doktor-sil, /hastalar gibi uçlara doğrudan istek
// atabiliyordu. Bu iki fonksiyon artık her korumalı route'ta zorunlu.
// =====================================================================
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ mesaj: "Yetkilendirme token'ı gerekli." });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ mesaj: "Token geçersiz veya süresi dolmuş." });
    req.user = decoded; // { id, rol, doktorId?, tc? }
    next();
  });
}

function requireRole(...rolesAllowed) {
  return (req, res, next) => {
    if (!req.user || !rolesAllowed.includes(req.user.rol)) {
      return res.status(403).json({ mesaj: "Bu işlem için yetkiniz yok." });
    }
    next();
  };
}

// --- GET: HASTALAR ---
// ÖNEMLİ GÜVENLİK DÜZELTMESİ: Bu endpoint hiçbir token kontrolü olmadan
// SELECT * ile tüm hastaların adını, T.C. kimlik numarasını, telefonunu VE
// bcrypt şifre hash'ini herkese açık şekilde döndürüyordu. Frontend'de bu
// endpoint'i çağıran hiçbir kod yok (ana sayfadaki sayaçlar sahte/animasyonlu
// sayılar) — yani bu tamamen kullanılmayan ama canlıda açık duran bir veri
// sızıntısı kapısıydı. Şimdi sadece admin erişebilir ve şifre alanı hiç
// sorgulanmıyor.
app.get("/hastalar", verifyToken, requireRole('admin'), (req, res) => {
  db.query("SELECT HastaID, HAd, HSoyad, TCno, Telefon, DogumTarihi, Cinsiyet FROM hasta", (err, data) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json(data);
  });
});

// --- POST: HASTA KAYIT (BCRYPT) ---
app.post("/kayit", async (req, res) => {
  const { ad, soyad, tc, telefon, dogum, cinsiyet, sifre } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(sifre, 10);
    const sql = "INSERT INTO hasta (HAd, HSoyad, TCno, Telefon, DogumTarihi, Cinsiyet, HSifre) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [ad, soyad, tc, telefon, dogum, cinsiyet, hashedPassword], (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ mesaj: "Bu T.C. Kimlik Numarası sistemde zaten kayıtlı!" });
        return res.status(500).json({ mesaj: "Veritabanı Hatası: " + err.message });
      }
      res.status(201).json({ mesaj: "Kaydınız başarıyla oluşturuldu! Giriş yapabilirsiniz." });
    });
  } catch (error) {
    res.status(500).json({ mesaj: "Şifreleme sırasında hata oluştu." });
  }
});

// --- POST: HASTA GİRİŞ (JWT & BCRYPT) ---
app.post("/hasta-giris", (req, res) => {
  const { tc, sifre } = req.body;
  
  db.query("SELECT * FROM hasta WHERE TCno = ?", [tc], async (err, results) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    if (results.length === 0) return res.status(401).json({ mesaj: "Bu T.C. Kimlik Numarası sistemde bulunamadı." });

    const hasta = results[0];
    // HSifre bcrypt formatında mı ($2 ile başlar, 60 karakter) yoksa eski
    // (muhtemelen düz metin) bir kayıt mı, ona göre karşılaştırma yap.
    // ÖNEMLİ: Eski kod burada "hash 60 karakterden kısaysa şifreyi doğru
    // kabul et" diyordu — bu, bcrypt'e geçmemiş herhangi bir hesaba HERHANGİ
    // bir şifreyle giriş yapılabilmesi anlamına gelen bir güvenlik açığıydı.
    const isBcryptHash = typeof hasta.HSifre === "string" && hasta.HSifre.startsWith("$2") && hasta.HSifre.length >= 60;
    const isMatch = isBcryptHash
      ? await bcrypt.compare(sifre, hasta.HSifre)
      : sifre === hasta.HSifre; // eski düz-metin kayıt: gerçek şifreyle karşılaştır

    if (!isMatch) return res.status(401).json({ mesaj: "Hatalı şifre girdiniz!" });

    // Eski düz-metin şifreyle başarılı giriş yapıldıysa, kaydı sessizce bcrypt'e yükselt.
    if (!isBcryptHash) {
      const yeniHash = await bcrypt.hash(sifre, 10);
      db.query("UPDATE hasta SET HSifre = ? WHERE HastaID = ?", [yeniHash, hasta.HastaID], () => {});
    }

    const token = jwt.sign(
      { id: hasta.HastaID, tc: hasta.TCno, rol: 'hasta' }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );

    res.json({ 
      basarili: true, 
      mesaj: `Hoş geldin, ${hasta.HAd} ${hasta.HSoyad}`,
      token: token,
      hasta: { HastaID: hasta.HastaID, HAd: hasta.HAd, HSoyad: hasta.HSoyad, TCno: hasta.TCno }
    });
  });
});

// --- POST: ADMİN GİRİŞ (JWT) ---
app.post("/admin-giris", (req, res) => {
  const { kullaniciAdi, sifre } = req.body;
  
  db.query("SELECT * FROM yonetici WHERE KullaniciAdi = ? AND YSifre = SHA2(?, 256)", [kullaniciAdi, sifre], (err, results) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    if (results.length === 0) return res.status(401).json({ mesaj: "Hatalı kullanıcı adı veya şifre!" });

    const hesap = results[0];
    // NOT: Bu, yonetici tablosunda Rol ve DoktorID sütunları olduğunu varsayar.
    // Bu sütunlar henüz yoksa lütfen ekleyin (aşağıdaki açıklamaya bakın) —
    // eklenene kadar sistem güvenli tarafta kalıp herkesi 'admin' sayacaktır.
    const rol = hesap.Rol ? String(hesap.Rol).toLowerCase() : 'admin';
    const doktorId = hesap.DoktorID || null;

    if (rol === 'doktor' && !doktorId) {
      return res.status(500).json({ mesaj: "Bu doktor hesabına bağlı bir DoktorID tanımlı değil. Lütfen yönetici ile iletişime geçin." });
    }

    const token = jwt.sign(
      { id: hesap.YoneticiID, rol: rol, doktorId: doktorId },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      basarili: true,
      mesaj: rol === 'doktor' ? "Doktor girişi başarılı." : "Yönetici girişi başarılı.",
      token: token,
      role: rol === 'doktor' ? 'Doktor' : 'Yonetici'
    });
  });
});

// --- GET: DOKTORLAR ---
app.get("/doktorlar", (req, res) => {
  const sql = `SELECT D.DoktorID, D.DAd, D.DSoyad, D.Unvan, D.Cinsiyet, B.BolumAdi 
               FROM doktor D LEFT JOIN bolum B ON D.BolumID = B.BolumID`;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json(data);
  });
});

// --- GET: DOLU SAATLER ---
app.get("/dolu-saatler", (req, res) => {
  const { doktorId, tarih } = req.query;
  if (!doktorId || !tarih) return res.json([]);

  const sql = "SELECT RandevuSaati FROM randevu WHERE DoktorID = ? AND RandevuTarihi = ? AND Durum != 'Iptal'";
  db.query(sql, [doktorId, tarih], (err, results) => {
    if (err) return res.json([]);
    const saatler = results.map(r => typeof r.RandevuSaati === "string" ? r.RandevuSaati.substring(0, 5) : r.RandevuSaati);
    res.json(saatler);
  });
});

// --- POST: RANDEVU OLUŞTUR (TRANSACTION) ---
app.post("/randevu", (req, res) => {
  const { tc, doktorId, tarih, saat } = req.body;

  if (saat < "09:00" || saat > "16:50") {
    return res.status(400).json({ mesaj: "Sistem sadece 09:00 ile 16:50 arasında randevu kabul etmektedir!" });
  }

  db.query("SELECT HastaID FROM hasta WHERE TCno = ?", [tc], (err, hastaRes) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    if (hastaRes.length === 0) return res.status(404).json({ mesaj: "Bu T.C. numarasına ait hasta bulunamadı." });
    
    const hastaId = hastaRes[0].HastaID;

    db.beginTransaction((err) => {
      if (err) return res.status(500).json({ mesaj: "İşlem başlatılamadı." });

      // ÇAKIŞMA KONTROLÜ: Aynı doktor + aynı tarih + aynı saat için iptal
      // edilmemiş bir randevu var mı diye bak. Transaction içinde yapılıyor
      // ki iki isteğin aynı anda gelmesi durumunda da (race condition) çift
      // randevu oluşmasın.
      const cakismaSql = "SELECT RandevuID FROM randevu WHERE DoktorID = ? AND RandevuTarihi = ? AND RandevuSaati = ? AND Durum != 'Iptal' FOR UPDATE";
      db.query(cakismaSql, [doktorId, tarih, saat], (errC, cakismaSonuc) => {
        if (errC) return db.rollback(() => res.status(500).json({ mesaj: "Çakışma kontrolü yapılamadı: " + errC.message }));
        if (cakismaSonuc.length > 0) {
          return db.rollback(() => res.status(409).json({ mesaj: "Bu saat için doktor müsait değil. Lütfen başka bir saat seçin." }));
        }

      const insertRandevuSql = "INSERT INTO randevu (RandevuTarihi, RandevuSaati, Durum, HastaID, DoktorID) VALUES (?, ?, 'Bekliyor', ?, ?)";
      db.query(insertRandevuSql, [tarih, saat, hastaId, doktorId], (err2) => {
        if (err2) return db.rollback(() => res.status(400).json({ mesaj: "Randevu oluşturulamadı: " + err2.message }));

        const insertLogSql = "INSERT INTO log_kayit (IslemTipi, Aciklama) VALUES (?, ?)";
        const logAciklama = `Yeni randevu. HastaID:${hastaId} DoktorID:${doktorId} Tarih:${tarih} Saat:${saat}`;
        
        db.query(insertLogSql, ['TRANSACTION', logAciklama], (err3) => {
          if (err3) return db.rollback(() => res.status(500).json({ mesaj: "Sistem günlüğüne yazılamadı." }));

          db.commit((err4) => {
            if (err4) return db.rollback(() => res.status(500).json({ mesaj: "İşlem kaydedilemedi." }));
            res.json({ mesaj: "Randevunuz başarıyla oluşturuldu!" });
          });
        });
      });
      }); // çakışma kontrolü callback kapanışı
    });
  });
});

// --- GET/PUT: HASTA RANDEVULARI ---
// GÜVENLİK NOTU: Bu iki endpoint, hastaId'yi doğrudan query/body'den alıp
// güveniyordu — yani bir hasta, tarayıcı konsolundan başka bir hastanın
// HastaID'sini query'ye yazarak onun randevularını görebilir/değiştirebilirdi
// (IDOR açığı). Artık hastaId token'dan (req.user.id) alınıyor, kullanıcının
// gönderdiği değere bakılmıyor.
app.get("/randevularim", verifyToken, requireRole('hasta'), (req, res) => {
  const sql = `SELECT R.RandevuID, R.RandevuTarihi, R.RandevuSaati, R.Durum, D.DAd, D.DSoyad, D.Unvan, B.BolumAdi 
               FROM randevu R JOIN doktor D ON R.DoktorID = D.DoktorID JOIN bolum B ON D.BolumID = B.BolumID 
               WHERE R.HastaID = ? ORDER BY R.RandevuTarihi DESC, R.RandevuSaati DESC`;
  db.query(sql, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json(results);
  });
});

app.put("/randevu-durum", verifyToken, requireRole('hasta'), (req, res) => {
  const { randevuId, yeniDurum } = req.body;
  db.query("UPDATE randevu SET Durum = ? WHERE RandevuID = ? AND HastaID = ?", [yeniDurum, randevuId, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ mesaj: "Bu randevu size ait değil veya bulunamadı." });
    res.json({ mesaj: `Randevunuz başarıyla ${yeniDurum} durumuna getirildi.` });
  });
});

// --- GET/PUT: DOKTORUN KENDİ RANDEVULARI (ROL İZOLASYONU) ---
// Öncelik 1'in asıl düzeltmesi burada: doktor girişli kullanıcı SADECE
// kendi DoktorID'sine ait randevuları görebilir/güncelleyebilir. Filtre
// query'nin WHERE koşuluna gömülü — frontend'de gizlemek değil, API
// seviyesinde veri sızıntısını engelliyor.
app.get("/doktor-randevularim", verifyToken, requireRole('doktor'), (req, res) => {
  const sql = `SELECT R.RandevuID, R.RandevuTarihi, R.RandevuSaati, R.Durum, H.HAd, H.HSoyad, H.TCno
               FROM randevu R JOIN hasta H ON R.HastaID = H.HastaID
               WHERE R.DoktorID = ?
               ORDER BY R.RandevuTarihi DESC, R.RandevuSaati DESC`;
  db.query(sql, [req.user.doktorId], (err, results) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json(results);
  });
});

app.put("/doktor-randevu-durum", verifyToken, requireRole('doktor'), (req, res) => {
  const { randevuId, yeniDurum } = req.body;
  // DoktorID koşulu WHERE'de: başka bir doktora ait randevu ID'si gönderilse
  // bile hiçbir satır etkilenmez.
  db.query(
    "UPDATE randevu SET Durum = ? WHERE RandevuID = ? AND DoktorID = ?",
    [yeniDurum, randevuId, req.user.doktorId],
    (err, result) => {
      if (err) return res.status(500).json({ mesaj: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ mesaj: "Bu randevu size ait değil veya bulunamadı." });
      res.json({ mesaj: `Randevu başarıyla ${yeniDurum} durumuna getirildi.` });
    }
  );
});

// --- ADMİN İŞLEMLERİ ---
app.get("/bolumler", (req, res) => {
  db.query("SELECT * FROM bolum", (err, data) => res.json(err ? [] : data));
});

app.post("/doktor-ekle", verifyToken, requireRole('admin'), (req, res) => {
  const { ad, soyad, unvan, cinsiyet, bolumId } = req.body;
  db.query("INSERT INTO doktor (DAd, DSoyad, Unvan, Cinsiyet, BolumID) VALUES (?, ?, ?, ?, ?)", [ad, soyad, unvan, cinsiyet, bolumId], (err) => {
    if (err) return res.status(500).json({ mesaj: "Veritabanı Hatası: " + err.message });
    res.json({ mesaj: "Doktor sisteme eklendi!" });
  });
});

app.delete("/doktor-sil/:id", verifyToken, requireRole('admin'), (req, res) => {
  db.query("DELETE FROM doktor WHERE DoktorID = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ mesaj: "Hata: Bu doktora ait randevular var." });
    res.json({ mesaj: "Doktor silindi." });
  });
});

app.get("/tum-randevular", verifyToken, requireRole('admin'), (req, res) => {
  const sql = `SELECT R.RandevuID, R.RandevuTarihi, R.RandevuSaati, R.Durum, H.HAd, H.HSoyad, H.TCno, D.DAd, D.DSoyad, D.Unvan, B.BolumAdi 
               FROM randevu R JOIN hasta H ON R.HastaID = H.HastaID JOIN doktor D ON R.DoktorID = D.DoktorID LEFT JOIN bolum B ON D.BolumID = B.BolumID 
               ORDER BY R.RandevuTarihi DESC, R.RandevuSaati DESC`;
  db.query(sql, (err, results) => res.json(err ? [] : results));
});

app.put("/admin-randevu-durum", verifyToken, requireRole('admin'), (req, res) => {
  db.query("UPDATE randevu SET Durum = ? WHERE RandevuID = ?", [req.body.yeniDurum, req.body.randevuId], (err) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json({ mesaj: `Randevu başarıyla ${req.body.yeniDurum} yapıldı.` });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server çalışıyor: http://localhost:${PORT}`));