CREATE TABLE `categoria` (
	`codigotp` text PRIMARY KEY NOT NULL,
	`descripcion` text NOT NULL,
	`estado` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categoria_descripcion_unique` ON `categoria` (`descripcion`);--> statement-breakpoint
CREATE TABLE `producto` (
	`codigo` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`imagen` blob,
	`precio_venta` integer NOT NULL,
	`empaque_unidades` integer NOT NULL,
	`descuento` integer DEFAULT 0 NOT NULL,
	`codigotp` text NOT NULL,
	`idproductor` text NOT NULL,
	`estado` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`codigotp`) REFERENCES `categoria`(`codigotp`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`idproductor`) REFERENCES `persona`(`idpersona`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "producto_precio_positivo" CHECK("producto"."precio_venta" > 0),
	CONSTRAINT "producto_empaque_positivo" CHECK("producto"."empaque_unidades" > 0),
	CONSTRAINT "producto_descuento_porcentaje" CHECK("producto"."descuento" between 0 and 100)
);
