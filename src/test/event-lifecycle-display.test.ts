import {describe,expect,it} from "vitest";
import {displayedEventLifecycle} from "@/lib/events/lifecycle-display";
describe("Authoritative event lifecycle labels",()=>{
  it.each(["completed","cancelled","rejected","draft","pending_approval"])("does not hide %s behind stale lifecycle metadata",status=>{
    expect(displayedEventLifecycle({status,lifecycle_status:"published"})).toBe(status);
  });
  it("preserves useful published-event registration stages",()=>{
    expect(displayedEventLifecycle({status:"published",lifecycle_status:"registration_open"})).toBe("registration_open");
  });
});
