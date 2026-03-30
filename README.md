# Alacranes de Durango — Sistema de Venta de Boletos

Plataforma web para la venta y gestión de boletos del Club Alacranes de Durango F.C. Permite a los aficionados comprar boletos en línea y al personal administrativo gestionar eventos, ventas y reportes.

---

## Características principales

- **Compra de boletos en línea** con pago vía PayPal
- **Mapa interactivo del estadio** para seleccionar zona
- **Diseño responsivo** — funciona en celular, tableta y computadora
- **Boletos descargables** con código QR único para acceso al estadio
- **Validación de boletos** en taquilla mediante escaneo de QR
- **Venta directa y cortesías** desde el panel de administración
- **Reportes de ventas** con filtros avanzados y exportación a CSV
-  **Control de acceso por roles** — aficionado, administrador y staff

---

## Tecnologías utilizadas

| Tecnología                                   | Uso                                       |
| --------------------------------------------- | ----------------------------------------- |
| [Next.js 14](https://nextjs.org/)                | Framework principal (frontend + backend)  |
| [TypeScript](https://www.typescriptlang.org/)    | Lenguaje de programación                 |
| [Tailwind CSS](https://tailwindcss.com/)         | Estilos y diseño responsivo              |
| [Supabase](https://supabase.com/)                | Base de datos PostgreSQL + Autenticación |
| [PayPal REST API](https://developer.paypal.com/) | Procesamiento de pagos en línea          |
| [qrcode](https://www.npmjs.com/package/qrcode)   | Generación de códigos QR                |
| [Recharts](https://recharts.org/)                | Gráficas en el panel de reportes         |

---

## Instalación y configuración

### Requisitos previos

- Node.js v18 o superior
- Una cuenta en [Supabase](https://supabase.com)
- Una cuenta en [PayPal Developer](https://developer.paypal.com) (para pagos)

### 1. Clonar el repositorio

```bash
git clone https://github.com/kishirukito/Alacranes-sistema-de-tickets.git
cd Alacranes-sistema-de-tickets
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo de plantilla y rellena tus credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local` con los valores de tu proyecto de Supabase y tu app de PayPal:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role

PAYPAL_CLIENT_ID=tu_paypal_client_id
PAYPAL_CLIENT_SECRET=tu_paypal_client_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=tu_paypal_client_id
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configurar la base de datos

Ejecuta los siguientes archivos en el **SQL Editor de Supabase**, en este orden:

1. `database/schema.sql` — Crea todas las tablas
2. `database/schema_additions.sql` — Agrega columnas y funciones adicionales
3. `database/fix_rls_policies.sql` — Configura las políticas de seguridad
4. `database/seed_data.sql` — Inserta datos iniciales (opcional)

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Estructura del proyecto

```
├── app/
│   ├── api/               # Funciones del backend (Route Handlers)
│   │   ├── admin/         # Endpoints del panel de administración
│   │   ├── cart/          # Carrito de compra
│   │   ├── paypal/        # Integración con PayPal
│   │   └── tickets/       # Descarga de boletos
│   ├── admin/             # Páginas del panel administrativo
│   └── ...                # Páginas públicas
├── components/            # Componentes reutilizables de la interfaz
├── database/              # Scripts SQL del esquema de base de datos
├── lib/                   # Funciones utilitarias (Supabase, PayPal, QR)
└── public/                # Imágenes y archivos estáticos
```

---

## Roles de usuario

| Rol                     | Acceso                                                     |
| ----------------------- | ---------------------------------------------------------- |
| **Aficionado**    | Compra de boletos, carrito, historial, descarga de boletos |
| **Administrador** | Panel completo: eventos, ventas, reportes, cortesías      |
| **Staff**         | Validación de boletos en taquilla                         |

Para asignar el rol de administrador a un usuario, actualiza su campo `role` en la tabla `profiles` de Supabase:

```sql
UPDATE profiles SET role = 'admin' WHERE id = 'uuid-del-usuario';
```

---

## Licencia

Proyecto desarrollado para el Club Alacranes de Durango F.C.
Uso interno — todos los derechos reservados.
