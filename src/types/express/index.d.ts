// src/types/express.d.ts

declare global {
  namespace Express {
    interface Request {
      user?: any; // 👈 le decimos a TypeScript que req puede tener un "user"
    }
  }
}
