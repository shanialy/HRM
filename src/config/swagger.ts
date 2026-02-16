import swaggerJsdoc, { Options } from "swagger-jsdoc";
import { PORT } from "./environment";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HRM API",
      version: "1.0.0",
      description: "HRM System API Documentation",
    },

    // ⚠️ IMPORTANT: Yahan /api/v1 nahi lagana
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },

  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
