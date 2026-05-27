CREATE TABLE `credit_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`type` enum('purchase','use','refund') NOT NULL,
	`stripeSessionId` varchar(255),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`originalName` varchar(255),
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_renderings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`originalPhotoId` int,
	`renderedUrl` text NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`prompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_renderings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`planContent` text,
	`roadmapContent` text,
	`estimatedCostMin` decimal(10,2),
	`estimatedCostMax` decimal(10,2),
	`artisansList` text,
	`purchasesList` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_reports_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`spaceType` enum('interior','exterior','both') NOT NULL,
	`style` varchar(100) NOT NULL,
	`budget` varchar(100),
	`constraints` text,
	`additionalNotes` text,
	`status` enum('draft','processing','completed','failed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_credits_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_credits_userId_unique` UNIQUE(`userId`)
);
