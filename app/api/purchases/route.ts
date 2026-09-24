import {NextResponse} from "next/server"; import {db} from "@/lib/prisma"; import {apiError} from "@/lib/api-error"; import {requirePermission} from "@/lib/authz"; import type {Prisma} from "@prisma/client";

export async function GET(){
  try{
    await requirePermission("purchases","view");
    const purchases=await db.purchase.findMany({
      include:{supplier:true,items:{include:{medicine:true,batch:true}}},
      orderBy:{id:"desc"},
      take:200,
    });
    return NextResponse.json(purchases);
  }catch(e){return apiError(e);}
}

export async function POST(req:Request){
 try{
 await requirePermission("purchases","add");
 const b=await req.json(); const result=await db.$transaction(async (tx: Prisma.TransactionClient)=>{
   const supplierId=b.supplierId?Number(b.supplierId):undefined;
   const items:any[]=[]; let total=0;
   for(const i of b.items){
     const med=await tx.medicine.findUnique({where:{id:Number(i.medicineId)}});
     if(!med) throw new Error("Medicine not found");
     const freeQty=Number(i.freeQuantity??0);
     const sellingRate=Number(i.sellingRate??i.purchaseRate??0);
     let batch=await tx.medicineBatch.findUnique({where:{medicineId_batchNumber:{medicineId:med.id,batchNumber:i.batchNumber}}});
     // Stock received = paid quantity + any free (bonus) quantity from the supplier; the free units cost nothing.
     if(batch) batch=await tx.medicineBatch.update({where:{id:batch.id},data:{quantity:{increment:Number(i.quantity)+freeQty},freeQuantity:{increment:freeQty},purchaseRate:Number(i.purchaseRate),sellingRate,expiryDate:new Date(i.expiryDate),supplierId:supplierId}});
     else batch=await tx.medicineBatch.create({data:{medicineId:med.id,batchNumber:i.batchNumber,quantity:Number(i.quantity)+freeQty,freeQuantity:freeQty,purchaseRate:Number(i.purchaseRate),sellingRate,expiryDate:new Date(i.expiryDate),supplierId:supplierId}});
     const q=Number(i.quantity), rate=Number(i.purchaseRate); const amount=q*rate; total+=amount;
     items.push({medicineId:med.id,batchId:batch.id,quantity:q,freeQuantity:freeQty,purchaseRate:rate,sellingRate,amount});
     await tx.stockTransaction.create({data:{batchId:batch.id,type:"PURCHASE",quantity:q+freeQty,reference:"Purchase"}});
   }
   const discount=Math.max(0,Number(b.discount??0));
   const vatRate=Number(b.vatRate??0);
   const taxable=Math.max(0,total-discount);
   const vatAmount=Math.round(((taxable*vatRate)/100+Number.EPSILON)*100)/100;
   const netAmount=Math.round((taxable+vatAmount+Number.EPSILON)*100)/100;
   let paidAmount=Number(b.paidAmount??0);
   if(paidAmount<0) paidAmount=0;
   if(paidAmount>netAmount) paidAmount=netAmount;
   const purchase=await tx.purchase.create({data:{supplierId,totalAmount:total,discount,vatAmount,netAmount,paidAmount,items:{create:items}}});
   if(supplierId){
     // Whatever wasn't paid in cash right now becomes what the shop owes this supplier (the "party").
     await tx.supplier.update({where:{id:supplierId},data:{dueAmount:{increment:netAmount-paidAmount}}});
     if(paidAmount>0){
       await tx.supplierPayment.create({data:{supplierId,purchaseId:purchase.id,amount:paidAmount,note:"Cash paid at purchase"}});
     }
   }
   return purchase;
 }); return NextResponse.json(result,{status:201});
 }catch(e){return apiError(e);}
}