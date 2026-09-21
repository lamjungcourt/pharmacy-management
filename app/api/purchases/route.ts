import {NextResponse} from "next/server"; import {db} from "@/lib/prisma"; import {apiError} from "@/lib/api-error"; import type {Prisma} from "@prisma/client";

export async function GET(){
  const purchases=await db.purchase.findMany({
    include:{supplier:true,items:{include:{medicine:true,batch:true}}},
    orderBy:{id:"desc"},
    take:200,
  });
  return NextResponse.json(purchases);
}

export async function POST(req:Request){
 try{
 const b=await req.json(); const result=await db.$transaction(async (tx: Prisma.TransactionClient)=>{
   const supplierId=b.supplierId?Number(b.supplierId):undefined;
   const items:any[]=[]; let total=0;
   for(const i of b.items){
     const med=await tx.medicine.findUnique({where:{id:Number(i.medicineId)}});
     if(!med) throw new Error("Medicine not found");
     let batch=await tx.medicineBatch.findUnique({where:{medicineId_batchNumber:{medicineId:med.id,batchNumber:i.batchNumber}}});
     if(batch) batch=await tx.medicineBatch.update({where:{id:batch.id},data:{quantity:{increment:Number(i.quantity)},purchaseRate:Number(i.purchaseRate),sellingRate:Number(i.sellingRate),expiryDate:new Date(i.expiryDate),supplierId:supplierId}});
     else batch=await tx.medicineBatch.create({data:{medicineId:med.id,batchNumber:i.batchNumber,quantity:Number(i.quantity),purchaseRate:Number(i.purchaseRate),sellingRate:Number(i.sellingRate),expiryDate:new Date(i.expiryDate),supplierId:supplierId}});
     const q=Number(i.quantity), rate=Number(i.purchaseRate); total+=q*rate;
     items.push({medicineId:med.id,batchId:batch.id,quantity:q,purchaseRate:rate});
     await tx.stockTransaction.create({data:{batchId:batch.id,type:"PURCHASE",quantity:q,reference:"Purchase"}});
   }
   let paidAmount=Number(b.paidAmount??0);
   if(paidAmount<0) paidAmount=0;
   if(paidAmount>total) paidAmount=total;
   const purchase=await tx.purchase.create({data:{supplierId,totalAmount:total,paidAmount,items:{create:items}}});
   if(supplierId){
     // Whatever wasn't paid in cash right now becomes what the shop owes this supplier (the "party").
     await tx.supplier.update({where:{id:supplierId},data:{dueAmount:{increment:total-paidAmount}}});
     if(paidAmount>0){
       await tx.supplierPayment.create({data:{supplierId,purchaseId:purchase.id,amount:paidAmount,note:"Cash paid at purchase"}});
     }
   }
   return purchase;
 }); return NextResponse.json(result,{status:201});
 }catch(e){return apiError(e);}
}