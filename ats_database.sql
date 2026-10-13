-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: localhost    Database: ats_database
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('3dc89f45-88d6-491c-9dca-d5b7b07f67a6','63b9d537ba41a8b40d28fa67c235bc1d2696736300a47fb5453eb6e94bd648e8','2026-10-11 07:53:40.001','20261010000000_init_base_schema',NULL,NULL,'2026-10-11 07:53:39.469',1),('58530af3-ce21-47b5-8bc1-eadab433f701','c292e155db23d9530de87d08538112bb32b922d12bdb444f14a95918fe03d87e','2026-10-11 07:53:40.148','20261011_add_password_reset_and_token_version',NULL,NULL,'2026-10-11 07:53:40.005',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applications` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `candidate_profile_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_posting_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('SUBMITTED','SCREENING','SHORTLISTED','INTERVIEW_SCHEDULED','INTERVIEWED','OFFERED','HIRED','REJECTED','WITHDRAWN') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUBMITTED',
  `cover_letter` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ai_match_score` double DEFAULT NULL,
  `parsed_skills` json DEFAULT NULL,
  `ai_analysis_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `applied_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `applications_candidate_profile_id_job_posting_id_key` (`candidate_profile_id`,`job_posting_id`),
  KEY `applications_status_idx` (`status`),
  KEY `applications_ai_match_score_idx` (`ai_match_score`),
  KEY `applications_job_posting_id_fkey` (`job_posting_id`),
  CONSTRAINT `applications_candidate_profile_id_fkey` FOREIGN KEY (`candidate_profile_id`) REFERENCES `candidate_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `applications_job_posting_id_fkey` FOREIGN KEY (`job_posting_id`) REFERENCES `job_postings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applications`
--

LOCK TABLES `applications` WRITE;
/*!40000 ALTER TABLE `applications` DISABLE KEYS */;
INSERT INTO `applications` VALUES ('12a18476-1a44-4dd5-8163-59f6f67af997','8fdab2aa-7b9d-40fe-8b1c-c790bf5ae138','e17396e2-41d6-4270-9a57-53d9c2d0b7ad','HIRED',NULL,95.56,'[\"AWS\", \"CI/CD\", \"Docker\", \"Git\", \"Java\", \"JavaScript\", \"Kubernetes\", \"Microservices\", \"MySQL\", \"Oracle\", \"PostgreSQL\", \"RESTful API\", \"Redis\", \"SQL\", \"Spring Boot\", \"Tuyển dụng\", \"Unit Testing\"]','{\"summary\":\"Ứng viên đạt 95.6% điểm phù hợp (rất phù hợp xuất sắc) cho vị trí \'Backend Developer (Java Spring Boot)\'. Về chuyên môn: Phù hợp đúng ngành \'IT & Phần mềm\' (Điểm chuyên môn: 95%). Kỹ năng đạt 100%, đáp ứng tốt: CI/CD, Docker, Git, Java và 7 kỹ năng khác. Kinh nghiệm: Đạt 4 năm, đáp ứng tốt yêu cầu tối thiểu (3 năm). Học vấn: Chuyên ngành \'IT & Khoa học máy tính\' (Điểm học vấn: 100%). Đề xuất: Khuyến nghị ưu tiên mời phỏng vấn.\",\"score_breakdown\":{\"skill_score\":100,\"experience_score\":100,\"semantic_score\":70.61,\"domain_score\":95,\"education_score\":100},\"matched_skills\":[\"CI/CD\",\"Docker\",\"Git\",\"Java\",\"Kubernetes\",\"Microservices\",\"MySQL\",\"PostgreSQL\",\"RESTful API\",\"Redis\",\"Spring Boot\"],\"missing_skills\":[],\"warnings\":[],\"experience_years\":4,\"experience_gap\":1}','2026-10-13 07:48:44.121','2026-10-13 11:56:00.743'),('1c1fb6c9-f7d8-4311-b5f4-ceab31349752','1d9ebf86-ebea-4e7b-889c-620455bb98f8','cb12a27f-7974-43d1-ac89-10d48cf39acb','WITHDRAWN',NULL,51.06,'[\"Bootstrap\", \"CSS\", \"Figma\", \"Git\", \"HTML\", \"JavaScript\", \"RESTful API\", \"React\", \"Tailwind CSS\", \"TypeScript\"]','Ứng viên đạt 51.1% điểm phù hợp (đáp ứng mức cơ bản) cho vị trí \'Lập trình viên Fullstack Node.js\'. Về chuyên môn: Phù hợp đúng ngành \'IT & Phần mềm\' (Điểm chuyên môn: 95%). Kỹ năng đạt 50%, đáp ứng tốt: JavaScript, React. Cần lưu ý thiếu: Express, Node.js. Kinh nghiệm: Có 1 năm kinh nghiệm, còn thiếu 1 năm so với yêu cầu tối thiểu (2 năm). Học vấn: Chuyên ngành \'IT & Khoa học máy tính\' (Điểm học vấn: 90%). Lưu ý cho HR: Thiếu 1 năm kinh nghiệm so với yêu cầu tối thiểu của vị trí (2 năm). | Chưa thể hiện các kỹ năng quan trọng trong JD: Express, Node.js. Đề xuất: Cần phỏng vấn kỹ về các kỹ năng và kinh nghiệm còn thiếu.','2026-10-12 19:50:36.509','2026-10-13 10:19:24.859'),('2f5ebaae-c484-43e3-9dc7-6dca0425ebe1','0ceba18d-ee16-4b88-b31b-50b28fd118df','135d46e6-c0de-4636-85b4-579efcffa8fb','INTERVIEW_SCHEDULED',NULL,3.52,'[\"ASP.NET\", \"Agile\", \"C\", \"C#\", \"CSS\", \"Express\", \"FastAPI\", \"Git\", \"HTML\", \"Java\", \"JavaScript\", \"MySQL\", \"NLP\", \"Next.js\", \"Node.js\", \"PHP\", \"Prisma\", \"Python\", \"RESTful API\", \"React\", \"SQL\", \"SQL Server\", \"Sentence-Transformers\", \"Spring Boot\", \"Tailwind CSS\", \"Tuyển dụng\", \"TypeScript\", \"spaCy\"]','Ứng viên đạt 3.5% điểm phù hợp (không phù hợp / lệch chuyên môn nghiêm trọng) cho vị trí \'Nhân viên Kế toán Tổng hợp (Senior Accountant).\'. Về chuyên môn: Hồ sơ thuộc lĩnh vực \'IT & Phần mềm\', lệch hoàn toàn so với yêu cầu \'Kế toán & Tài chính\' (Điểm chuyên môn: 5%). Kỹ năng đạt 0%, chưa tìm thấy kỹ năng yêu cầu nào phù hợp. Cần lưu ý thiếu: Báo cáo tài chính, Excel, Kiểm toán. Kinh nghiệm: Ứng viên có 3 năm làm việc nhưng là kinh nghiệm trái ngành, không đáp ứng yêu cầu 5 năm kinh nghiệm chuyên môn. Học vấn: Chuyên ngành \'IT & Khoa học máy tính\' (Điểm học vấn: 20%). Lưu ý cho HR: Chuyên môn khác ngành: Ứng viên thuộc lĩnh vực \'IT & Phần mềm\', trong khi vị trí tuyển dụng yêu cầu chuyên môn \'Kế toán & Tài chính. | Kinh nghiệm làm việc (3 năm) không thuộc lĩnh vực \'Kế toán & Tài chính\' nên không được tính điểm chuyên môn liên quan. Đề xuất: Không khuyến nghị phỏng vấn do trái ngành hoặc thiếu điều kiện tiên quyết.','2026-10-13 07:36:39.287','2026-10-13 11:43:15.508'),('307e5110-b927-400c-a105-3f2fd744f0e1','8fdab2aa-7b9d-40fe-8b1c-c790bf5ae138','7aca691a-af88-4041-ac50-b061531bec7f','INTERVIEWED',NULL,96.85,'[\"ASP.NET\", \"Báo cáo tài chính\", \"Excel\", \"Kiểm toán\", \"Kế toán thuế\", \"Kế toán tổng hợp\", \"MISA\", \"Phân tích tài chính\", \"Quản lý ngân sách\", \"SAP\"]','Ứng viên đạt 96.8% điểm phù hợp (rất phù hợp xuất sắc) cho vị trí \'Nhân viên Kế toán Tổng hợp (Senior Accountant).\'. Về chuyên môn: Phù hợp đúng ngành \'Kế toán & Tài chính\' (Điểm chuyên môn: 95%). Kỹ năng đạt 100%, đáp ứng tốt: Báo cáo tài chính, Excel, Kiểm toán, Kế toán thuế và 3 kỹ năng khác. Kinh nghiệm: Đạt 7 năm, đáp ứng tốt yêu cầu tối thiểu (5 năm). Học vấn: Chuyên ngành \'Kế toán\' (Điểm học vấn: 100%). Đề xuất: Khuyến nghị ưu tiên mời phỏng vấn.','2026-10-13 07:40:49.683','2026-10-13 11:49:58.377'),('4dbe67e2-48a1-4971-ac46-f9c0eeee4791','1d9ebf86-ebea-4e7b-889c-620455bb98f8','7aca691a-af88-4041-ac50-b061531bec7f','SCREENING',NULL,5.62,'[\"Bootstrap\", \"CSS\", \"Figma\", \"Git\", \"HTML\", \"JavaScript\", \"RESTful API\", \"React\", \"Tailwind CSS\", \"TypeScript\"]','{\"summary\":\"Ứng viên đạt 5.6% điểm phù hợp (không phù hợp / lệch chuyên môn nghiêm trọng) cho vị trí \'Nhân viên Kế toán Tổng hợp (Senior Accountant).\'. Về chuyên môn: Hồ sơ thuộc lĩnh vực \'IT & Phần mềm\', lệch hoàn toàn so với yêu cầu \'Kế toán & Tài chính\' (Điểm chuyên môn: 5%). Kỹ năng đạt 0%, chưa tìm thấy kỹ năng yêu cầu nào phù hợp. Cần lưu ý thiếu: Báo cáo tài chính, Excel, Kiểm toán. Kinh nghiệm: Ứng viên có 1 năm làm việc nhưng là kinh nghiệm trái ngành, không đáp ứng yêu cầu 5 năm kinh nghiệm chuyên môn. Học vấn: Chuyên ngành \'IT & Khoa học máy tính\' (Điểm học vấn: 20%). Lưu ý cho HR: Chuyên môn khác ngành: Ứng viên thuộc lĩnh vực \'IT & Phần mềm\', trong khi vị trí tuyển dụng yêu cầu chuyên môn \'Kế toán & Tài chính. | Kinh nghiệm làm việc (1 năm) không thuộc lĩnh vực \'Kế toán & Tài chính\' nên không được tính điểm chuyên môn liên quan. Đề xuất: Không khuyến nghị phỏng vấn do trái ngành hoặc thiếu điều kiện tiên quyết.\",\"score_breakdown\":{\"skill_score\":0,\"experience_score\":0,\"semantic_score\":21.2,\"domain_score\":5,\"education_score\":20},\"matched_skills\":[],\"missing_skills\":[\"Báo cáo tài chính\",\"Excel\",\"Kiểm toán\",\"Kế toán thuế\",\"Kế toán tổng hợp\",\"MISA\",\"SAP\"],\"warnings\":[\"Chuyên môn khác ngành: Ứng viên thuộc lĩnh vực \'IT & Phần mềm\', trong khi vị trí tuyển dụng yêu cầu chuyên môn \'Kế toán & Tài chính.\",\"Kinh nghiệm làm việc (1 năm) không thuộc lĩnh vực \'Kế toán & Tài chính\' nên không được tính điểm chuyên môn liên quan.\",\"Thiếu 4 năm kinh nghiệm so với yêu cầu tối thiểu của vị trí (5 năm).\",\"Chưa thể hiện các kỹ năng quan trọng trong JD: Báo cáo tài chính, Excel, Kiểm toán.\",\"Chuyên ngành học vấn (IT & Khoa học máy tính) không khớp với yêu cầu của vị trí.\"],\"experience_years\":1,\"experience_gap\":-4}','2026-10-12 20:01:44.618','2026-10-13 11:23:40.484'),('70173397-11aa-469a-8d3b-969f59b37604','1d9ebf86-ebea-4e7b-889c-620455bb98f8','c4da2c8c-4c80-454a-aa19-ee11c3546952','SCREENING',NULL,82.72,'[\"Express\", \"JavaScript\", \"MySQL\", \"Node.js\", \"React\"]','Ứng viên phù hợp tốt với vị trí \'Lập trình viên Fullstack Node.js\' (Điểm tổng hợp: 82.7%). Kỹ năng đạt 100%, sở hữu các năng lực cốt lõi: Express, JavaScript, MySQL, Node.js và 1 kỹ năng khác.','2026-10-12 19:55:38.604','2026-10-12 19:55:38.628'),('8c69edf8-2f32-4a75-8f71-f2e1012754b2','1d9ebf86-ebea-4e7b-889c-620455bb98f8','135d46e6-c0de-4636-85b4-579efcffa8fb','WITHDRAWN',NULL,5.54,'[\"Bootstrap\", \"CSS\", \"Figma\", \"Git\", \"HTML\", \"JavaScript\", \"RESTful API\", \"React\", \"Tailwind CSS\", \"TypeScript\"]','Ứng viên đạt 5.5% điểm phù hợp (không phù hợp / lệch chuyên môn nghiêm trọng) cho vị trí \'Nhân viên Kế toán Tổng hợp (Senior Accountant).\'. Về chuyên môn: Hồ sơ thuộc lĩnh vực \'IT & Phần mềm\', lệch hoàn toàn so với yêu cầu \'Kế toán & Tài chính\' (Điểm chuyên môn: 5%). Kỹ năng đạt 0%, chưa tìm thấy kỹ năng yêu cầu nào phù hợp. Cần lưu ý thiếu: Báo cáo tài chính, Excel, Kiểm toán. Kinh nghiệm: Ứng viên có 1 năm làm việc nhưng là kinh nghiệm trái ngành, không đáp ứng yêu cầu 5 năm kinh nghiệm chuyên môn. Học vấn: Chuyên ngành \'IT & Khoa học máy tính\' (Điểm học vấn: 20%). Lưu ý cho HR: Chuyên môn khác ngành: Ứng viên thuộc lĩnh vực \'IT & Phần mềm\', trong khi vị trí tuyển dụng yêu cầu chuyên môn \'Kế toán & Tài chính. | Kinh nghiệm làm việc (1 năm) không thuộc lĩnh vực \'Kế toán & Tài chính\' nên không được tính điểm chuyên môn liên quan. Đề xuất: Không khuyến nghị phỏng vấn do trái ngành hoặc thiếu điều kiện tiên quyết.','2026-10-13 07:19:50.509','2026-10-13 10:19:30.857'),('96880e0e-3527-4cad-8654-8ef1273e8070','8fdab2aa-7b9d-40fe-8b1c-c790bf5ae138','cb12a27f-7974-43d1-ac89-10d48cf39acb','SCREENING',NULL,NULL,NULL,NULL,'2026-10-12 19:38:52.895','2026-10-12 19:49:27.069'),('9ea2138d-ecc3-42bd-9105-77218b53624c','8fdab2aa-7b9d-40fe-8b1c-c790bf5ae138','c4da2c8c-4c80-454a-aa19-ee11c3546952','SCREENING',NULL,81.34,'[\"JavaScript\", \"Node.js\", \"React\", \"Redux\"]','Ứng viên phù hợp tốt với vị trí \'Lập trình viên Fullstack Node.js\' (Điểm tổng hợp: 81.3%). Kỹ năng đạt 100%, sở hữu các năng lực cốt lõi: JavaScript, Node.js, React, Redux.','2026-10-12 19:57:43.095','2026-10-12 19:57:43.349'),('d43e9898-0750-41db-954f-00c5dce38f5b','8fdab2aa-7b9d-40fe-8b1c-c790bf5ae138','135d46e6-c0de-4636-85b4-579efcffa8fb','SCREENING',NULL,5.63,'[\"AWS\", \"CI/CD\", \"Docker\", \"Git\", \"Java\", \"JavaScript\", \"Kubernetes\", \"Microservices\", \"MySQL\", \"Oracle\", \"PostgreSQL\", \"RESTful API\", \"Redis\", \"SQL\", \"Spring Boot\", \"Tuyển dụng\", \"Unit Testing\"]','Ứng viên đạt 5.6% điểm phù hợp (không phù hợp / lệch chuyên môn nghiêm trọng) cho vị trí \'Nhân viên Kế toán Tổng hợp (Senior Accountant).\'. Về chuyên môn: Hồ sơ thuộc lĩnh vực \'IT & Phần mềm\', lệch hoàn toàn so với yêu cầu \'Kế toán & Tài chính\' (Điểm chuyên môn: 5%). Kỹ năng đạt 0%, chưa tìm thấy kỹ năng yêu cầu nào phù hợp. Cần lưu ý thiếu: Báo cáo tài chính, Excel, Kiểm toán. Kinh nghiệm: Ứng viên có 4 năm làm việc nhưng là kinh nghiệm trái ngành, không đáp ứng yêu cầu 5 năm kinh nghiệm chuyên môn. Học vấn: Chuyên ngành \'IT & Khoa học máy tính\' (Điểm học vấn: 20%). Lưu ý cho HR: Chuyên môn khác ngành: Ứng viên thuộc lĩnh vực \'IT & Phần mềm\', trong khi vị trí tuyển dụng yêu cầu chuyên môn \'Kế toán & Tài chính. | Kinh nghiệm làm việc (4 năm) không thuộc lĩnh vực \'Kế toán & Tài chính\' nên không được tính điểm chuyên môn liên quan. Đề xuất: Không khuyến nghị phỏng vấn do trái ngành hoặc thiếu điều kiện tiên quyết.','2026-10-13 07:33:50.433','2026-10-13 10:19:35.887'),('e09943e1-7d3a-44f7-823c-cf3654f27038','1d9ebf86-ebea-4e7b-889c-620455bb98f8','e17396e2-41d6-4270-9a57-53d9c2d0b7ad','OFFERED',NULL,36.29,'[\"Bootstrap\", \"CSS\", \"Figma\", \"Git\", \"HTML\", \"JavaScript\", \"RESTful API\", \"React\", \"Tailwind CSS\", \"TypeScript\"]','Ứng viên đạt 36.3% điểm phù hợp (độ phù hợp thấp, còn nhiều thiếu sót) cho vị trí \'Backend Developer (Java Spring Boot)\'. Về chuyên môn: Phù hợp đúng ngành \'IT & Phần mềm\' (Điểm chuyên môn: 95%). Kỹ năng đạt 18%, đáp ứng tốt: Git, RESTful API. Cần lưu ý thiếu: CI/CD, Docker, Java. Kinh nghiệm: Có 1 năm kinh nghiệm, còn thiếu 2 năm so với yêu cầu tối thiểu (3 năm). Học vấn: Chuyên ngành \'IT & Khoa học máy tính\' (Điểm học vấn: 100%). Lưu ý cho HR: Thiếu 2 năm kinh nghiệm so với yêu cầu tối thiểu của vị trí (3 năm). | Chưa thể hiện các kỹ năng quan trọng trong JD: CI/CD, Docker, Java. Đề xuất: Chưa đáp ứng tốt tiêu chí, cần cân nhắc kỹ trước khi liên hệ.','2026-10-13 07:45:07.532','2026-10-13 11:50:01.483');
/*!40000 ALTER TABLE `applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_profiles`
--

DROP TABLE IF EXISTS `candidate_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_profiles` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` datetime(3) DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cv_file_url` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `parsed_skills` json DEFAULT NULL,
  `experience_years` int DEFAULT NULL,
  `education` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidate_profiles_user_id_key` (`user_id`),
  CONSTRAINT `candidate_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_profiles`
--

LOCK TABLES `candidate_profiles` WRITE;
/*!40000 ALTER TABLE `candidate_profiles` DISABLE KEYS */;
INSERT INTO `candidate_profiles` VALUES ('0ceba18d-ee16-4b88-b31b-50b28fd118df','2354ee7e-b751-4f29-86cf-93994df688a6',NULL,NULL,NULL,NULL,'/uploads/cv/cv_2354ee7e-b751-4f29-86cf-93994df688a6_1791876999262.pdf',NULL,NULL,NULL,'2026-10-12 19:59:09.244','2026-10-13 11:46:17.556'),('1d9ebf86-ebea-4e7b-889c-620455bb98f8','6f58ac87-4438-4659-b848-001db9f02c8f',NULL,NULL,NULL,NULL,'/uploads/cv/cv_6f58ac87-4438-4659-b848-001db9f02c8f_1791877507512.pdf',NULL,NULL,NULL,'2026-10-12 19:50:20.030','2026-10-13 07:45:07.521'),('26ecc769-14c0-4c87-8926-8109b050919f','58402034-1843-4b99-ae44-c9022ae87999',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 08:15:09.430','2026-10-11 08:15:09.430'),('2f7900f9-432f-4e25-bd51-bddba161ddb8','ce26bdee-34ae-4e44-9255-8015c92afda7','0987654321',NULL,'Hà Nội, Việt Nam',NULL,NULL,NULL,3,'Đại học Bách Khoa','2026-10-11 07:56:04.679','2026-10-11 07:56:04.824'),('2fd2cca4-d787-4eed-8944-a266e5635a58','be32b292-0247-41b4-8e4b-c90c82b225bc',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 08:42:43.022','2026-10-11 08:42:43.022'),('325cf8ab-e1a7-48db-862d-947cf7da1eab','dfa8a9e1-9bac-471a-9a47-4f90afbe37fc','0987654321',NULL,'Hà Nội, Việt Nam',NULL,NULL,NULL,3,'Đại học Bách Khoa','2026-10-11 08:16:33.659','2026-10-11 08:16:33.813'),('3a37f98a-3eac-4ab2-b17f-1d7b2d5e0eb0','885d0412-2e15-47f3-8d16-5f926c7d79bb',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 08:15:24.074','2026-10-11 08:15:24.074'),('3c8bf9fb-93c6-4cf0-83c8-f592af8e7664','da811584-4778-4e04-85da-5e5605d69d1c','0987654321',NULL,'Hà Nội, Việt Nam',NULL,NULL,NULL,3,'Đại học Bách Khoa','2026-10-11 07:55:44.966','2026-10-11 07:55:45.132'),('4b893207-4ef6-4b1d-a05c-a7093f49139a','5bd45c08-c9a4-4278-928e-ea83d5a6e0cb',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 08:43:41.946','2026-10-11 08:43:41.946'),('50a8ae9b-8db9-4e33-ab79-832f0525e5f2','d943c114-6c05-44bc-9fd6-1f20ca843cac',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 08:43:37.832','2026-10-11 08:43:37.832'),('5798ce74-ecdf-47e0-802b-3766fa443d32','324d8f45-1fbf-4065-8ba0-04e38df96a22',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 08:30:38.185','2026-10-11 08:30:38.185'),('5aa7f9d4-cd86-4cbe-bc9e-33b7378837be','2948a8c3-91a6-43f4-bf03-a099701d16b4','0987654321',NULL,'Hà Nội, Việt Nam',NULL,NULL,NULL,3,'Đại học Bách Khoa','2026-10-11 08:43:54.946','2026-10-11 08:43:55.098'),('6a6f2e7e-a492-4949-b9a9-2e8d58c718da','76f70a66-2508-473b-9487-654fc5f9cdc9','0987654321',NULL,'Hà Nội, Việt Nam',NULL,NULL,NULL,3,'Đại học Bách Khoa','2026-10-11 07:57:05.715','2026-10-11 07:57:05.857'),('7fdef33e-5583-41f2-b022-31398c6b8388','faa73d9d-c7e0-42c0-93cc-89de0ee8879e','0987654321',NULL,'Hà Nội, Việt Nam',NULL,NULL,NULL,3,'Đại học Bách Khoa','2026-10-11 09:15:12.748','2026-10-11 09:15:12.920'),('8fdab2aa-7b9d-40fe-8b1c-c790bf5ae138','7e9dd70c-7860-4798-bf44-feb94af44e02','0988593485','2026-10-13 00:00:00.000','Nhà 1055 Xóm 4 Đông Dư Gia Lâm Hà Nội','Đi tù','/uploads/cv/cv_7e9dd70c-7860-4798-bf44-feb94af44e02_1791877724096.pdf',NULL,1,'Công Nghệ Giao Thông Vận Tải','2026-10-11 08:19:46.130','2026-10-13 07:48:44.107'),('a02c4aa9-7874-46c3-8cc2-d682d6b32aee','02a132b7-8968-4d36-ae2a-cbf18b317876',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 08:42:48.748','2026-10-11 08:42:48.748'),('a423f679-4101-4586-91cb-9df216b6565d','168cb810-8bef-4f06-a1da-689ca8517a31','0987654321',NULL,'Hà Nội, Việt Nam',NULL,NULL,NULL,3,'Đại học Bách Khoa','2026-10-11 07:56:20.376','2026-10-11 07:56:20.521'),('a8b57c9b-0c58-493d-a9c3-6e2282050f50','e06683b5-ce1e-4ad9-b965-a800e90024a3',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 08:31:45.363','2026-10-11 08:31:45.363'),('ca259c15-03eb-44c5-90a9-19f9220f2d41','b4f80743-1bc2-405e-8056-ac7561fe38e8',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 08:15:36.994','2026-10-11 08:15:36.994'),('cd1273fb-17e3-40ac-b233-4af9b65d2e8f','6cadb07a-b904-4260-9727-5758d3668619','0987654321',NULL,'Hà Nội, Việt Nam',NULL,NULL,NULL,3,'Đại học Bách Khoa','2026-10-11 07:56:43.915','2026-10-11 07:56:44.065'),('d739a630-f44f-4abe-9b62-e7b587f56c94','69f05569-7312-4a15-bd92-80eb378c0b25',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-11 07:54:42.377','2026-10-11 07:54:42.377'),('e75fbfd7-2b67-4ebf-bf2f-1efa31e83e39','375fb29c-3feb-44f8-8c3d-7502cbb2112f','0832222233','2005-12-02 00:00:00.000','Hòa Lạc','IT Egineer',NULL,NULL,2,'Đại Học Bách Khoa Hà Nội','2026-10-11 09:22:50.418','2026-10-11 09:24:01.314');
/*!40000 ALTER TABLE `candidate_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `interviews`
--

DROP TABLE IF EXISTS `interviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `interviews` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `interviewer_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheduled_at` datetime(3) NOT NULL,
  `duration_minutes` int NOT NULL DEFAULT '60',
  `location` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meeting_url` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SCHEDULED',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rating` int DEFAULT NULL,
  `feedback` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `interviews_scheduled_at_idx` (`scheduled_at`),
  KEY `interviews_application_id_idx` (`application_id`),
  KEY `interviews_interviewer_id_fkey` (`interviewer_id`),
  CONSTRAINT `interviews_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `interviews_interviewer_id_fkey` FOREIGN KEY (`interviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `interviews`
--

LOCK TABLES `interviews` WRITE;
/*!40000 ALTER TABLE `interviews` DISABLE KEYS */;
INSERT INTO `interviews` VALUES ('24ad3b59-0ec5-4eb0-8cbd-db3afb0e9fdd','12a18476-1a44-4dd5-8163-59f6f67af997','e06683b5-ce1e-4ad9-b965-a800e90024a3','2026-12-02 14:21:00.000',60,NULL,NULL,'COMPLETED',NULL,4,'Tốt','2026-10-13 09:08:00.198','2026-10-13 09:10:12.473'),('530951f6-5c2c-452a-9a88-0c45af1eb037','e09943e1-7d3a-44f7-823c-cf3654f27038','e06683b5-ce1e-4ad9-b965-a800e90024a3','2026-12-20 23:12:00.000',60,NULL,'https://chatgpt.com/','CANCELLED',NULL,NULL,NULL,'2026-10-13 11:09:40.268','2026-10-13 11:49:43.855'),('a7f49783-545c-426d-8792-97e95a810bd7','2f5ebaae-c484-43e3-9dc7-6dca0425ebe1','e06683b5-ce1e-4ad9-b965-a800e90024a3','2026-10-13 12:00:00.000',60,NULL,'https://zoom.us/j/2523823851?pwd=4RLDfm9jt4KAybcaAYnOGBTrFnDQgB.1','SCHEDULED','Vào zoom tiếng anh',NULL,NULL,'2026-10-13 11:43:15.494','2026-10-13 11:43:15.494');
/*!40000 ALTER TABLE `interviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_postings`
--

DROP TABLE IF EXISTS `job_postings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_postings` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employment_type` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `requirements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `salary_min` decimal(12,2) DEFAULT NULL,
  `salary_max` decimal(12,2) DEFAULT NULL,
  `status` enum('DRAFT','PUBLISHED','CLOSED','ARCHIVED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `posted_by_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_deadline` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `job_postings_status_idx` (`status`),
  KEY `job_postings_posted_by_id_idx` (`posted_by_id`),
  CONSTRAINT `job_postings_posted_by_id_fkey` FOREIGN KEY (`posted_by_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_postings`
--

LOCK TABLES `job_postings` WRITE;
/*!40000 ALTER TABLE `job_postings` DISABLE KEYS */;
INSERT INTO `job_postings` VALUES ('135d46e6-c0de-4636-85b4-579efcffa8fb','Nhân viên Kế toán Tổng hợp (Senior Accountant).','Marketing & Truyền thông','Hà Nội','FULL_TIME','Quản lý và kiểm soát toàn bộ hoạt động kế toán, tài chính của doanh nghiệp.\n\nLập báo cáo tài chính, báo cáo thuế GTGT, thuế TNCN và thuế TNDN theo quy định.\n\nThực hiện hạch toán các nghiệp vụ kế toán trên phần mềm MISA và SAP.\n\nKiểm tra chứng từ, hóa đơn, đối chiếu công nợ và quản lý dòng tiền.\n\nPhối hợp với cơ quan thuế và kiểm toán trong quá trình thanh tra, quyết toán.','Tốt nghiệp Đại học chuyên ngành Kế toán, Kiểm toán hoặc Tài chính.\n\nCó tối thiểu 5 năm kinh nghiệm làm kế toán tổng hợp.\n\nThành thạo phần mềm kế toán MISA, SAP ERP.\n\nNắm vững chuẩn mực kế toán Việt Nam (VAS), IFRS và các quy định pháp luật về thuế.\n\nCó chứng chỉ CPA hoặc ACCA là một lợi thế.\n\nThành thạo Excel nâng cao, lập báo cáo tài chính và phân tích dòng tiền.\n\nCó kinh nghiệm quyết toán thuế và làm việc trực tiếp với cơ quan thuế.\n\nCó khả năng làm việc toàn thời gian (Full-time).',14000000.00,18000000.00,'PUBLISHED','324d8f45-1fbf-4065-8ba0-04e38df96a22',NULL,'2026-10-13 07:18:28.416','2026-10-13 07:18:28.416'),('7aca691a-af88-4041-ac50-b061531bec7f','Nhân viên Kế toán Tổng hợp (Senior Accountant).','Kinh doanh','Hà Nội','FULL_TIME','Mô tả công việc (Job Description)\n\nQuản lý và kiểm soát toàn bộ hoạt động kế toán, tài chính của doanh nghiệp.\n\nLập báo cáo tài chính, báo cáo thuế GTGT, thuế TNCN và thuế TNDN theo quy định.\n\nThực hiện hạch toán các nghiệp vụ kế toán trên phần mềm MISA và SAP.\n\nKiểm tra chứng từ, hóa đơn, đối chiếu công nợ và quản lý dòng tiền.\n\nPhối hợp với cơ quan thuế và kiểm toán trong quá trình thanh tra, quyết toán.','Yêu cầu ứng viên (Requirements & Skills)\n\nTốt nghiệp Đại học chuyên ngành Kế toán, Kiểm toán hoặc Tài chính.\n\nCó tối thiểu 5 năm kinh nghiệm làm kế toán tổng hợp.\n\nThành thạo phần mềm kế toán MISA, SAP ERP.\n\nNắm vững chuẩn mực kế toán Việt Nam (VAS), IFRS và các quy định pháp luật về thuế.\n\nCó chứng chỉ CPA hoặc ACCA là một lợi thế.\n\nThành thạo Excel nâng cao, lập báo cáo tài chính và phân tích dòng tiền.\n\nCó kinh nghiệm quyết toán thuế và làm việc trực tiếp với cơ quan thuế.\n\nCó khả năng làm việc toàn thời gian (Full-time).',2000000.00,2500000.00,'PUBLISHED','e06683b5-ce1e-4ad9-b965-a800e90024a3',NULL,'2026-10-12 20:01:20.431','2026-10-12 20:01:20.431'),('c4da2c8c-4c80-454a-aa19-ee11c3546952','Lập trình viên Fullstack Node.js','Kỹ thuật Công nghệ','Hà Nội','FULL_TIME','Phát triển hệ thống ATS, thành thạo React và Express.','Ít nhất 2 năm kinh nghiệm\nĐại học bách khoa càng tốt\nlàm full time được',15000000.00,25000000.00,'PUBLISHED','e06683b5-ce1e-4ad9-b965-a800e90024a3',NULL,'2026-10-12 19:55:12.629','2026-10-12 19:55:12.629'),('cb12a27f-7974-43d1-ac89-10d48cf39acb','Lập trình viên Fullstack Node.js','Kỹ thuật Công nghệ','Hà Nội','FULL_TIME','Phát triển hệ thống ATS, thành thạo React và Express.','Có ít nhất 2 năm kinh nghiệm\nThông thạo Tiếng Anh',15000000.00,25000000.00,'PUBLISHED','e06683b5-ce1e-4ad9-b965-a800e90024a3','2026-12-01 00:00:00.000','2026-10-12 19:24:51.700','2026-10-12 19:24:51.700'),('e17396e2-41d6-4270-9a57-53d9c2d0b7ad','Backend Developer (Java Spring Boot)','Kỹ thuật Công nghệ','Hà Nội','FULL_TIME','Phát triển và bảo trì hệ thống Backend sử dụng Java và Spring Boot.\n\nThiết kế, xây dựng và tối ưu RESTful API phục vụ các ứng dụng Web và Mobile.\n\nLàm việc với cơ sở dữ liệu PostgreSQL, MySQL và Redis.\n\nXây dựng kiến trúc Microservices, tích hợp các dịch vụ bên thứ ba.\n\nTriển khai ứng dụng bằng Docker, Kubernetes và CI/CD.\n\nPhối hợp với Frontend Developer, QA và DevOps để đảm bảo chất lượng sản phẩm.\n\nĐọc hiểu tài liệu kỹ thuật bằng tiếng Anh và trao đổi công việc với khách hàng quốc tế.','Tốt nghiệp Đại học chuyên ngành Công nghệ thông tin, Khoa học máy tính hoặc Kỹ thuật phần mềm.\n\nTối thiểu 3 năm kinh nghiệm phát triển Backend.\n\nBắt buộc thành thạo Java 17+, Spring Boot và Spring Security.\n\nCó kinh nghiệm xây dựng RESTful API và kiến trúc Microservices.\n\nThành thạo PostgreSQL hoặc MySQL.\n\nCó kinh nghiệm sử dụng Redis, Docker, Git.\n\nHiểu biết về JWT, OAuth2 và bảo mật ứng dụng.\n\nCó kiến thức về CI/CD, Kubernetes là một lợi thế.\n\nTiếng Anh tối thiểu B2 hoặc IELTS 5.5, có khả năng đọc tài liệu kỹ thuật và giao tiếp trong công việc.\n\nCó kỹ năng giải quyết vấn đề, làm việc nhóm.\n\nCó thể làm việc Full-time.',18500000.00,20500000.00,'PUBLISHED','e06683b5-ce1e-4ad9-b965-a800e90024a3',NULL,'2026-10-13 07:43:18.695','2026-10-13 07:43:18.695');
/*!40000 ALTER TABLE `job_postings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `used_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_reset_tokens_token_hash_key` (`token_hash`),
  KEY `password_reset_tokens_user_id_idx` (`user_id`),
  CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES ('04ef5a33-7c40-47ed-aa94-ae4408d3dba5','5bd45c08-c9a4-4278-928e-ea83d5a6e0cb','b67e8c54f407a391d6e5870643c5210a657dc8ac8f835a75c4006766add228e5','2026-10-11 08:58:49.151',NULL,'2026-10-11 08:43:49.153'),('08ca8b45-e5e6-4b7d-9925-50a586b0df17','d943c114-6c05-44bc-9fd6-1f20ca843cac','c9d9615b4482ff0df2781a92f49b11866a8a2ed798d5820a6db5f0e88c401fe0','2026-10-11 08:58:41.668','2026-10-11 08:43:41.688','2026-10-11 08:43:41.669'),('2fda52ac-1ad8-40d2-91d6-ab06c0093d01','e06683b5-ce1e-4ad9-b965-a800e90024a3','9b7aa799878fb9db183b65bbf41b97c49ea9195d411eb0296a93d81f2b9e5a51','2026-10-11 08:51:24.765',NULL,'2026-10-11 08:36:24.766'),('320f01ee-434d-4eb1-bb0c-0e2b6db55b7d','168cb810-8bef-4f06-a1da-689ca8517a31','c558f0d5904492a2b9905cb7d4bc722ccabf37ebbc26275a130b405d2b974ff4','2026-10-11 08:11:20.789',NULL,'2026-10-11 07:56:20.790'),('38589cba-b408-4255-a6f4-bce1f1d67e9b','5bd45c08-c9a4-4278-928e-ea83d5a6e0cb','5e79678ff6bc22164c209520f9944fe4bc2a2adacd6da311d7bf717ea8ce73d1','2026-10-11 08:58:44.845',NULL,'2026-10-11 08:43:44.846'),('473c0745-7ae7-43af-939c-d0c49525024d','be32b292-0247-41b4-8e4b-c90c82b225bc','009e2da07cfa542d65c760eb379a89632663534dc8afbee668ba5e1da2aa92c3','2026-10-11 08:57:48.490','2026-10-11 08:42:48.508','2026-10-11 08:42:48.492'),('4bef722e-329e-4756-83e8-bc05ad51cc82','e06683b5-ce1e-4ad9-b965-a800e90024a3','20ef272699a80573ba3eb3aa95cbe22cffed4d0d615505832e1367b52309890e','2026-10-11 08:51:21.968',NULL,'2026-10-11 08:36:21.970'),('4fbbaf88-7f02-4fa1-ae40-23a3b936ccf6','7e9dd70c-7860-4798-bf44-feb94af44e02','9dca477a59cec1b02961aea9c01dfff44ff72569aee50b3024e9559aca27eba6','2026-10-11 08:51:36.645',NULL,'2026-10-11 08:36:36.647'),('545cf6d1-9f59-4318-a07f-f1c8633a5e8b','02a132b7-8968-4d36-ae2a-cbf18b317876','21fe8cd112d814a1f0b7710842ac6c9b9c1e499e954d0ec32db419ef4ba6bdf4','2026-10-11 08:57:51.625',NULL,'2026-10-11 08:42:51.627'),('764ba33a-8816-4a87-855c-0f71cbe66007','324d8f45-1fbf-4065-8ba0-04e38df96a22','510fb32cd423a0380c811255037c1c57c19cee072819d37e4b171e77c4ebea45','2026-10-11 08:57:00.457',NULL,'2026-10-11 08:42:00.465'),('89911dea-3b31-485a-89da-87bf0a2419cf','7e9dd70c-7860-4798-bf44-feb94af44e02','43a1efbac47c4a710a52f29f2f6214bfdd24fe337402e4989433980b8d764da1','2026-10-11 09:07:53.897',NULL,'2026-10-11 08:52:53.904'),('8ade07fc-8213-4efd-83d7-4b16c8bba79e','dfa8a9e1-9bac-471a-9a47-4f90afbe37fc','8173a203d681b0fe4982c0f6b1b2561528130aff86bdc7e16724ab7bb5826793','2026-10-11 08:31:34.085','2026-10-11 08:16:34.104','2026-10-11 08:16:34.087'),('8d1ae71c-10ee-4b99-9077-63a2cb923453','7e9dd70c-7860-4798-bf44-feb94af44e02','111296802b2a575be751c3f320307159177895ce4d5fddc59ac03443b3b20257','2026-10-11 09:10:07.380',NULL,'2026-10-11 08:55:07.387'),('95150b4d-ea62-4eee-9758-cb1d110dd4b0','76f70a66-2508-473b-9487-654fc5f9cdc9','ac9b22aae1ec3ac54a255a1b35473e49f6a553a950225c0a584c4a17fd3866b6','2026-10-11 08:12:06.127','2026-10-11 07:57:06.150','2026-10-11 07:57:06.130'),('9851963e-f967-4ee4-9edf-096b958c30ff','5bd45c08-c9a4-4278-928e-ea83d5a6e0cb','c8fc4f177a99e754783fe431b0980fdb1aa147084b3a194298032bea5e558b08','2026-10-11 08:58:41.957',NULL,'2026-10-11 08:43:41.958'),('9a66c2e4-4ab5-4447-9d32-f58899bf79c5','02a132b7-8968-4d36-ae2a-cbf18b317876','46cdb32485e77cdd117d075fa970db433516c4456b49102c09fe1fbd9734efb0','2026-10-11 08:57:54.498',NULL,'2026-10-11 08:42:54.500'),('9d51da8c-2771-4ccf-a151-496be652371d','d943c114-6c05-44bc-9fd6-1f20ca843cac','67fe238bedb2e0318ae7f6ec9a920fe4047353162139f9e4a2bdd80a2ed31dd3','2026-10-11 08:43:31.876',NULL,'2026-10-11 08:43:41.877'),('9eabba81-531d-46ee-bf13-f33163b89bb6','be32b292-0247-41b4-8e4b-c90c82b225bc','890af7c6cdbb177167965ac3dc53927cd96d679a59f60b411cec07a9adfc9600','2026-10-11 08:42:38.686',NULL,'2026-10-11 08:42:48.687'),('a9d0cf85-60e4-4d93-a9bd-10006326ed5c','7e9dd70c-7860-4798-bf44-feb94af44e02','be2a33f3a6920a21ec805fc3eef56a6529e396914490c56b3304f9a6bceaa34c','2026-10-11 09:15:30.389','2026-10-11 09:00:51.866','2026-10-11 09:00:30.400'),('add9b5fd-957a-4873-b741-271282b78783','7e9dd70c-7860-4798-bf44-feb94af44e02','b53e3c49ae61cfbcbf966e177eb542f15352a17d71d6355722f6323ef9af305d','2026-10-11 09:40:26.061',NULL,'2026-10-11 09:25:26.064'),('bc611495-abb8-4300-a8e6-0bb80f860041','faa73d9d-c7e0-42c0-93cc-89de0ee8879e','2b35ff59c84eb8c25f09fba763e5c40e3894e9a98ccc47cfdd6cf0dc0f8e5d03','2026-10-11 09:30:13.194','2026-10-11 09:15:13.212','2026-10-11 09:15:13.196'),('c3839408-6ab3-4923-88ad-25a48f324116','2948a8c3-91a6-43f4-bf03-a099701d16b4','ccf650625152e11ebe425a8b1088e4a8e36ab723fe9af949d6fdc43897385b7a','2026-10-11 08:58:55.363','2026-10-11 08:43:55.379','2026-10-11 08:43:55.364'),('cd6f0bb3-7988-4f5c-ae5a-1cc05984f240','6cadb07a-b904-4260-9727-5758d3668619','abe089bd5d0966a1db0ef466847a4018d5f2bc07bd8e90b9707b5c5b0d754c29','2026-10-11 08:11:44.338','2026-10-11 07:56:44.356','2026-10-11 07:56:44.340'),('db103763-eb7a-45af-b2a2-51a589d1d58f','e06683b5-ce1e-4ad9-b965-a800e90024a3','39d9688aea17b4c68ded8fba3e8227c7b8272c49030153678c88044cc0a9e97a','2026-10-11 08:51:25.146',NULL,'2026-10-11 08:36:25.148'),('debb13b5-166b-4492-9864-937b90e5b4a9','02a132b7-8968-4d36-ae2a-cbf18b317876','bff99b55f3f44a3baea2a20f7e33dd30a33df8885177baa7cd3fe5547c8f2828','2026-10-11 08:57:48.758',NULL,'2026-10-11 08:42:48.759'),('f9e3b6b1-1f90-43f5-a552-a7581ee64162','be32b292-0247-41b4-8e4b-c90c82b225bc','98b99a7ba9fd8c28c7869580df53a4406ed35d003754072f5f98d42d9a111675','2026-10-11 08:57:43.038',NULL,'2026-10-11 08:42:43.041'),('fe08a399-f3f0-4c10-b1de-992459e171e8','d943c114-6c05-44bc-9fd6-1f20ca843cac','3b687c9fcc4970f15e24878bdac0957b4ef84b418a21d6281b73a0432ddfe13c','2026-10-11 08:58:37.848',NULL,'2026-10-11 08:43:37.850');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('ADMIN','HR','CANDIDATE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CANDIDATE',
  `avatar_url` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `token_version` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('02a132b7-8968-4d36-ae2a-cbf18b317876','ratelimit_1791708168698@ats-live.com','$2b$10$mj1skKyRbQZCc8y1OX55c.urecqfCNOOQZ3COvLzw1.GYQ15OloTG','Rate','Limit','CANDIDATE',NULL,1,'2026-10-11 08:42:48.748','2026-10-11 08:42:48.748',0),('168cb810-8bef-4f06-a1da-689ca8517a31','test_candidate_1791705380226@ats-live.com','$2b$10$CcAUmH25BwittUC5MlAiQOuarPS9AfKnjPmOGgUbYUc/SvGn6VLOq','Nguyễn Thành','Công','CANDIDATE',NULL,1,'2026-10-11 07:56:20.376','2026-10-11 07:56:20.680',0),('2354ee7e-b751-4f29-86cf-93994df688a6','quocanh@gmail.com','$2b$10$DoQaqo5AyqReeSGKNTRVdeHXDLBB7MKVIcNgFI3QDFZLdrtVHH5ki','Nguyễn Văn','AI','CANDIDATE',NULL,1,'2026-10-12 19:59:09.244','2026-10-13 11:47:53.126',0),('2948a8c3-91a6-43f4-bf03-a099701d16b4','test_candidate_1791708234798@ats-live.com','$2b$10$oKoJjPkkcZw8nYoqKdo4Je9kq/OlcE/6arehxXxD0fP11qvQNNi.S','Nguyễn Thành','Công','CANDIDATE',NULL,1,'2026-10-11 08:43:54.946','2026-10-11 08:43:55.434',1),('324d8f45-1fbf-4065-8ba0-04e38df96a22','admin@ats.local','$2b$10$EdO4smi4OCg11hPfxgH1MOqAZpN6PYOolXLzRbFKTNGSZbdcidm5a','Nguyễn Văn','Admin','ADMIN',NULL,1,'2026-10-11 08:30:38.185','2026-10-11 08:30:38.185',0),('375fb29c-3feb-44f8-8c3d-7502cbb2112f','bachkhi123@gmail.com','$2b$10$SoIqh8SE7rGakRSVfohp1uXI7TxekhpWnmQO6sGYwQIgXUdp4Ttjq','Nguyễn','Bách','CANDIDATE','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTCqDMiPKNmoCeA15ROJjI5dE33gojGbKGYIKvfnxQRwJ1Z9DNe4xeXyho&s=10',1,'2026-10-11 09:22:50.418','2026-10-11 09:24:01.297',0),('58402034-1843-4b99-ae44-c9022ae87999','candidate_endpoint_1791706509333@ats-live.com','$2b$10$cwTaXwXZkCrupjAvRorWcOD2xBildgvJLRyxId0a2yFuXHKuS58DW','Trần','Văn Tuyển Dụng','HR',NULL,1,'2026-10-11 08:15:09.430','2026-10-11 08:15:09.430',0),('5bd45c08-c9a4-4278-928e-ea83d5a6e0cb','ratelimit_1791708221889@ats-live.com','$2b$10$i2hUwjh.lV7hLgoIMgzeNOsc9ctga6ZnfC7Ay.okasKGK4vUZV2Du','Rate','Limit','CANDIDATE',NULL,1,'2026-10-11 08:43:41.946','2026-10-11 08:43:41.946',0),('69f05569-7312-4a15-bd92-80eb378c0b25','test_candidate_1791705282135@ats-live.com','$2b$10$Z/dMIUMS4KNoSRjC32GCPe31oFouvWnDhBfWySQ5CssO3EEkMddC.','Nguyễn','Văn Test','CANDIDATE',NULL,1,'2026-10-11 07:54:42.377','2026-10-11 07:54:42.377',0),('6cadb07a-b904-4260-9727-5758d3668619','test_candidate_1791705403765@ats-live.com','$2b$10$x3B02ZwQtDY1x4Oj4PUMYuKE9KwGYT3BrHNx1KuQYuXvXlMwE4Yo.','Nguyễn Thành','Công','CANDIDATE',NULL,1,'2026-10-11 07:56:43.915','2026-10-11 07:56:44.411',1),('6f58ac87-4438-4659-b848-001db9f02c8f','ntg12072005222@gmail.com','$2b$10$hoJO3560HPMNwXfigg3tbOxkR7LuOeVBpjjzklZ64L.nidoPgmVB.','17.','Giang','CANDIDATE',NULL,1,'2026-10-12 19:50:20.030','2026-10-12 19:50:20.030',0),('76f70a66-2508-473b-9487-654fc5f9cdc9','test_candidate_1791705425566@ats-live.com','$2b$10$Pt3JgyhoS35Iw1RnnD7QK.NGD8JIm8/niDML6iafWzWC0c7SaAmU.','Nguyễn Thành','Công','CANDIDATE',NULL,1,'2026-10-11 07:57:05.715','2026-10-11 07:57:06.206',1),('7e9dd70c-7860-4798-bf44-feb94af44e02','ntg12072005@gmail.com','$2b$10$3nSm926N/0DYXI3ajnYIweWA8GJ/CGeGiEpwAb5lRilMURx70OBPm','Nguyễn Trường','Giang','CANDIDATE',NULL,1,'2026-10-11 08:19:46.130','2026-10-12 19:34:51.935',1),('885d0412-2e15-47f3-8d16-5f926c7d79bb','candidate_endpoint_1791706523978@ats-live.com','$2b$10$H7X5b3BtKEjY/NcoyfiKF./m.ngWnpWsj9wiFpxkFNcvD1kpTgHJm','Trần','Văn Tuyển Dụng','CANDIDATE',NULL,1,'2026-10-11 08:15:24.074','2026-10-11 08:15:24.074',0),('b4f80743-1bc2-405e-8056-ac7561fe38e8','candidate_endpoint_1791706536894@ats-live.com','$2b$10$NvsLWPSYwmjUBef2x/b3selGIv3rV9Hc9kqXbFnDt1TlNM/ZbTjk.','Trần','Văn Tuyển Dụng','CANDIDATE',NULL,1,'2026-10-11 08:15:36.994','2026-10-11 08:15:36.994',0),('be32b292-0247-41b4-8e4b-c90c82b225bc','forgot_flow_1791708162877@ats-live.com','$2b$10$C1H7jZs8X8R1lDfqoI0mpu3Aa8MR/zSYLf5ZPyo0DhpxU6l.Anpii','Lê','Văn Forgot','CANDIDATE',NULL,1,'2026-10-11 08:42:43.022','2026-10-11 08:42:48.565',1),('ce26bdee-34ae-4e44-9255-8015c92afda7','test_candidate_1791705364523@ats-live.com','$2b$10$ZPcBUAP4qvItuMAtm74U0ORtuNPrPmPH/uRLDWQuh83ylkXF6j8TO','Nguyễn Thành','Công','CANDIDATE',NULL,1,'2026-10-11 07:56:04.679','2026-10-11 07:56:04.982',0),('d943c114-6c05-44bc-9fd6-1f20ca843cac','forgot_flow_1791708217689@ats-live.com','$2b$10$h1fqfz4nFqbWrr8D2eIMZulBb3WwQeVqDoR.jMBX89giyyhbu1CmC','Lê','Văn Forgot','CANDIDATE',NULL,1,'2026-10-11 08:43:37.832','2026-10-11 08:43:41.752',1),('da811584-4778-4e04-85da-5e5605d69d1c','test_candidate_1791705344806@ats-live.com','$2b$10$RKqWzajkFIPr6sPsgI3Iu.H3gmVNoZRJDruGB3mzoi4jpuawxHYJ.','Nguyễn Thành','Công','CANDIDATE',NULL,1,'2026-10-11 07:55:44.966','2026-10-11 07:55:45.292',0),('dfa8a9e1-9bac-471a-9a47-4f90afbe37fc','test_candidate_1791706593496@ats-live.com','$2b$10$Tpdvl1DMIl8ebfLbBpEHn.TZWcoullqK60Mk8EqdqtjkRSpn4.oQi','Nguyễn Thành','Công','CANDIDATE',NULL,1,'2026-10-11 08:16:33.659','2026-10-11 08:16:34.159',1),('e06683b5-ce1e-4ad9-b965-a800e90024a3','hr@ats.local','$2b$10$PAjQlMvWI5Gjn.C9IEvBquJfH2GTxO3wtA.VCvQnBJNXDsPOW4iX2','Nguyễn Văn','Hr','HR','https://yt3.ggpht.com/BcZmqyvHf_jfCEWJPtrBF2V2ALQjBOwgg9P90rF8AxshdljURxXaUhlb-dIRMIAuNn98-4Yycy7xCQ=s679-nd-v1',1,'2026-10-11 08:31:45.363','2026-10-13 11:53:42.515',0),('faa73d9d-c7e0-42c0-93cc-89de0ee8879e','test_candidate_1791710112598@ats-live.com','$2b$10$B4HYLXTvA5AqpjtIvWYLIebnqYdCn2dbjij1IO5gr5PyYZH/kuq1e','Nguyễn Thành','Công','CANDIDATE',NULL,1,'2026-10-11 09:15:12.748','2026-10-11 09:15:13.267',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-13 16:26:00
