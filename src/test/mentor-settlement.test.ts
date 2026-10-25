import {describe,expect,it} from "vitest";
import {mentorSettlement,mentorSlotAvailable} from "@/lib/payments/mentor-settlement";
describe("Mentor group slots and snapshotted earnings",()=>{
  it("keeps gross equal to platform commission plus mentor earnings",()=>{
    expect(mentorSettlement(10,15)).toEqual({commission:1.5,earnings:8.5,rate:15});
    expect(mentorSettlement(10.01,12.5)).toEqual({commission:1.25,earnings:8.76,rate:12.5});
    for(const rate of [-1,101,NaN])expect(()=>mentorSettlement(10,rate)).toThrow();
  });
  it("shares only identical group slots, respects capacity and prevents repeat student booking",()=>{
    const slot={serviceId:"group-service",sessionType:"group",capacity:2,studentId:"next-student",start:"2026-12-01T10:00:00Z",end:"2026-12-01T11:00:00Z"};
    const booked={mentor_service_id:slot.serviceId,student_id:"first-student",scheduled_start:slot.start,scheduled_end:slot.end};
    expect(mentorSlotAvailable(slot,[booked])).toBe(true);
    expect(mentorSlotAvailable({...slot,sessionType:"one_to_one"},[booked])).toBe(false);
    expect(mentorSlotAvailable(slot,[booked,booked])).toBe(false);
    expect(mentorSlotAvailable({...slot,studentId:booked.student_id},[booked])).toBe(false);
    expect(mentorSlotAvailable(slot,[{...booked,mentor_service_id:"other-service"}])).toBe(false);
    expect(mentorSlotAvailable({...slot,start:"2026-12-01T10:30:00Z"},[booked])).toBe(false);
  });
});
