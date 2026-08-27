import { resolvePublicOrigin } from "@/lib/integrations";

export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request);
  const js = `(function(){
  var s=document.currentScript;
  var key=s && s.getAttribute("data-widget-key");
  if(!key) return;
  var iframe=document.createElement("iframe");
  iframe.src=${JSON.stringify(origin)}+"/w/"+encodeURIComponent(key);
  iframe.title="Clinic chat";
  iframe.allow="clipboard-write";
  iframe.setAttribute("allowtransparency","true");
  iframe.setAttribute("frameborder","0");
  iframe.setAttribute("scrolling","no");
  function closed(){
    iframe.style.cssText="position:fixed;right:12px;bottom:max(12px,env(safe-area-inset-bottom,0px));width:80px;height:80px;max-height:100%;border:0;z-index:2147483646;background:transparent;background-color:transparent;color-scheme:normal;pointer-events:auto;overflow:hidden;";
  }
  function opened(){
    iframe.style.cssText="position:fixed;top:0;right:0;bottom:0;width:min(460px,100%);height:100%;max-height:100%;max-width:100%;border:0;z-index:2147483646;background:transparent;background-color:transparent;color-scheme:normal;pointer-events:auto;overflow:hidden;";
  }
  closed();
  window.addEventListener("message", function(e){
    if(!e.data || e.data.source!=="dentchat") return;
    if(e.data.type==="open") opened();
    if(e.data.type==="close") closed();
  });
  document.body.appendChild(iframe);
})();`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
