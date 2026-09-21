import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const medicines = await db.medicine.findMany({
    where: { OR: [
      {name:{contains:q,mode:"insensitive"}},{genericName:{contains:q,mode:"insensitive"}},
      {sku:{contains:q,mode:"insensitive"}},{batches:{some:{batchNumber:{contains:q,mode:"insensitive"}}}}
    ]},
    include:{batches:{include:{supplier:true},orderBy:{expiryDate:"asc"}}}, orderBy:{name:"asc"}
  });
  return NextResponse.json(medicines);
}
export async function POST(req: Request) {
  const b = await req.json();
  const m = await db.medicine.create({data:{
    name:b.name,genericName:b.genericName,manufacturer:b.manufacturer,category:b.category,
    unit:b.unit??"unit",sku:b.sku,minStock:Number(b.minStock??0),
    batches:b.batchNumber?{create:{batchNumber:b.batchNumber,purchaseRate:Number(b.purchaseRate),
      sellingRate:Number(b.sellingRate),quantity:Number(b.quantity),expiryDate:new Date(b.expiryDate)}}:undefined
  },include:{batches:true}});
  return NextResponse.json(m,{status:201});
}