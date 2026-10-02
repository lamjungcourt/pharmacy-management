import {NextResponse} from "next/server"; import {db} from "@/lib/prisma"; import {requireAdmin,hashPassword} from "@/lib/auth"; import {apiError} from "@/lib/api-error";
export async function POST(){
try{
 // Only an existing admin may (re)run the demo data seeder.
 await requireAdmin();
 await db.shopSettings.upsert({where:{id:1},create:{id:1,name:"Himalayan Care Pharmacy",address:"Besishahar, Lamjung, Nepal",phone:"9800000000",panVat:"600123456",vatRate:13},update:{}});
 const admin=await db.user.upsert({where:{username:"admin"},create:{name:"Administrator",username:"admin",passwordHash:await hashPassword("admin123"),role:"ADMIN"},update:{}});
 const supplier=await db.supplier.upsert({where:{id:1},create:{id:1,name:"Sample Pharma Supplier",company:"Nepal Pharma"},update:{}});
 const names=[["Paracetamol 500mg","Paracetamol","Tablet"],["Amoxicillin 500mg","Amoxicillin","Capsule"],["Omeprazole 20mg","Omeprazole","Capsule"],["Cetirizine 10mg","Cetirizine","Tablet"],["Azithromycin 500mg","Azithromycin","Tablet"],["ORS","Oral Rehydration Salts","Sachet"],["Cough Syrup","Dextromethorphan","Bottle"],["Vitamin C 500mg","Ascorbic Acid","Tablet"],["Ibuprofen 400mg","Ibuprofen","Tablet"],["Metformin 500mg","Metformin","Tablet"],["Amlodipine 5mg","Amlodipine","Tablet"],["Pantoprazole 40mg","Pantoprazole","Tablet"],["Diclofenac Gel","Diclofenac","Tube"],["Antacid Syrup","Aluminium Hydroxide","Bottle"],["Multivitamin","Multivitamins","Tablet"]];
 for(let x=0;x<names.length;x++){const [name,generic,unit]=names[x]; const m=await db.medicine.upsert({where:{sku:`MED-${x+1}`},create:{name,genericName:generic,unit,sku:`MED-${x+1}`,minStock:x%4===0?20:5},update:{}}); const d=new Date(); d.setDate(d.getDate()+(x===0?-10:x===1?15:30+x*10)); await db.medicineBatch.upsert({where:{medicineId_batchNumber:{medicineId:m.id,batchNumber:`B-${x+1}`}},create:{medicineId:m.id,batchNumber:`B-${x+1}`,purchaseRate:10+x,sellingRate:15+x,quantity:x%4===0?3:30+x,expiryDate:d,supplierId:supplier.id},update:{}});}
 return NextResponse.json({ok:true,user:admin.username});
}catch(e){return apiError(e);}
}