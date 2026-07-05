CREATE DATABASE  IF NOT EXISTS `hastanerandevusistemi` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `hastanerandevusistemi`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: hastanerandevusistemi
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bolum`
--

DROP TABLE IF EXISTS `bolum`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bolum` (
  `BolumID` int NOT NULL AUTO_INCREMENT,
  `BolumAdi` varchar(100) COLLATE utf8mb4_turkish_ci NOT NULL,
  `KatBilgisi` varchar(50) COLLATE utf8mb4_turkish_ci NOT NULL,
  PRIMARY KEY (`BolumID`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bolum`
--

LOCK TABLES `bolum` WRITE;
/*!40000 ALTER TABLE `bolum` DISABLE KEYS */;
INSERT INTO `bolum` VALUES (1,'Kardiyoloji','2. Kat'),(2,'Ortopedi','3. Kat'),(3,'Nöroloji','1. Kat'),(4,'Dahiliye','1. Kat');
/*!40000 ALTER TABLE `bolum` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doktor`
--

DROP TABLE IF EXISTS `doktor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doktor` (
  `DoktorID` int NOT NULL AUTO_INCREMENT,
  `DAd` varchar(50) COLLATE utf8mb4_turkish_ci NOT NULL,
  `DSoyad` varchar(50) COLLATE utf8mb4_turkish_ci NOT NULL,
  `Unvan` varchar(50) COLLATE utf8mb4_turkish_ci DEFAULT NULL,
  `Uzmanlik` varchar(100) COLLATE utf8mb4_turkish_ci NOT NULL,
  `BolumID` int NOT NULL,
  `Cinsiyet` varchar(10) COLLATE utf8mb4_turkish_ci DEFAULT 'E',
  PRIMARY KEY (`DoktorID`),
  KEY `fk_doktor_bolum` (`BolumID`),
  CONSTRAINT `fk_doktor_bolum` FOREIGN KEY (`BolumID`) REFERENCES `bolum` (`BolumID`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doktor`
--

LOCK TABLES `doktor` WRITE;
/*!40000 ALTER TABLE `doktor` DISABLE KEYS */;
INSERT INTO `doktor` VALUES (1,'Ahmet','Yılmaz','Prof. Dr.','Kardiyoloji',1,'E'),(2,'Mehmet','Kaya','Doç. Dr.','Ortopedi',2,'E'),(3,'Ayşe','Demir','Dr.','Nöroloji',3,'K'),(4,'Fatma','Çelik','Uzm. Dr.','Dahiliye',4,'K');
/*!40000 ALTER TABLE `doktor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hasta`
--

DROP TABLE IF EXISTS `hasta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hasta` (
  `HastaID` int NOT NULL AUTO_INCREMENT,
  `HAd` varchar(50) COLLATE utf8mb4_turkish_ci NOT NULL,
  `HSoyad` varchar(50) COLLATE utf8mb4_turkish_ci NOT NULL,
  `TCno` char(11) COLLATE utf8mb4_turkish_ci NOT NULL,
  `Telefon` varchar(15) COLLATE utf8mb4_turkish_ci DEFAULT NULL,
  `DogumTarihi` date DEFAULT NULL,
  `Cinsiyet` enum('Erkek','Kadin') COLLATE utf8mb4_turkish_ci NOT NULL,
  `HSifre` varchar(255) COLLATE utf8mb4_turkish_ci NOT NULL,
  `AktifMi` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`HastaID`),
  UNIQUE KEY `TCno` (`TCno`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hasta`
--

LOCK TABLES `hasta` WRITE;
/*!40000 ALTER TABLE `hasta` DISABLE KEYS */;
INSERT INTO `hasta` VALUES (1,'Efekan','Tanrıkulu','13066207016','05354995818','2004-07-25','Erkek','$2b$10$8oViRR3ggCkuYdz.mZ0zEeOxbBT22TVdbro8PK9wxQZQLhpzk6w32',1);
/*!40000 ALTER TABLE `hasta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `izingunleri`
--

DROP TABLE IF EXISTS `izingunleri`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `izingunleri` (
  `ITarih` date NOT NULL,
  `DoktorID` int NOT NULL,
  PRIMARY KEY (`ITarih`,`DoktorID`),
  KEY `fk_izin_doktor` (`DoktorID`),
  CONSTRAINT `fk_izin_doktor` FOREIGN KEY (`DoktorID`) REFERENCES `doktor` (`DoktorID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `izingunleri`
--

LOCK TABLES `izingunleri` WRITE;
/*!40000 ALTER TABLE `izingunleri` DISABLE KEYS */;
INSERT INTO `izingunleri` VALUES ('2026-05-20',1),('2026-05-21',1),('2026-05-22',3);
/*!40000 ALTER TABLE `izingunleri` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kullanici`
--

DROP TABLE IF EXISTS `kullanici`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kullanici` (
  `KullaniciID` int NOT NULL AUTO_INCREMENT,
  `KullaniciAdi` varchar(50) COLLATE utf8mb4_turkish_ci NOT NULL,
  `Sifre` varchar(255) COLLATE utf8mb4_turkish_ci NOT NULL,
  `RolID` int NOT NULL,
  `DoktorID` int DEFAULT NULL,
  PRIMARY KEY (`KullaniciID`),
  UNIQUE KEY `KullaniciAdi` (`KullaniciAdi`),
  KEY `fk_kullanici_rol` (`RolID`),
  KEY `fk_kullanici_doktor` (`DoktorID`),
  CONSTRAINT `fk_kullanici_doktor` FOREIGN KEY (`DoktorID`) REFERENCES `doktor` (`DoktorID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_kullanici_rol` FOREIGN KEY (`RolID`) REFERENCES `rol` (`RolID`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kullanici`
--

LOCK TABLES `kullanici` WRITE;
/*!40000 ALTER TABLE `kullanici` DISABLE KEYS */;
INSERT INTO `kullanici` VALUES (1,'admin','5ce41ada64f1e8ffb0acfaafa622b141438f3a5777785e7f0b830fb73e40d3d6',1,NULL),(2,'sekreter1','87cd39709fd518c84e013590153a6e503df9988f87cf0196550ee3039a3d8802',2,NULL),(3,'dr_ahmet','35a90198bcf2d1fa7dbc5cd22fe2c58388e836a4e7a6f038b575d5532f00cea2',3,NULL);
/*!40000 ALTER TABLE `kullanici` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `log_kayit`
--

DROP TABLE IF EXISTS `log_kayit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `log_kayit` (
  `LogID` int NOT NULL AUTO_INCREMENT,
  `IslemTipi` varchar(50) COLLATE utf8mb4_turkish_ci DEFAULT NULL,
  `Aciklama` text COLLATE utf8mb4_turkish_ci,
  `IslemTarihi` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`LogID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `log_kayit`
--

LOCK TABLES `log_kayit` WRITE;
/*!40000 ALTER TABLE `log_kayit` DISABLE KEYS */;
INSERT INTO `log_kayit` VALUES (1,'INSERT','Randevu Hasta:1 Doktor:1','2026-05-12 18:42:44'),(2,'TRANSACTION','Yeni randevu oluşturuldu. HastaID:1 DoktorID:1 Tarih:2026-05-15 Saat:09:00','2026-05-12 18:42:44');
/*!40000 ALTER TABLE `log_kayit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `randevu`
--

DROP TABLE IF EXISTS `randevu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `randevu` (
  `RandevuID` int NOT NULL AUTO_INCREMENT,
  `RandevuTarihi` date NOT NULL,
  `RandevuSaati` time NOT NULL,
  `Durum` enum('Bekliyor','Onaylandi','Iptal') COLLATE utf8mb4_turkish_ci NOT NULL DEFAULT 'Bekliyor',
  `HastaID` int NOT NULL,
  `DoktorID` int NOT NULL,
  PRIMARY KEY (`RandevuID`),
  KEY `fk_randevu_hasta` (`HastaID`),
  KEY `fk_randevu_doktor` (`DoktorID`),
  CONSTRAINT `fk_randevu_doktor` FOREIGN KEY (`DoktorID`) REFERENCES `doktor` (`DoktorID`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_randevu_hasta` FOREIGN KEY (`HastaID`) REFERENCES `hasta` (`HastaID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `randevu`
--

LOCK TABLES `randevu` WRITE;
/*!40000 ALTER TABLE `randevu` DISABLE KEYS */;
INSERT INTO `randevu` VALUES (1,'2026-05-15','09:00:00','Onaylandi',1,1);
/*!40000 ALTER TABLE `randevu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rol`
--

DROP TABLE IF EXISTS `rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol` (
  `RolID` int NOT NULL AUTO_INCREMENT,
  `RolAdi` varchar(50) COLLATE utf8mb4_turkish_ci NOT NULL,
  PRIMARY KEY (`RolID`),
  UNIQUE KEY `RolAdi` (`RolAdi`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rol`
--

LOCK TABLES `rol` WRITE;
/*!40000 ALTER TABLE `rol` DISABLE KEYS */;
INSERT INTO `rol` VALUES (1,'Admin'),(3,'Doktor'),(2,'Sekreter');
/*!40000 ALTER TABLE `rol` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_aktif_randevular`
--

DROP TABLE IF EXISTS `vw_aktif_randevular`;
/*!50001 DROP VIEW IF EXISTS `vw_aktif_randevular`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_aktif_randevular` AS SELECT 
 1 AS `RandevuID`,
 1 AS `RandevuTarihi`,
 1 AS `RandevuSaati`,
 1 AS `Durum`,
 1 AS `Hasta`,
 1 AS `Doktor`,
 1 AS `Uzmanlik`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `yonetici`
--

DROP TABLE IF EXISTS `yonetici`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `yonetici` (
  `YoneticiID` int NOT NULL AUTO_INCREMENT,
  `KullaniciAdi` varchar(50) COLLATE utf8mb4_turkish_ci NOT NULL,
  `YSifre` varchar(255) COLLATE utf8mb4_turkish_ci NOT NULL,
  PRIMARY KEY (`YoneticiID`),
  UNIQUE KEY `KullaniciAdi` (`KullaniciAdi`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `yonetici`
--

LOCK TABLES `yonetici` WRITE;
/*!40000 ALTER TABLE `yonetici` DISABLE KEYS */;
INSERT INTO `yonetici` VALUES (1,'admin','240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');
/*!40000 ALTER TABLE `yonetici` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `vw_aktif_randevular`
--

/*!50001 DROP VIEW IF EXISTS `vw_aktif_randevular`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_aktif_randevular` AS select `r`.`RandevuID` AS `RandevuID`,`r`.`RandevuTarihi` AS `RandevuTarihi`,`r`.`RandevuSaati` AS `RandevuSaati`,`r`.`Durum` AS `Durum`,concat(`h`.`HAd`,' ',`h`.`HSoyad`) AS `Hasta`,concat(`d`.`DAd`,' ',`d`.`DSoyad`) AS `Doktor`,`d`.`Uzmanlik` AS `Uzmanlik` from ((`randevu` `r` join `hasta` `h` on((`r`.`HastaID` = `h`.`HastaID`))) join `doktor` `d` on((`r`.`DoktorID` = `d`.`DoktorID`))) where ((`r`.`Durum` <> 'Iptal') and (`h`.`AktifMi` = true)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-12 18:57:47
