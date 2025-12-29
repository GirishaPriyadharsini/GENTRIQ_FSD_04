-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 29, 2025 at 01:56 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `productivity_app`
--

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `color` varchar(7) DEFAULT '#007bff',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `user_id`, `name`, `color`, `created_at`) VALUES
(1, 1, 'Personal', '#007bff', '2025-12-25 11:22:39'),
(2, 1, 'Work', '#8c00ff', '2025-12-25 11:23:19'),
(3, 1, 'Study', '#00ff4c', '2025-12-25 11:23:32'),
(4, 1, 'Important', '#ff0000', '2025-12-25 11:23:45'),
(5, 1, 'Finance', '#225d29', '2025-12-25 11:24:02'),
(6, 1, 'Travel', '#00ccff', '2025-12-25 11:24:18'),
(7, 1, 'Others', '#ff00f7', '2025-12-25 11:24:28'),
(8, 1, 'Daily', '#ff7300', '2025-12-29 08:49:20'),
(9, 3, 'Personal', '#007bff', '2025-12-29 11:14:25'),
(10, 3, 'Work', '#8c00ff', '2025-12-29 11:14:25'),
(11, 3, 'Study', '#00ff4c', '2025-12-29 11:14:25'),
(12, 3, 'Important', '#ff0000', '2025-12-29 11:14:25'),
(13, 3, 'Finance', '#225d29', '2025-12-29 11:14:25'),
(14, 3, 'Travel', '#00ccff', '2025-12-29 11:14:25'),
(15, 3, 'Others', '#ff00f7', '2025-12-29 11:14:25'),
(16, 3, 'Daily', '#ff7300', '2025-12-29 11:14:55'),
(17, 3, 'New tasks', '#758ea9', '2025-12-29 11:15:11');

-- --------------------------------------------------------

--
-- Table structure for table `notes`
--

CREATE TABLE `notes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `content` text DEFAULT NULL,
  `is_pinned` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notes`
--

INSERT INTO `notes` (`id`, `user_id`, `category_id`, `title`, `content`, `is_pinned`, `created_at`, `updated_at`) VALUES
(2, 1, 8, 'Grocery List', 'Milk, eggs, bread, fruits, vegetables, rice, dal, coffee, sugar, cooking oil, snacks. Check fridge before buying duplicates.', 0, '2025-12-29 08:49:39', '2025-12-29 08:49:51'),
(3, 1, 3, 'Exam Preparation Plan', 'Revise Data Structures and Algorithms. Practice 2 coding problems daily. Review previous year questions and focus on weak topics.\n', 1, '2025-12-29 08:50:11', '2025-12-29 08:50:11'),
(4, 3, 16, 'Daily Productivity Plan', 'Test task to update', 1, '2025-12-29 11:16:02', '2025-12-29 12:53:48'),
(7, 3, 15, 'New', 'New', 1, '2025-12-29 12:53:43', '2025-12-29 12:53:43');

-- --------------------------------------------------------

--
-- Table structure for table `reminders`
--

CREATE TABLE `reminders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `reminder_time` datetime NOT NULL,
  `is_completed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reminders`
--

INSERT INTO `reminders` (`id`, `user_id`, `category_id`, `title`, `description`, `reminder_time`, `is_completed`, `created_at`) VALUES
(1, 1, NULL, 'reminder testtt', 'test', '2025-12-25 16:53:00', 1, '2025-12-25 11:21:16'),
(2, 1, 2, 'New remainder', 'New remainder', '2025-12-30 14:14:00', 0, '2025-12-29 08:45:00'),
(3, 3, 15, 'reminder task', 'rem task', '2025-12-31 16:48:00', 1, '2025-12-29 11:17:45');

-- --------------------------------------------------------

--
-- Table structure for table `tags`
--

CREATE TABLE `tags` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `color` varchar(7) DEFAULT '#6c757d',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `todos`
--

CREATE TABLE `todos` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `task` varchar(255) NOT NULL,
  `is_completed` tinyint(1) DEFAULT 0,
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `todos`
--

INSERT INTO `todos` (`id`, `user_id`, `category_id`, `task`, `is_completed`, `priority`, `due_date`, `created_at`) VALUES
(3, 1, 2, 'Finish backend API for notes module', 0, 'high', NULL, '2025-12-29 08:11:31'),
(5, 1, 8, 'Complete daily routine', 0, 'medium', '2025-12-30', '2025-12-29 08:51:22'),
(6, 1, 1, 'Doctor appointment', 0, 'medium', '2025-12-29', '2025-12-29 08:52:44'),
(8, 3, 12, 'Finish backend API for notes module', 0, 'medium', '2025-12-30', '2025-12-29 12:53:21');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `created_at`) VALUES
(1, 'girisha1210', 'girisha1210@gmail.com', '$2b$10$u.7T2ezhegyQyst0IWY96uYApUsw1.qYhwaf1vfG8GUK2emTSmUBe', '2025-12-25 11:06:32'),
(2, 'girisha2536', 'girisha253677@gmail.com', '$2a$10$5lANj1PEg6jKsClgOuLWC.hgZqYygmvljy0wBg5JK06ax1gAcCREG', '2025-12-29 07:57:35'),
(3, 'sara', 'saracozy7@gmail.com', '$2a$10$JEkZI1Cct/m2Gy91XIEJTe2WJ/tPSAm77GI8.X5wc73lD6tK4.MnG', '2025-12-29 11:14:25');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `notes`
--
ALTER TABLE `notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `reminders`
--
ALTER TABLE `reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `todos`
--
ALTER TABLE `todos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `notes`
--
ALTER TABLE `notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `reminders`
--
ALTER TABLE `reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tags`
--
ALTER TABLE `tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `todos`
--
ALTER TABLE `todos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notes`
--
ALTER TABLE `notes`
  ADD CONSTRAINT `notes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notes_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `reminders`
--
ALTER TABLE `reminders`
  ADD CONSTRAINT `reminders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reminders_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tags`
--
ALTER TABLE `tags`
  ADD CONSTRAINT `tags_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `todos`
--
ALTER TABLE `todos`
  ADD CONSTRAINT `todos_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `todos_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
