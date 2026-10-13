import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserTool } from "../browser-agent";

const previous={
  endpoint:process.env["PLAYWRIGHT_BROWSER_ENDPOINT"],
  token:process.env["PLAYWRIGHT_BROWSER_TOKEN"],
};
afterEach(()=>{
  vi.restoreAllMocks();
  for(const [key,value] of [
    ["PLAYWRIGHT_BROWSER_ENDPOINT",previous.endpoint],
    ["PLAYWRIGHT_BROWSER_TOKEN",previous.token],
  ] as const){
    if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});
function configuredTool(){
  process.env["PLAYWRIGHT_BROWSER_ENDPOINT"]="https://browser-worker.example.test";
  process.env["PLAYWRIGHT_BROWSER_TOKEN"]="ci-private-worker-token";
  return createBrowserTool("playwright",{allowedDomains:["example.com"],allowedTools:["browser"]});
}
const ok=(value:unknown)=>new Response(JSON.stringify(value),{
  status:200,headers:{"content-type":"application/json"},
});
describe("bounded authenticated browser provider calls",()=>{
  it("creates a real remote session with a timeout and no redirect following",async()=>{
    const mocked=vi.spyOn(globalThis,"fetch")
      .mockResolvedValueOnce(ok({sessionId:"123e4567-e89b-12d3-a456-426614174000"}))
      .mockResolvedValueOnce(ok({ok:true,data:{url:"https://example.com/"}}))
      .mockResolvedValueOnce(ok({ok:true,data:{ok:true}}));
    const tool=configuredTool();
    expect((await tool.navigate("https://example.com/")).ok).toBe(true);
    await tool.close();
    expect(mocked).toHaveBeenCalledTimes(3);
    expect(String(mocked.mock.calls[0]?.[0])).toMatch(/\/session$/);
    expect((mocked.mock.calls[0]?.[1] as RequestInit).redirect).toBe("manual");
    expect((mocked.mock.calls[0]?.[1] as RequestInit).signal).toBeTruthy();
    expect(String(mocked.mock.calls[1]?.[0])).toMatch(/\/action$/);
    expect((mocked.mock.calls[1]?.[1] as RequestInit).redirect).toBe("manual");
    expect((mocked.mock.calls[1]?.[1] as RequestInit).signal).toBeTruthy();
  });
  it("does not retry a timed out or failed mutating action",async()=>{
    const mocked=vi.spyOn(globalThis,"fetch")
      .mockResolvedValueOnce(ok({sessionId:"123e4567-e89b-12d3-a456-426614174000"}))
      .mockResolvedValueOnce(new Response(null,{status:503}))
      .mockResolvedValueOnce(ok({ok:true,data:{ok:true}}));
    const tool=configuredTool();
    await expect(tool.click("#submit")).rejects.toThrow(/failed \(503\)/);
    await tool.close();
    expect(mocked).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(mocked.mock.calls[1]?.[1]?.body)).action).toBe("click");
    expect(JSON.parse(String(mocked.mock.calls[2]?.[1]?.body)).action).toBe("close");
  });
});
