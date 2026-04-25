import { initDb } from "../db/sqlite.js";

export const connectDB = async () => {
    initDb();
    console.log("SQLite database ready");
};
