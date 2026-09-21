import {db} from "../lib/prisma";
import bcrypt from "bcryptjs";
async function main(){await db.shopSettings.upsert({where:{id:1},create:{id:1,name:"Himalayan Care Pharmacy",address:"Besishahar, Lamjung, Nepal",phone:"9800000000",panVat:"600123456",vatRate:13},update:{}});
const adminHash=await bcrypt.hash("admin123",10);
await db.user.upsert({where:{username:"admin"},create:{name:"Administrator",username:"admin",passwordHash:adminHash,role:"ADMIN"},update:{}});
const supplier=await db.supplier.upsert({where:{id:1},create:{id:1,name:"Sample Pharma Supplier",company:"Nepal Pharma"},update:{}});
const data=[["Paracetamol 500mg","MED-001",3],["Amoxicillin 500mg","MED-002",25],["Omeprazole 20mg","MED-003",30],["Cetirizine 10mg","MED-004",4],["ORS","MED-005",20]];
for(let i=0;i<data.length;i++){const m=await db.medicine.upsert({where:{sku:data[i][1] as string},create:{name:data[i][0] as string,sku:data[i][1] as string,minStock:i%2?5:10},update:{}});const exp=new Date();exp.setDate(exp.getDate()+(data[i][2] as number));await db.medicineBatch.upsert({where:{medicineId_batchNumber:{medicineId:m.id,batchNumber:`DEMO-${i+1}`}},create:{medicineId:m.id,batchNumber:`DEMO-${i+1}`,purchaseRate:10+i,sellingRate:15+i,quantity:20-i*2,expiryDate:exp,supplierId:supplier.id},update:{}})}}
main().then(()=>db.$disconnect());