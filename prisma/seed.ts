import {db} from "../lib/prisma";
import bcrypt from "bcryptjs";
async function main(){await db.shopSettings.upsert({where:{id:1},create:{id:1,name:"Himalayan Care Pharmacy",address:"Besishahar, Lamjung, Nepal",phone:"9800000000",panVat:"600123456",vatRate:0},update:{}});
const adminHash=await bcrypt.hash("admin123",10);
await db.user.upsert({where:{username:"admin"},create:{name:"Administrator",username:"admin",passwordHash:adminHash,role:"ADMIN"},update:{}});
// No demo medicines are seeded — the admin account can add real stock from the Medicines page
// (there's also a "🎲 Fill Sample Medicine" button there if you just want to try the app out).
}
main().then(()=>db.$disconnect());