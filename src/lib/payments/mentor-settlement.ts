export function mentorSettlement(amount:number,commissionRate:number) {
  if (!Number.isFinite(amount) || amount<0 || !Number.isFinite(commissionRate) || commissionRate<0 || commissionRate>100)
    throw new Error("Invalid mentor settlement configuration.");
  const gross=Math.round(amount*100),commission=Math.round(gross*commissionRate/100);
  return {commission:commission/100,earnings:(gross-commission)/100,rate:commissionRate};
}

export function mentorSlotAvailable(input:{serviceId:string;sessionType:string;capacity:number;studentId:string;start:string;end:string},
  bookings:Array<{mentor_service_id?:string;student_id?:string;scheduled_start?:Date|string;scheduled_end?:Date|string}>) {
  if (!bookings.length) return true;
  if (input.sessionType!=="group" || !Number.isInteger(input.capacity) || input.capacity<1 || bookings.length>=input.capacity) return false;
  return bookings.every(booking=>booking.mentor_service_id===input.serviceId && booking.student_id!==input.studentId &&
    new Date(booking.scheduled_start ?? "").getTime()===new Date(input.start).getTime() &&
    new Date(booking.scheduled_end ?? "").getTime()===new Date(input.end).getTime());
}
