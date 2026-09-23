import {NextResponse} from "next/server"; import {db} from "@/lib/prisma"; import {requireSession} from "@/lib/auth"; import {apiError} from "@/lib/api-error"; import type {Prisma} from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sales = await db.sale.findMany({
    where: {
      AND: [
        q ? { OR: [{ invoiceNo: { contains: q, mode: "insensitive" } }, { customer: { name: { contains: q, mode: "insensitive" } } }] } : {},
        from ? { saleDate: { gte: new Date(from) } } : {},
        to ? { saleDate: { lte: new Date(to + "T23:59:59") } } : {},
      ],
    },
    include: { customer: true, cashier: true, items: true },
    orderBy: { id: "desc" },
    take: 200,
  });
  return NextResponse.json(sales);
}

export async function POST(req:Request){
 try{
 const session=await requireSession();
 const b=await req.json(); const result=await db.$transaction(async (tx: Prisma.TransactionClient)=>{
   const settings=await tx.shopSettings.findUnique({where:{id:1}});
   const last=await tx.sale.findFirst({orderBy:{id:"desc"},select:{id:true}});
   const invoiceNo=`INV-${String((last?.id??0)+1).padStart(5,"0")}`;
   let subtotal=0; const items:any[]=[];
   for(const i of b.items){
     const med=await tx.medicine.findUnique({where:{id:Number(i.medicineId)},include:{batches:true}});
     if(!med) throw new Error("Medicine not found");
     let batch=i.batchId?med.batches.find(x=>x.id===Number(i.batchId)):med.batches.filter(x=>x.quantity>0).sort((a,c)=>a.expiryDate.getTime()-c.expiryDate.getTime())[0];
     if(!batch) throw new Error(`No stock for ${med.name}`);
     if(batch.expiryDate < new Date() && !settings?.allowExpiredSales) throw new Error(`Expired batch cannot be sold: ${batch.batchNumber}`);
     const q=Number(i.quantity); if(q<=0 || batch.quantity<q) throw new Error(`Insufficient stock for ${med.name}`);
     const amount=q*batch.sellingRate; subtotal+=amount;
     await tx.medicineBatch.update({where:{id:batch.id},data:{quantity:{decrement:q}}});
     await tx.stockTransaction.create({data:{batchId:batch.id,type:"SALE",quantity:-q,reference:invoiceNo}});
     items.push({medicineId:med.id,batchId:batch.id,quantity:q,sellingRate:batch.sellingRate,purchaseRate:batch.purchaseRate,amount});
   }
   // Round every money figure to the nearest paisa (2 decimals) before comparing or storing.
   // Percentage-based VAT math (e.g. 13%) doesn't divide evenly in floating point, so comparing
   // raw unrounded floats (paid < total) can wrongly flag a full payment as short by a fraction of a paisa.
   const round2=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
   const discount=round2(Number(b.discount??0)), vatRate=settings?.vatRate??0;
   const tax=round2((subtotal-discount)*vatRate/100), total=round2(subtotal-discount+tax), paid=round2(Number(b.paid??total));
   const customerId=b.customerId?Number(b.customerId):undefined;
   if(paid<total){
     // Credit ("udhaar") sale — only allowed against a known customer, who is billed the shortfall.
     if(!customerId) throw new Error("Select a customer to record a credit (udhaar) sale — amount paid is less than total");
     await tx.customer.update({where:{id:customerId},data:{dueAmount:{increment:round2(total-paid)}}});
   }
   const change=paid>total?round2(paid-total):0;
   return tx.sale.create({data:{invoiceNo,cashierId:session.id,customerId,subtotal,discount,tax,total,paid,change,paymentMethod:b.paymentMethod??"CASH",items:{create:items}} ,include:{items:{include:{medicine:true,batch:true}},cashier:true,customer:true}});
 });
 return NextResponse.json(result,{status:201});
 }catch(e){return apiError(e);}
}