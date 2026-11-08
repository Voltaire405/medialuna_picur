CREATE TABLE `cuenta` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`idusuario` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`contrasena` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`idusuario`) REFERENCES `usuario`(`idusuario`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `perfil` (
	`idperfil` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`descripc` text NOT NULL,
	`estado` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `perfil_descripc_unique` ON `perfil` (`descripc`);--> statement-breakpoint
CREATE TABLE `persona` (
	`idpersona` text PRIMARY KEY NOT NULL,
	`nom1` text NOT NULL,
	`nom2` text,
	`apell1` text NOT NULL,
	`apell2` text,
	`direccion` text,
	`tele` text,
	`movil` text NOT NULL,
	`correo` text NOT NULL,
	`fecha_nac` text,
	`estado` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persona_correo_unique` ON `persona` (`correo`);--> statement-breakpoint
CREATE TABLE `sesion` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`idusuario` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`idusuario`) REFERENCES `usuario`(`idusuario`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sesion_token_unique` ON `sesion` (`token`);--> statement-breakpoint
CREATE TABLE `usuario` (
	`idusuario` text PRIMARY KEY NOT NULL,
	`nombreu` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`idperfil` integer NOT NULL,
	`idpersona` text NOT NULL,
	`estado` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`idperfil`) REFERENCES `perfil`(`idperfil`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`idpersona`) REFERENCES `persona`(`idpersona`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_nombreu_unique` ON `usuario` (`nombreu`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_email_unique` ON `usuario` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `usuario_idpersona_unique` ON `usuario` (`idpersona`);--> statement-breakpoint
CREATE TABLE `verificacion` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
