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
  password: process.env.DB_PASSWORD || "ddiPass&",
  database: process.env.DB_NAME || "HastaneRandevuSistemi",
  port: process.env.DB_PORT || 3306
});

db.connect((err) => {
  if (err) console.error("Veritabanı bağlantı hatası:", err);
  else console.log("MySQL bağlantısı başarılı");
});

// --- GET: HASTALAR ---
app.get("/hastalar", (req, res) => {
  db.query("SELECT * FROM HASTA", (err, data) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json(data);
  });
});

// --- POST: HASTA KAYIT (BCRYPT) ---
app.post("/kayit", async (req, res) => {
  const { ad, soyad, tc, telefon, dogum, cinsiyet, sifre } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(sifre, 10);
    const sql = "INSERT INTO HASTA (HAd, HSoyad, TCno, Telefon, DogumTarihi, Cinsiyet, HSifre) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
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
  
  db.query("SELECT * FROM HASTA WHERE TCno = ?", [tc], async (err, results) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    if (results.length === 0) return res.status(401).json({ mesaj: "Bu T.C. Kimlik Numarası sistemde bulunamadı." });

    const hasta = results[0];
    const isMatch = await bcrypt.compare(sifre, hasta.HSifre);
    const isOldMatch = hasta.HSifre.length > 60 ? false : true; // Geriye dönük uyumluluk

    if (!isMatch && !isOldMatch) return res.status(401).json({ mesaj: "Hatalı şifre girdiniz!" });

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
  
  db.query("SELECT * FROM YONETICI WHERE KullaniciAdi = ? AND YSifre = SHA2(?, 256)", [kullaniciAdi, sifre], (err, results) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    if (results.length === 0) return res.status(401).json({ mesaj: "Hatalı kullanıcı adı veya şifre!" });

    const token = jwt.sign(
      { id: results[0].YoneticiID, rol: 'admin' }, 
      process.env.JWT_SECRET, 
      { expiresIn: "2h" }
    );

    res.json({ basarili: true, mesaj: "Yönetici girişi başarılı.", token: token });
  });
});

// --- GET: DOKTORLAR ---
app.get("/doktorlar", (req, res) => {
  const sql = `SELECT D.DoktorID, D.DAd, D.DSoyad, D.Unvan, D.Cinsiyet, B.BolumAdi 
               FROM DOKTOR D LEFT JOIN BOLUM B ON D.BolumID = B.BolumID`;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json(data);
  });
});

// --- GET: DOLU SAATLER ---
app.get("/dolu-saatler", (req, res) => {
  const { doktorId, tarih } = req.query;
  if (!doktorId || !tarih) return res.json([]);

  const sql = "SELECT RandevuSaati FROM RANDEVU WHERE DoktorID = ? AND RandevuTarihi = ? AND Durum != 'Iptal'";
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

  db.query("SELECT HastaID FROM HASTA WHERE TCno = ?", [tc], (err, hastaRes) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    if (hastaRes.length === 0) return res.status(404).json({ mesaj: "Bu T.C. numarasına ait hasta bulunamadı." });
    
    const hastaId = hastaRes[0].HastaID;

    db.beginTransaction((err) => {
      if (err) return res.status(500).json({ mesaj: "İşlem başlatılamadı." });

      const insertRandevuSql = "INSERT INTO RANDEVU (RandevuTarihi, RandevuSaati, Durum, HastaID, DoktorID) VALUES (?, ?, 'Bekliyor', ?, ?)";
      db.query(insertRandevuSql, [tarih, saat, hastaId, doktorId], (err2) => {
        if (err2) return db.rollback(() => res.status(400).json({ mesaj: "Randevu oluşturulamadı: " + err2.message }));

        const insertLogSql = "INSERT INTO LOG_KAYIT (IslemTipi, Aciklama) VALUES (?, ?)";
        const logAciklama = `Yeni randevu. HastaID:${hastaId} DoktorID:${doktorId} Tarih:${tarih} Saat:${saat}`;
        
        db.query(insertLogSql, ['TRANSACTION', logAciklama], (err3) => {
          if (err3) return db.rollback(() => res.status(500).json({ mesaj: "Sistem günlüğüne yazılamadı." }));

          db.commit((err4) => {
            if (err4) return db.rollback(() => res.status(500).json({ mesaj: "İşlem kaydedilemedi." }));
            res.json({ mesaj: "Randevunuz başarıyla oluşturuldu!" });
          });
        });
      });
    });
  });
});

// --- GET/PUT: HASTA RANDEVULARI ---
app.get("/randevularim", (req, res) => {
  const sql = `SELECT R.RandevuID, R.RandevuTarihi, R.RandevuSaati, R.Durum, D.DAd, D.DSoyad, D.Unvan, B.BolumAdi 
               FROM RANDEVU R JOIN DOKTOR D ON R.DoktorID = D.DoktorID JOIN BOLUM B ON D.BolumID = B.BolumID 
               WHERE R.HastaID = ? ORDER BY R.RandevuTarihi DESC, R.RandevuSaati DESC`;
  db.query(sql, [req.query.hastaId], (err, results) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json(results);
  });
});

app.put("/randevu-durum", (req, res) => {
  const { randevuId, yeniDurum, hastaId } = req.body;
  db.query("UPDATE RANDEVU SET Durum = ? WHERE RandevuID = ? AND HastaID = ?", [yeniDurum, randevuId, hastaId], (err) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json({ mesaj: `Randevunuz başarıyla ${yeniDurum} durumuna getirildi.` });
  });
});

// --- ADMİN İŞLEMLERİ ---
app.get("/bolumler", (req, res) => {
  db.query("SELECT * FROM BOLUM", (err, data) => res.json(err ? [] : data));
});

app.post("/doktor-ekle", (req, res) => {
  const { ad, soyad, unvan, cinsiyet, bolumId } = req.body;
  db.query("INSERT INTO DOKTOR (DAd, DSoyad, Unvan, Cinsiyet, BolumID) VALUES (?, ?, ?, ?, ?)", [ad, soyad, unvan, cinsiyet, bolumId], (err) => {
    if (err) return res.status(500).json({ mesaj: "Veritabanı Hatası: " + err.message });
    res.json({ mesaj: "Doktor sisteme eklendi!" });
  });
});

app.delete("/doktor-sil/:id", (req, res) => {
  db.query("DELETE FROM DOKTOR WHERE DoktorID = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ mesaj: "Hata: Bu doktora ait randevular var." });
    res.json({ mesaj: "Doktor silindi." });
  });
});

app.get("/tum-randevular", (req, res) => {
  const sql = `SELECT R.RandevuID, R.RandevuTarihi, R.RandevuSaati, R.Durum, H.HAd, H.HSoyad, H.TCno, D.DAd, D.DSoyad, D.Unvan, B.BolumAdi 
               FROM RANDEVU R JOIN HASTA H ON R.HastaID = H.HastaID JOIN DOKTOR D ON R.DoktorID = D.DoktorID LEFT JOIN BOLUM B ON D.BolumID = B.BolumID 
               ORDER BY R.RandevuTarihi DESC, R.RandevuSaati DESC`;
  db.query(sql, (err, results) => res.json(err ? [] : results));
});

app.put("/admin-randevu-durum", (req, res) => {
  db.query("UPDATE RANDEVU SET Durum = ? WHERE RandevuID = ?", [req.body.yeniDurum, req.body.randevuId], (err) => {
    if (err) return res.status(500).json({ mesaj: err.message });
    res.json({ mesaj: `Randevu başarıyla ${req.body.yeniDurum} yapıldı.` });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server çalışıyor: http://localhost:${PORT}`));