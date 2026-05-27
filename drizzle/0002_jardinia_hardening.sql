ALTER TABLE `credit_transactions` ADD `amountEur` decimal(10,2);--> statement-breakpoint
CREATE UNIQUE INDEX `credit_transactions_stripe_session_unique` ON `credit_transactions` (`stripeSessionId`);--> statement-breakpoint
ALTER TABLE `projects` ADD `generationAttempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `lastError` text;
