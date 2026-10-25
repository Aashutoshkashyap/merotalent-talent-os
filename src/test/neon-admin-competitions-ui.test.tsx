import {beforeEach,describe,expect,it,vi} from "vitest";
import {fireEvent,render,screen,waitFor,cleanup} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
const mocks=vi.hoisted(()=>({list:vi.fn(),from:vi.fn(),toast:vi.fn()}));
vi.mock("@/lib/backend-selection",()=>({isNeonClientRuntime:()=>true}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:mocks.from}}));
vi.mock("@/lib/admin/admin-client",()=>({listAllAdminResource:mocks.list,createAdminResource:vi.fn(),updateAdminResource:vi.fn()}));
vi.mock("@/contexts/AuthContext",()=>({useAuth:()=>({user:{id:"10000000-0000-4000-8000-000000000001"}})}));
vi.mock("@/hooks/use-toast",()=>({useToast:()=>({toast:mocks.toast})}));
import AdminCompetitions from "@/screens/admin/AdminCompetitions";
describe("Neon Super Admin competition runtime",()=>{
  beforeEach(()=>{cleanup();vi.clearAllMocks();mocks.list.mockResolvedValue([]);});
  it("finishes loading through the trusted Neon API rather than invoking Supabase",async()=>{
    render(<MemoryRouter><AdminCompetitions/></MemoryRouter>);
    expect(await screen.findByText("No competitions found. Create one to get started!")).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith("competitions",expect.any(Object));
    expect(mocks.from).not.toHaveBeenCalled();
    expect(screen.getByRole("link",{name:"Manage ticketed events and categories"})).toHaveAttribute("href","/admin/events");
  });
  it("shows an actionable error instead of an endless loader or false empty result",async()=>{
    mocks.list.mockRejectedValueOnce(new Error("Connection temporarily unavailable"));
    render(<MemoryRouter><AdminCompetitions/></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection temporarily unavailable");
    fireEvent.click(screen.getByRole("button",{name:"Retry"}));
    await waitFor(()=>expect(mocks.list).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("No competitions found. Create one to get started!")).toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
