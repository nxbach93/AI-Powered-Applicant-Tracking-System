import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "mysql://ats_app_user:ats_dev_password_change_me@mysql:3306/ats_database",
  },
});
